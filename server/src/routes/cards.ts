import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { z } from 'zod';

import { asyncHandler, createError } from '../middleware/errorHandler';
import { APIResponse, MTGCard } from '../types';
import scryfallService from '../services/scryfallService';

const router = Router();

/**
 * Search for MTG cards
 */
router.get('/search', asyncHandler(async (req: Request, res: Response) => {
  const schema = Joi.object({
    q: Joi.string().min(2).required().description('Search query'),
    limit: Joi.number().integer().min(1).max(175).default(20),
  });

  const { error, value } = schema.validate(req.query);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const { q: query, limit } = value as { q: string; limit: number };

  try {
    const cards = await scryfallService.searchCards(`${query} limit:${limit}`);

    const response: APIResponse = {
      success: true,
      data: {
        cards,
        count: cards.length,
        query,
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    throw createError(
      `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}));

/**
 * Find card by exact name
 */
router.get('/named/:name', asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.params as { name?: string };

  if (!name || name.trim().length < 2) {
    throw createError('Card name must be at least 2 characters long', 400);
  }

  try {
    const card = await scryfallService.findCard(name as string);

    if (!card) {
      // Try fuzzy search for suggestions
      const suggestions = await scryfallService.fuzzySearch(name as string, 5);
      
      const error = createError(`Card "${name}" not found`, 404);
      (error as any).suggestions = suggestions.map(card => card.name);
      throw error;
    }

    const response: APIResponse = {
      success: true,
      data: card,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    if ((error as any).statusCode === 404) {
      throw error; // Re-throw 404 errors with suggestions
    }
    
    throw createError(
      `Failed to find card: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}));

/**
 * Get card by Scryfall ID
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id?: string };

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!id || !uuidRegex.test(id)) {
    throw createError('Invalid Scryfall ID format', 400);
  }

  try {
    const card = await scryfallService.getCardById(id as string);

    if (!card) {
      throw createError(`Card with ID "${id}" not found`, 404);
    }

    const response: APIResponse = {
      success: true,
      data: card,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    if ((error as any).statusCode === 404) {
      throw error;
    }
    
    throw createError(
      `Failed to get card: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}));

/**
 * Validate a list of cards
 */
router.post('/validate', asyncHandler(async (req: Request, res: Response) => {
  const CardIn = z.object({ name: z.string().min(1), quantity: z.number().int().min(1).max(250) });
  const Body = z.object({ cards: z.array(CardIn).min(1).max(100) });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    throw createError(parsed.error.issues.map(i => i.message).join(', '), 400);
  }
  const { cards } = parsed.data as { cards: MTGCard[] };

  try {
    const { validatedCards, validationResult } = await scryfallService.validateAndEnrichCards(cards as MTGCard[]);

    const response: APIResponse = {
      success: true,
      data: {
        validatedCards,
        validation: validationResult,
        originalCount: cards.length,
        validatedCount: validatedCards.length,
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    throw createError(
      `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}));

/**
 * Get a random card
 */
router.get('/random', asyncHandler(async (req: Request, res: Response) => {
  try {
    const card = await scryfallService.getRandomCard();

    const response: APIResponse = {
      success: true,
      data: card,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    throw createError(
      `Failed to get random card: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}));

/**
 * Check format legality for a deck
 */
router.post('/legality/:format', asyncHandler(async (req: Request, res: Response) => {
  const { format } = req.params as { format?: string };
  
  const validFormats = [
    'standard', 'pioneer', 'modern', 'legacy', 'vintage', 'commander', 
    'brawl', 'historic', 'timeless', 'pauper', 'penny'
  ];
  
  if (!format || !validFormats.includes(format.toLowerCase())) {
    throw createError(`Invalid format. Supported formats: ${validFormats.join(', ')}`, 400);
  }

  const cardSchema = Joi.object({
    name: Joi.string().required(),
    quantity: Joi.number().integer().min(1).max(20).required(),
    legalities: Joi.object().optional(),
  });

  const schema = Joi.object({
    cards: Joi.array().items(cardSchema).min(1).max(100).required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const { cards } = value as { cards: MTGCard[] };

  try {
    const legalityCheck = await scryfallService.checkFormatLegality(cards, format);

    const response: APIResponse = {
      success: true,
      data: {
        format,
        legal: legalityCheck.legal,
        issues: legalityCheck.issues,
        cardCount: cards.length,
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    throw createError(
      `Legality check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}));

/**
 * Autocomplete card names
 */
router.get('/autocomplete/:partial', asyncHandler(async (req: Request, res: Response) => {
  const { partial } = req.params as { partial?: string };

  if (!partial || partial.trim().length < 2) {
    throw createError('Partial name must be at least 2 characters long', 400);
  }

  const schema = Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(10),
  });

  const { error, value } = schema.validate(req.query);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const { limit } = value as { limit: number };

  try {
    const suggestions = await scryfallService.fuzzySearch(partial, limit);
    
    // Extract just the names for autocomplete
    const cardNames = suggestions.map(card => ({
      name: card.name,
      id: card.id,
      mana_cost: card.mana_cost,
      type_line: card.type_line,
    }));

    const response: APIResponse = {
      success: true,
      data: {
        suggestions: cardNames,
        count: cardNames.length,
        partial,
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    throw createError(
      `Autocomplete failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}));

/**
 * Get cache statistics (for debugging)
 */
router.get('/cache/stats', asyncHandler(async (req: Request, res: Response) => {
  try {
    const cacheStats = scryfallService.getCacheStats();

    const response: APIResponse = {
      success: true,
      data: cacheStats,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    throw createError(
      `Failed to get cache stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}));

/**
 * Clear cache (for debugging)
 */
router.delete('/cache', asyncHandler(async (req: Request, res: Response) => {
  try {
    scryfallService.clearCache();

    const response: APIResponse = {
      success: true,
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    throw createError(
      `Failed to clear cache: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}));

export default router; 