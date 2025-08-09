import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { EnhancedOCRService } from '../services/enhancedOcrService';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `mtg-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Enhanced OCR endpoint
router.post('/enhanced', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    console.log(`📸 Processing image: ${req.file.filename}`);
    
    // Create service instance
    const ocrService = new EnhancedOCRService();
    
    // Process image with enhanced pipeline
    const result = await ocrService.processImage(req.file.path);
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    // Validate result
    const mainboardCount = result.cards.filter(c => c.section !== 'sideboard').reduce((sum, c) => sum + c.quantity, 0);
    const sideboardCount = result.cards.filter(c => c.section === 'sideboard').reduce((sum, c) => sum + c.quantity, 0);
    
    res.json({
      success: result.success,
      cards: result.cards,
      statistics: {
        mainboard_count: mainboardCount,
        sideboard_count: sideboardCount,
        total_unique_cards: new Set(result.cards.map(c => c.name)).size,
        processing_time_ms: result.processing_time,
        confidence: result.confidence,
        methods_used: result.warnings || []
      },
      validation: {
        mainboard_valid: mainboardCount === 60,
        sideboard_valid: sideboardCount === 15,
        complete: mainboardCount === 60 && sideboardCount === 15
      }
    });
    
  } catch (error) {
    console.error('Enhanced OCR error:', error);
    
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'OCR processing failed'
    });
  }
});

// Status endpoint
router.get('/enhanced/status', (req: Request, res: Response) => {
  const hasOpenAI = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'TO_BE_SET';
  const hasPython = fs.existsSync('/usr/bin/python3') || fs.existsSync('/usr/local/bin/python3');
  
  res.json({
    service: 'Enhanced OCR Service',
    version: '2.0.0',
    capabilities: {
      super_resolution: true,
      easyocr: hasPython,
      openai_vision: hasOpenAI,
      never_give_up_mode: hasOpenAI,
      format_detection: ['arena', 'mtgo', 'paper'],
      validation: {
        mainboard_target: 60,
        sideboard_target: 15
      }
    },
    rules: {
      min_resolution: 1200,
      upscale_factor: 4,
      max_file_size_mb: 10
    },
    documentation: '/MASTER_OCR_RULES_AND_METHODOLOGY.md'
  });
});

export default router;