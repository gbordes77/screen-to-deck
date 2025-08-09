import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import { z } from 'zod';

import { asyncHandler, createError } from '../middleware/errorHandler';
import { APIResponse, ProcessingStatus } from '../types';
import ocrService from '../services/ocrService';
import { ocrQueue } from '../queue/ocr.queue';
import scryfallService from '../services/scryfallService';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/jpg,image/png,image/webp').split(',');
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(createError(`File type ${file.mimetype} not allowed. Allowed types: ${allowedTypes.join(', ')}`, 400));
    }
  },
});

// In-memory storage for processing status (in production, use Redis or database)
const processingStatus: Map<string, ProcessingStatus> = new Map();

/**
 * Upload and process deck screenshot
 */
router.post('/upload', upload.single('image'), asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw createError('No image file provided', 400);
  }

  const processId = uuidv4();
  const { validateCards = true, deckName } = req.body;

  // Create initial processing status
  const status: ProcessingStatus = {
    id: processId,
    status: 'processing',
    progress: 0,
    message: 'Starting OCR processing...',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  processingStatus.set(processId, status);

  // Enqueue async processing (BullMQ)
  await ocrQueue.add('run', { processId, filePath: req.file.path, validateCards, deckName });

  const response: APIResponse = {
    success: true,
    data: {
      processId,
      status: 'processing',
      message: 'Image uploaded successfully. Processing started.',
    },
    timestamp: new Date().toISOString(),
  };

  res.status(202).json(response);
}));

/**
 * Get processing status
 */
router.get('/status/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const status = processingStatus.get(id);
  if (!status) {
    throw createError('Processing job not found', 404);
  }

  const response: APIResponse = {
    success: true,
    data: status,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

/**
 * Process image with base64 data (alternative endpoint)
 */
router.post('/process-base64', asyncHandler(async (req: Request, res: Response) => {
  const Body = z.object({
    image: z.string().min(10),
    validateCards: z.boolean().optional().default(true),
    deckName: z.string().optional(),
  });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    throw createError(parsed.error.issues.map(i => i.message).join(', '), 400);
  }
  const { image, validateCards, deckName } = parsed.data;

  // Decode base64 and save temporarily
  const imageBuffer = Buffer.from(image, 'base64');
  const tempFilePath = path.join('uploads', `temp_${uuidv4()}.jpg`);
  
  // Ensure uploads directory exists
  if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads', { recursive: true });
  }
  
  fs.writeFileSync(tempFilePath, imageBuffer);

  const processId = uuidv4();

  // Create initial processing status
  const status: ProcessingStatus = {
    id: processId,
    status: 'processing',
    progress: 0,
    message: 'Starting OCR processing...',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  processingStatus.set(processId, status);

  // Enqueue async processing (BullMQ)
  await ocrQueue.add('run', { processId, filePath: tempFilePath, validateCards, deckName });

  const response: APIResponse = {
    success: true,
    data: {
      processId,
      status: 'processing',
      message: 'Image processing started.',
    },
    timestamp: new Date().toISOString(),
  };

  res.status(202).json(response);
}));

/**
 * Get list of all processing jobs
 */
router.get('/jobs', asyncHandler(async (req: Request, res: Response) => {
  const jobs = Array.from(processingStatus.values()).map(status => ({
    id: status.id,
    status: status.status,
    progress: status.progress,
    message: status.message,
    created_at: status.created_at,
    updated_at: status.updated_at,
  }));

  const response: APIResponse = {
    success: true,
    data: jobs,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

/**
 * Delete processing job
 */
router.delete('/jobs/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!processingStatus.has(id)) {
    throw createError('Processing job not found', 404);
  }

  processingStatus.delete(id);

  const response: APIResponse = {
    success: true,
    message: 'Processing job deleted successfully',
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

/**
 * Process image asynchronously
 */
async function processImageAsync(
  processId: string, 
  imagePath: string, 
  options: { validateCards: boolean; deckName?: string }
): Promise<void> {
  const updateStatus = (updates: Partial<ProcessingStatus>) => {
    const current = processingStatus.get(processId);
    if (current) {
      const updated = {
        ...current,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      processingStatus.set(processId, updated);
    }
  };

  try {
    // Step 1: OCR Processing
    updateStatus({
      status: 'processing',
      progress: 10,
      message: 'Extracting cards from image...',
    });

    const ocrResult = await ocrService.processImage(imagePath);

    if (!ocrResult.success || ocrResult.cards.length === 0) {
      updateStatus({
        status: 'failed',
        progress: 100,
        message: 'Failed to extract cards from image',
        error: ocrResult.errors?.join(', ') || 'No cards found',
      });
      return;
    }

    updateStatus({
      progress: 50,
      message: `Extracted ${ocrResult.cards.length} cards`,
    });

    // Step 2: Card Validation (if requested)
    let finalResult = ocrResult;
    
    if (options.validateCards) {
      updateStatus({
        progress: 60,
        message: 'Validating cards with Scryfall...',
      });

      try {
        const { validatedCards, validationResult } = await scryfallService.validateAndEnrichCards(ocrResult.cards);
        
        finalResult = {
          ...ocrResult,
          cards: validatedCards,
          warnings: [
            ...(ocrResult.warnings || []),
            ...validationResult.warnings,
          ],
        };

        updateStatus({
          progress: 90,
          message: `Validated ${validatedCards.length} cards`,
        });
      } catch (error) {
        console.error('Card validation failed:', error);
        // Continue without validation
        updateStatus({
          progress: 90,
          message: 'Card validation failed, proceeding without validation',
        });
      }
    }

    // Step 3: Complete
    updateStatus({
      status: 'completed',
      progress: 100,
      message: 'Processing completed successfully',
      result: finalResult,
    });

  } catch (error) {
    console.error('Processing failed:', error);
    updateStatus({
      status: 'failed',
      progress: 100,
      message: 'Processing failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  } finally {
    // Clean up uploaded file
    try {
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    } catch (error) {
      console.error('Failed to clean up file:', error);
    }
  }
}

export default router; 
export { processImageAsync };