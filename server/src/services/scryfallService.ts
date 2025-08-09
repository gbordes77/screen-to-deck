import axios, { AxiosInstance } from 'axios';
import fs from 'fs';
import path from 'path';
import { MTGCard, ScryfallCard, ScryfallSearchResult, ValidationResult } from '../types';
import { createError } from '../middleware/errorHandler';

class ScryfallService {
  private api: AxiosInstance;
  private cache: Map<string, ScryfallCard> = new Map();
  private lastRequestTime = 0;
  private readonly requestDelay = 100; // 100ms between requests to respect rate limits

  constructor() {
    const offline = process.env.OFFLINE_MODE === 'true';
    this.api = axios.create({
      baseURL: offline ? 'http://localhost' : (process.env.SCRYFALL_API_URL || 'https://api.scryfall.com'),
      timeout: 10000,
      headers: {
        'User-Agent': 'MTG-Deck-Converter/1.0',
      },
    });

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
  }

  /**
   * Validate and enrich a list of MTG cards
   */
  async validateAndEnrichCards(cards: MTGCard[]): Promise<{
    validatedCards: MTGCard[];
    validationResult: ValidationResult;
  }> {
    const validatedCards: MTGCard[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    // Batch exact lookups via /cards/collection (up to 75 identifiers per request)
    const identifiers = cards.map(c => ({ name: c.name }));
    const batches = this.chunk(identifiers, 75);
    const foundByName: Map<string, ScryfallCard> = new Map();

    for (const batch of batches) {
      try {
        await this.respectRateLimit();
        const results = await this.fetchCollection(batch);
        for (const card of results) {
          foundByName.set(this.normalizeKey(card.name), card);
        }
      } catch (e) {
        console.warn('Batch collection fetch failed, will fallback per-card for this batch:', e);
        // fallback to per-card find
        for (const ident of batch) {
          try {
            await this.respectRateLimit();
            const one = await this.findCard(ident.name || '');
            if (one) foundByName.set(this.normalizeKey(one.name), one);
          } catch {}
        }
      }
    }

    for (const card of cards) {
      try {
        const key = this.normalizeKey(card.name);
        const scryfallCard = foundByName.get(key) || null;

        if (scryfallCard) {
          const enrichedCard: MTGCard = {
            ...card,
            name: scryfallCard.name,
            set: scryfallCard.set,
            collector_number: scryfallCard.collector_number,
            rarity: scryfallCard.rarity,
            mana_cost: scryfallCard.mana_cost,
            cmc: scryfallCard.cmc,
            type_line: scryfallCard.type_line,
            oracle_text: scryfallCard.oracle_text,
            colors: scryfallCard.colors,
            color_identity: scryfallCard.color_identity,
            legalities: scryfallCard.legalities,
            scryfall_id: scryfallCard.id,
            image_uris: scryfallCard.image_uris,
          };
          validatedCards.push(enrichedCard);
          if (scryfallCard.name !== card.name) {
            warnings.push(`Card name corrected: "${card.name}" → "${scryfallCard.name}"`);
          }
        } else {
          // Fallback to fuzzy
          const fuzzyResults = await this.fuzzySearch(card.name);
          if (fuzzyResults.length > 0) {
            const bestMatch = fuzzyResults[0];
            suggestions.push(`"${card.name}" not found. Did you mean "${bestMatch.name}"?`);
            validatedCards.push({ ...card, name: card.name + ' (UNVALIDATED)' });
          } else {
            errors.push(`Card not found: "${card.name}"`);
            validatedCards.push({ ...card, name: card.name + ' (NOT FOUND)' });
          }
        }
      } catch (error) {
        console.error(`Error validating card "${card.name}":`, error);
        warnings.push(`Could not validate "${card.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        validatedCards.push(card);
      }
    }

    const validationResult: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };

    return {
      validatedCards,
      validationResult,
    };
  }

  /**
   * Find a card by exact name
   */
  async findCard(cardName: string): Promise<ScryfallCard | null> {
    // Check cache first
    const cacheKey = this.normalizeKey(cardName);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Offline: search in local dataset
    if (process.env.OFFLINE_MODE === 'true') {
      const dataset = this.loadLocalDataset();
      const exact = dataset.find(c => c.name.toLowerCase() === cacheKey) || null;
      if (exact) {
        this.cache.set(cacheKey, exact);
      }
      return exact;
    }

    try {
      const response = await this.api.get(`/cards/named`, {
        params: { exact: cardName },
      });
      const card = response.data as ScryfallCard;
      this.cache.set(cacheKey, card);
      return card;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Perform fuzzy search for card suggestions
   */
  async fuzzySearch(cardName: string, limit = 5): Promise<ScryfallCard[]> {
    if (process.env.OFFLINE_MODE === 'true') {
      const dataset = this.loadLocalDataset();
      const q = cardName.toLowerCase();
      const scored = dataset.map(c => ({
        card: c,
        score: this.simpleSimilarity(q, c.name.toLowerCase())
      }))
      .sort((a,b) => b.score - a.score)
      .slice(0, limit)
      .map(x => x.card);
      return scored;
    }

    try {
      const response = await this.api.get(`/cards/search`, {
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
   * Search cards by multiple criteria
   */
  async searchCards(query: string): Promise<ScryfallCard[]> {
    try {
      await this.respectRateLimit();
      
      const response = await this.api.get(`/cards/search`, {
        params: {
          q: query,
        },
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
   * Get card by Scryfall ID
   */
  async getCardById(id: string): Promise<ScryfallCard | null> {
    try {
      await this.respectRateLimit();
      
      const response = await this.api.get(`/cards/${id}`);
      return response.data as ScryfallCard;
      
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get random card (useful for testing)
   */
  async getRandomCard(): Promise<ScryfallCard> {
    await this.respectRateLimit();
    
    const response = await this.api.get('/cards/random');
    return response.data as ScryfallCard;
  }

  /**
   * Check format legality for a set of cards
   */
  async checkFormatLegality(cards: MTGCard[], format: string): Promise<{
    legal: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    
    for (const card of cards) {
      if (card.legalities && card.legalities[format.toLowerCase()]) {
        const legality = card.legalities[format.toLowerCase()];
        
        if (legality === 'banned') {
          issues.push(`${card.name} is banned in ${format}`);
        } else if (legality === 'restricted') {
          if (card.quantity > 1) {
            issues.push(`${card.name} is restricted in ${format} (max 1 copy)`);
          }
        } else if (legality === 'not_legal') {
          issues.push(`${card.name} is not legal in ${format}`);
        }
      }
    }

    return {
      legal: issues.length === 0,
      issues,
    };
  }

  /**
   * Batch fetch via /cards/collection
   */
  private async fetchCollection(identifiers: Array<{ name?: string; set?: string; collector_number?: string; id?: string; }>): Promise<ScryfallCard[]> {
    if (process.env.OFFLINE_MODE === 'true') {
      // offline handled via local dataset and fuzzy; exact batch can map to findCard calls
      const results: ScryfallCard[] = [];
      for (const ident of identifiers) {
        if (ident.name) {
          const c = await this.findCard(ident.name);
          if (c) results.push(c);
        }
      }
      return results;
    }

    const response = await this.api.post(`/cards/collection`, { identifiers }, { timeout: 15000 });
    const searchResult = response.data as { data: ScryfallCard[] };
    return searchResult.data || [];
  }

  private chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  private normalizeKey(name: string): string {
    // lower-case, trim, fold diacritics, remove punctuation variety
    return name
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}+/gu, '')
      .replace(/['’`´]/g, '')
      .replace(/\s+/g, ' ');
  }

  /**
   * Respect Scryfall's rate limits
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

  private loadLocalDataset(): ScryfallCard[] {
    const dataPath = process.env.SCRYFALL_DATA_PATH || path.join(process.cwd(), 'data', 'scryfall-default-cards.json');
    try {
      const raw = fs.readFileSync(dataPath, 'utf-8');
      const parsed = JSON.parse(raw);
      // Accept both array and bulk {data: []}
      const cards: ScryfallCard[] = Array.isArray(parsed) ? parsed : parsed.data;
      return cards || [];
    } catch (e) {
      throw createError(`Local Scryfall dataset not found or invalid at ${dataPath}`, 500);
    }
  }

  private simpleSimilarity(a: string, b: string): number {
    // Jaccard on character trigrams (cheap + decent)
    const ngrams = (s: string) => new Set(Array.from({length: Math.max(0, s.length-2)}, (_,i) => s.slice(i,i+3)));
    const A = ngrams(a); const B = ngrams(b);
    const inter = new Set([...A].filter(x => B.has(x))).size;
    const uni = new Set([...A, ...B]).size || 1;
    return inter / uni;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export default new ScryfallService(); 