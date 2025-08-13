import axios, { AxiosInstance } from 'axios';
import { MTGCard, ScryfallCard, ScryfallSearchResult, ValidationResult } from '../types';
import { createError } from '../middleware/errorHandler';
import { getCacheService, CacheService } from './cacheService';
import { getFuzzyMatcher, FuzzyMatchingService } from './fuzzyMatchingService';
import fs from 'fs/promises';
import path from 'path';

interface BatchValidationResult {
  card: MTGCard;
  confidence: number;
  method: string;
  cached: boolean;
}

interface OptimizationMetrics {
  cacheHitRate: number;
  avgResponseTime: number;
  fuzzyMatchSuccess: number;
  batchEfficiency: number;
  totalRequests: number;
}

export class OptimizedScryfallService {
  private api: AxiosInstance;
  private cache: CacheService;
  private fuzzyMatcher: FuzzyMatchingService;
  private lastRequestTime = 0;
  private readonly requestDelay = 50; // More aggressive rate limiting
  private readonly batchSize = 75; // Max cards per batch request
  
  // Metrics tracking
  private metrics = {
    totalRequests: 0,
    cacheHits: 0,
    apiCalls: 0,
    fuzzyMatches: 0,
    responseTimes: [] as number[],
  };

  // Popular cards cache (pre-populated)
  private popularCards: Map<string, ScryfallCard> = new Map();
  private popularCardsList: string[] = [];

  constructor() {
    const offline = process.env.OFFLINE_MODE === 'true';
    this.api = axios.create({
      baseURL: offline ? 'http://localhost' : (process.env.SCRYFALL_API_URL || 'https://api.scryfall.com'),
      timeout: 10000,
      headers: {
        'User-Agent': 'MTG-Deck-Converter/2.0',
      },
    });

    // Initialize services
    this.cache = getCacheService();
    this.fuzzyMatcher = getFuzzyMatcher();

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 429) {
          throw createError('Rate limit exceeded. Please try again later.', 429);
        }
        throw error;
      }
    );

    // Pre-populate popular cards on initialization
    this.loadPopularCards().catch(console.error);
  }

  /**
   * Load and cache popular cards for faster lookups
   */
  private async loadPopularCards(): Promise<void> {
    try {
      const popularCardsPath = path.join(process.cwd(), 'data', 'popular-cards.json');
      const exists = await fs.access(popularCardsPath).then(() => true).catch(() => false);
      
      if (exists) {
        const data = await fs.readFile(popularCardsPath, 'utf-8');
        const cards = JSON.parse(data) as ScryfallCard[];
        
        for (const card of cards) {
          const normalized = this.normalizeKey(card.name);
          this.popularCards.set(normalized, card);
          this.popularCardsList.push(card.name);
        }

        // Warm up cache with popular cards
        await this.cache.warmUp(cards);
        
        console.log(`✅ Loaded ${cards.length} popular cards into cache`);
      }
    } catch (error) {
      console.warn('Could not load popular cards cache:', error);
    }
  }

  /**
   * Enhanced card validation with optimized caching and fuzzy matching
   */
  async validateAndEnrichCards(cards: MTGCard[]): Promise<{
    validatedCards: MTGCard[];
    validationResult: ValidationResult;
    metrics: OptimizationMetrics;
  }> {
    const startTime = Date.now();
    const validatedCards: MTGCard[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Batch process cards for efficiency
    const batchResults = await this.batchValidateCards(cards);

    for (const result of batchResults) {
      const { card, confidence, method, cached } = result;

      if (card.validated !== false) {
        validatedCards.push(card);
        
        // Add warnings for corrections
        if (method.includes('fuzzy') || method.includes('phonetic')) {
          warnings.push(`Card name corrected: "${result.card.name}" (${method}, confidence: ${(confidence * 100).toFixed(1)}%)`);
        }
        
        // Track cache usage
        if (cached) {
          this.metrics.cacheHits++;
        }
      } else {
        errors.push(`Card not found: "${card.name}"`);
        validatedCards.push({ ...card, name: card.name + ' (NOT FOUND)' });
      }
    }

    // Calculate metrics
    const totalTime = Date.now() - startTime;
    this.metrics.responseTimes.push(totalTime);
    
    const metrics = this.calculateMetrics();

    const validationResult: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };

    return {
      validatedCards,
      validationResult,
      metrics,
    };
  }

  /**
   * Batch validate cards with intelligent caching and fuzzy matching
   */
  private async batchValidateCards(cards: MTGCard[]): Promise<BatchValidationResult[]> {
    const results: BatchValidationResult[] = [];
    
    // Step 1: Check cache for exact matches
    const uncachedCards: MTGCard[] = [];
    
    for (const card of cards) {
      const cached = await this.checkCache(card.name);
      if (cached) {
        results.push({
          card: this.enrichCard(card, cached),
          confidence: 1.0,
          method: 'cache-exact',
          cached: true,
        });
      } else {
        uncachedCards.push(card);
      }
    }

    // Step 2: Try fuzzy matching against popular cards
    const stillUnmatched: MTGCard[] = [];
    
    for (const card of uncachedCards) {
      const fuzzyMatch = await this.fuzzyMatchPopular(card.name);
      if (fuzzyMatch && fuzzyMatch.score > 0.85) {
        const scryfallCard = this.popularCards.get(this.normalizeKey(fuzzyMatch.name));
        if (scryfallCard) {
          results.push({
            card: this.enrichCard(card, scryfallCard),
            confidence: fuzzyMatch.score,
            method: `fuzzy-popular:${fuzzyMatch.method}`,
            cached: true,
          });
          
          // Cache this match for future
          await this.cache.set('card:fuzzy', [card.name], scryfallCard);
          this.metrics.fuzzyMatches++;
        } else {
          stillUnmatched.push(card);
        }
      } else {
        stillUnmatched.push(card);
      }
    }

    // Step 3: Batch API lookup for remaining cards
    if (stillUnmatched.length > 0) {
      const apiResults = await this.batchApiLookup(stillUnmatched);
      results.push(...apiResults);
    }

    return results;
  }

  /**
   * Check cache for a card
   */
  private async checkCache(cardName: string): Promise<ScryfallCard | null> {
    this.metrics.totalRequests++;
    
    // Check exact match cache
    const exactCached = await this.cache.get<ScryfallCard>('card:exact', [cardName]);
    if (exactCached) {
      return exactCached;
    }

    // Check normalized cache
    const normalized = this.normalizeKey(cardName);
    const normalizedCached = await this.cache.get<ScryfallCard>('card:normalized', [normalized]);
    if (normalizedCached) {
      return normalizedCached;
    }

    // Check popular cards
    if (this.popularCards.has(normalized)) {
      const card = this.popularCards.get(normalized)!;
      // Cache for future
      await this.cache.set('card:normalized', [normalized], card);
      return card;
    }

    return null;
  }

  /**
   * Fuzzy match against popular cards
   */
  private async fuzzyMatchPopular(cardName: string): Promise<{ name: string; score: number; method: string } | null> {
    const matches = await this.fuzzyMatcher.findBestMatch(
      cardName,
      this.popularCardsList,
      {
        threshold: 0.7,
        maxResults: 1,
        usePhonetic: true,
        useLevenshtein: true,
        useJaroWinkler: true,
        useTrigrams: true,
      }
    );

    return matches.length > 0 ? matches[0] : null;
  }

  /**
   * Batch API lookup with intelligent fallbacks
   */
  private async batchApiLookup(cards: MTGCard[]): Promise<BatchValidationResult[]> {
    const results: BatchValidationResult[] = [];
    
    // Split into batches
    const batches = this.chunk(cards, this.batchSize);
    
    for (const batch of batches) {
      try {
        await this.respectRateLimit();
        
        // Try bulk collection endpoint
        const identifiers = batch.map(c => ({ name: c.name }));
        const bulkResults = await this.fetchCollection(identifiers);
        
        // Map results
        const foundMap = new Map<string, ScryfallCard>();
        for (const card of bulkResults) {
          foundMap.set(this.normalizeKey(card.name), card);
        }

        // Process each card in batch
        for (const card of batch) {
          const normalized = this.normalizeKey(card.name);
          let found = foundMap.get(normalized);
          let confidence = 1.0;
          let method = 'api-exact';

          if (!found) {
            // Try fuzzy search via API
            const fuzzyResults = await this.fuzzySearchApi(card.name);
            if (fuzzyResults.length > 0) {
              found = fuzzyResults[0];
              confidence = this.calculateSimilarity(card.name, found.name);
              method = 'api-fuzzy';
              this.metrics.fuzzyMatches++;
            }
          }

          if (found) {
            // Cache the result
            await this.cache.set('card:exact', [found.name], found);
            await this.cache.set('card:normalized', [this.normalizeKey(found.name)], found);
            
            results.push({
              card: this.enrichCard(card, found),
              confidence,
              method,
              cached: false,
            });
          } else {
            results.push({
              card: { ...card, validated: false },
              confidence: 0,
              method: 'not-found',
              cached: false,
            });
          }
        }
        
        this.metrics.apiCalls++;
      } catch (error) {
        console.error('Batch API lookup failed:', error);
        
        // Fallback to individual lookups
        for (const card of batch) {
          results.push({
            card: { ...card, validated: false },
            confidence: 0,
            method: 'error',
            cached: false,
          });
        }
      }
    }

    return results;
  }

  /**
   * Fuzzy search via Scryfall API
   */
  private async fuzzySearchApi(cardName: string, limit = 5): Promise<ScryfallCard[]> {
    try {
      await this.respectRateLimit();
      
      const response = await this.api.get('/cards/search', {
        params: { q: cardName, limit },
      });
      
      const searchResult = response.data as ScryfallSearchResult;
      return searchResult.data || [];
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Fetch collection via batch endpoint
   */
  private async fetchCollection(identifiers: Array<{ name?: string }>): Promise<ScryfallCard[]> {
    try {
      const response = await this.api.post('/cards/collection', { identifiers }, { timeout: 15000 });
      const result = response.data as { data: ScryfallCard[] };
      return result.data || [];
    } catch (error) {
      console.error('Collection fetch failed:', error);
      return [];
    }
  }

  /**
   * Enrich a card with Scryfall data
   */
  private enrichCard(original: MTGCard, scryfall: ScryfallCard): MTGCard {
    return {
      ...original,
      name: scryfall.name,
      set: scryfall.set,
      collector_number: scryfall.collector_number,
      rarity: scryfall.rarity,
      mana_cost: scryfall.mana_cost,
      cmc: scryfall.cmc,
      type_line: scryfall.type_line,
      oracle_text: scryfall.oracle_text,
      colors: scryfall.colors,
      color_identity: scryfall.color_identity,
      legalities: scryfall.legalities,
      scryfall_id: scryfall.id,
      image_uris: scryfall.image_uris,
      validated: true,
    };
  }

  /**
   * Calculate similarity between two card names
   */
  private calculateSimilarity(a: string, b: string): number {
    const normalizedA = this.normalizeKey(a);
    const normalizedB = this.normalizeKey(b);
    
    if (normalizedA === normalizedB) return 1.0;
    
    // Use trigram similarity
    const trigramsA = this.getTrigrams(normalizedA);
    const trigramsB = this.getTrigrams(normalizedB);
    
    const intersection = trigramsA.filter(t => trigramsB.includes(t)).length;
    const union = new Set([...trigramsA, ...trigramsB]).size;
    
    return union > 0 ? intersection / union : 0;
  }

  /**
   * Get trigrams from a string
   */
  private getTrigrams(str: string): string[] {
    const trigrams: string[] = [];
    const padded = `  ${str}  `;
    
    for (let i = 0; i <= padded.length - 3; i++) {
      trigrams.push(padded.substring(i, i + 3));
    }
    
    return trigrams;
  }

  /**
   * Normalize card name for comparison
   */
  private normalizeKey(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}+/gu, '')
      .replace(/[''`´]/g, '')
      .replace(/\s+/g, ' ');
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Respect rate limits
   */
  private async respectRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.requestDelay) {
      const delay = this.requestDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Calculate optimization metrics
   */
  private calculateMetrics(): OptimizationMetrics {
    const totalRequests = this.metrics.totalRequests || 1;
    const avgResponseTime = this.metrics.responseTimes.length > 0
      ? this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length
      : 0;

    return {
      cacheHitRate: this.metrics.cacheHits / totalRequests,
      avgResponseTime,
      fuzzyMatchSuccess: this.metrics.fuzzyMatches / totalRequests,
      batchEfficiency: 1 - (this.metrics.apiCalls / totalRequests),
      totalRequests,
    };
  }

  /**
   * Get current metrics
   */
  getMetrics(): OptimizationMetrics {
    return this.calculateMetrics();
  }

  /**
   * Export metrics for analysis
   */
  async exportMetrics(filepath: string): Promise<void> {
    const metrics = this.calculateMetrics();
    const cacheMetrics = await this.cache.getMetrics();
    
    const report = {
      timestamp: new Date().toISOString(),
      optimization: metrics,
      cache: cacheMetrics,
      fuzzyMatcher: this.fuzzyMatcher.getCacheStats(),
    };

    await fs.writeFile(filepath, JSON.stringify(report, null, 2));
    console.log(`📊 Metrics exported to ${filepath}`);
  }

  /**
   * Clear all caches
   */
  async clearCaches(): Promise<void> {
    await this.cache.clear();
    this.fuzzyMatcher.clearCaches();
    this.popularCards.clear();
    console.log('🧹 All caches cleared');
  }
}

// Singleton instance
let serviceInstance: OptimizedScryfallService | null = null;

export function getOptimizedScryfallService(): OptimizedScryfallService {
  if (!serviceInstance) {
    serviceInstance = new OptimizedScryfallService();
  }
  return serviceInstance;
}

export default getOptimizedScryfallService;