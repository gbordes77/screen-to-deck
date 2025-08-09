import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { z } from 'zod';

import { asyncHandler, createError } from '../middleware/errorHandler';
import { APIResponse, MTGCard, ExportFormat } from '../types';
import exportService from '../services/exportService';

const router = Router();

// Validation schema for card data
const cardSchema = Joi.object({
  name: Joi.string().required(),
  quantity: Joi.number().integer().min(1).max(20).required(),
  set: Joi.string().optional(),
  collector_number: Joi.string().optional(),
  rarity: Joi.string().optional(),
  mana_cost: Joi.string().optional(),
  cmc: Joi.number().optional(),
  type_line: Joi.string().optional(),
  oracle_text: Joi.string().optional(),
  colors: Joi.array().items(Joi.string()).optional(),
  color_identity: Joi.array().items(Joi.string()).optional(),
  legalities: Joi.object().optional(),
  scryfall_id: Joi.string().optional(),
  image_uris: Joi.object().optional(),
});

const cardsArraySchema = Joi.array().items(cardSchema).min(1).required();

/**
 * Export deck list to specific format
 */
router.post('/:format', asyncHandler(async (req: Request, res: Response) => {
  const { format } = req.params as { format?: ExportFormat };
  
  // Validate format
  const validFormats: ExportFormat[] = ['mtga', 'moxfield', 'archidekt', 'tappedout', 'txt'];
  if (!format || !validFormats.includes(format)) {
    throw createError(`Invalid format. Supported formats: ${validFormats.join(', ')}`, 400);
  }

  // Validate request body
  const CardIn = z.object({ name: z.string().min(1), quantity: z.number().int().min(1).max(250) });
  const Body = z.object({ cards: z.array(CardIn).min(1), deckName: z.string().optional() });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    throw createError(parsed.error.issues.map(i => i.message).join(', '), 400);
  }
  const { cards, deckName } = parsed.data as { cards: MTGCard[]; deckName?: string };

  try {
    const exportResult = await exportService.exportDeck(cards as MTGCard[], format as ExportFormat, deckName);

    const response: APIResponse = {
      success: true,
      data: exportResult,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    throw createError(
      `Failed to export to ${format}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}));

/**
 * Export deck list to all supported formats
 */
router.post('/all', asyncHandler(async (req: Request, res: Response) => {
  // Validate request body
  const schema = Joi.object({
    cards: cardsArraySchema,
    deckName: Joi.string().optional(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const { cards, deckName } = value as { cards: MTGCard[]; deckName?: string };

  try {
    const exportResults = await exportService.exportToAllFormats(cards as MTGCard[], deckName);

    const response: APIResponse = {
      success: true,
      data: {
        exports: exportResults,
        count: exportResults.length,
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    throw createError(
      `Failed to export to multiple formats: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}));

/**
 * Generate deck statistics
 */
router.post('/stats', asyncHandler(async (req: Request, res: Response) => {
  // Validate request body
  const schema = Joi.object({
    cards: cardsArraySchema,
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const { cards } = value;

  try {
    const stats = exportService.generateDeckStats(cards);

    const response: APIResponse = {
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    throw createError(
      `Failed to generate statistics: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}));

/**
 * Get supported export formats
 */
router.get('/formats', asyncHandler(async (req: Request, res: Response) => {
  const formats = [
    {
      id: 'mtga',
      name: 'MTG Arena',
      description: 'Import directly into MTG Arena',
      extension: '.txt',
      supportsUrl: false,
    },
    {
      id: 'moxfield',
      name: 'Moxfield',
      description: 'Import into Moxfield deck builder',
      extension: '.json',
      supportsUrl: true,
    },
    {
      id: 'archidekt',
      name: 'Archidekt',
      description: 'Import into Archidekt deck builder',
      extension: '.txt',
      supportsUrl: false,
    },
    {
      id: 'tappedout',
      name: 'TappedOut',
      description: 'Import into TappedOut with organized sections',
      extension: '.txt',
      supportsUrl: false,
    },
    {
      id: 'txt',
      name: 'Plain Text',
      description: 'Simple text format with card details',
      extension: '.txt',
      supportsUrl: false,
    },
  ];

  const response: APIResponse = {
    success: true,
    data: {
      formats,
      count: formats.length,
    },
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

/**
 * Preview export without downloading
 */
router.post('/preview/:format', asyncHandler(async (req: Request, res: Response) => {
  const { format } = req.params as { format?: ExportFormat };
  
  // Validate format
  const validFormats: ExportFormat[] = ['mtga', 'moxfield', 'archidekt', 'tappedout', 'txt'];
  if (!format || !validFormats.includes(format)) {
    throw createError(`Invalid format. Supported formats: ${validFormats.join(', ')}`, 400);
  }

  // Validate request body
  const schema = Joi.object({
    cards: cardsArraySchema,
    deckName: Joi.string().optional(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const { cards, deckName } = value as { cards: MTGCard[]; deckName?: string };

  try {
    const exportResult = await exportService.exportDeck(cards as MTGCard[], format as ExportFormat, deckName);

    // Return preview with limited content length for display
    const preview = {
      format: exportResult.format,
      filename: exportResult.filename,
      contentPreview: exportResult.content.substring(0, 1000), // First 1000 characters
      contentLength: exportResult.content.length,
      url: exportResult.url,
      isTruncated: exportResult.content.length > 1000,
    };

    const response: APIResponse = {
      success: true,
      data: preview,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    throw createError(
      `Failed to generate preview for ${format}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}));

/**
 * Download export as file
 */
router.post('/download/:format', asyncHandler(async (req: Request, res: Response) => {
  const { format } = req.params as { format?: ExportFormat };
  
  // Validate format
  const validFormats: ExportFormat[] = ['mtga', 'moxfield', 'archidekt', 'tappedout', 'txt'];
  if (!format || !validFormats.includes(format)) {
    throw createError(`Invalid format. Supported formats: ${validFormats.join(', ')}`, 400);
  }

  // Validate request body
  const schema = Joi.object({
    cards: cardsArraySchema,
    deckName: Joi.string().optional(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const { cards, deckName } = value as { cards: MTGCard[]; deckName?: string };

  try {
    const exportResult = await exportService.exportDeck(cards as MTGCard[], format as ExportFormat, deckName);

    // Set appropriate headers for file download
    const contentType = format === 'moxfield' ? 'application/json' : 'text/plain';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(exportResult.content, 'utf8'));

    res.send(exportResult.content);
  } catch (error) {
    throw createError(
      `Failed to download ${format}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}));

export default router; 