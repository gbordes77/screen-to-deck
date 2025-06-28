import axios, { AxiosInstance } from 'axios';
import { MTGCard, ScryfallCard, ScryfallSearchResult, ValidationResult } from '../types';
import { createError } from '../middleware/errorHandler';

class ScryfallService {
  private api: AxiosInstance;
  private cache: Map<string, ScryfallCard> = new Map();
  private lastRequestTime = 0;
  private readonly requestDelay = 100; // 100ms between requests to respect rate limits

  constructor() {
    this.api = axios.create({
      baseURL: process.env.SCRYFALL_API_URL || 'https://api.scryfall.com',
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

    for (const card of cards) {
      try {
        await this.respectRateLimit();
        
        const scryfallCard = await this.findCard(card.name);
        
        if (scryfallCard) {
          // Enrich the card with Scryfall data
          const enrichedCard: MTGCard = {
            ...card,
            name: scryfallCard.name, // Use canonical name from Scryfall
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
          
          // Check for potential issues
          if (scryfallCard.name !== card.name) {
            warnings.push(`Card name corrected: "${card.name}" → "${scryfallCard.name}"`);
          }
          
        } else {
          // Card not found - try fuzzy search
          const fuzzyResults = await this.fuzzySearch(card.name);
          
          if (fuzzyResults.length > 0) {
            const bestMatch = fuzzyResults[0];
            suggestions.push(`"${card.name}" not found. Did you mean "${bestMatch.name}"?`);
            
            // Add the original card with a warning
            validatedCards.push({
              ...card,
              name: card.name + ' (UNVALIDATED)',
            });
          } else {
            errors.push(`Card not found: "${card.name}"`);
            
            // Still add the card but mark it as unvalidated
            validatedCards.push({
              ...card,
              name: card.name + ' (NOT FOUND)',
            });
          }
        }
        
      } catch (error) {
        console.error(`Error validating card "${card.name}":`, error);
        warnings.push(`Could not validate "${card.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        // Add the original card
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
    const cacheKey = cardName.toLowerCase();
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const response = await this.api.get(`/cards/named`, {
        params: {
          exact: cardName,
        },
      });

      const card = response.data as ScryfallCard;
      this.cache.set(cacheKey, card);
      return card;
      
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null; // Card not found
      }
      throw error;
    }
  }

  /**
   * Perform fuzzy search for card suggestions
   */
  async fuzzySearch(cardName: string, limit = 5): Promise<ScryfallCard[]> {
    try {
      const response = await this.api.get(`/cards/search`, {
        params: {
          q: cardName,
          limit,
        },
      });

      const searchResult = response.data as ScryfallSearchResult;
      return searchResult.data || [];
      
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return []; // No results found
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