import axios from 'axios';
import { MTGCard } from '../types';

interface ScryfallCard {
  name: string;
  mana_cost?: string;
  colors?: string[];
  color_identity?: string[];
  type_line?: string;
  set?: string;
  rarity?: string;
}

export class ScryfallEnhancedService {
  private baseUrl = 'https://api.scryfall.com';
  private cache = new Map<string, ScryfallCard[]>();
  
  /**
   * Extract colors from mana symbols like "XU", "1B", "RG", etc.
   */
  private extractColorsFromSymbols(manaSymbols: string): string[] {
    const colors: Set<string> = new Set();
    const symbolMap: Record<string, string> = {
      'W': 'W', // White
      'U': 'U', // Blue  
      'B': 'B', // Black
      'R': 'R', // Red
      'G': 'G', // Green
    };
    
    for (const [symbol, color] of Object.entries(symbolMap)) {
      if (manaSymbols.toUpperCase().includes(symbol)) {
        colors.add(color);
      }
    }
    
    return Array.from(colors);
  }
  
  /**
   * Search for cards by partial name and color hints
   */
  async searchByPartialAndColor(
    partialName: string,
    colorHint?: string,
    manaSymbols?: string
  ): Promise<ScryfallCard[]> {
    
    // Clean the partial name
    const partial = partialName.trim();
    if (partial.length < 3) return [];
    
    // Build Scryfall query
    const queryParts: string[] = [];
    
    // Search by name starting with...
    queryParts.push(`name:/^${partial}/i`);
    
    // Add color constraints
    const colors: string[] = [];
    
    if (colorHint) {
      colors.push(...this.extractColorsFromSymbols(colorHint));
    }
    
    if (manaSymbols) {
      colors.push(...this.extractColorsFromSymbols(manaSymbols));
    }
    
    if (colors.length > 0) {
      const uniqueColors = [...new Set(colors)];
      queryParts.push(`color>=${uniqueColors.join('')}`);
    }
    
    // Limit to recent sets
    queryParts.push('(legal:standard OR legal:pioneer)');
    
    const query = queryParts.join(' ');
    
    // Check cache
    const cacheKey = `${partial}_${colors.join('')}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    console.log(`🔍 Scryfall search: ${query}`);
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const response = await axios.get(`${this.baseUrl}/cards/search`, {
        params: { q: query, format: 'json' },
        timeout: 5000
      });
      
      if (response.status === 200 && response.data.data) {
        const results: ScryfallCard[] = response.data.data
          .slice(0, 5) // Max 5 results
          .map((card: any) => ({
            name: card.name,
            mana_cost: card.mana_cost,
            colors: card.colors,
            color_identity: card.color_identity,
            type_line: card.type_line,
            set: card.set,
            rarity: card.rarity
          }));
        
        this.cache.set(cacheKey, results);
        return results;
      }
    } catch (error) {
      console.warn('Scryfall search error:', error);
    }
    
    return [];
  }
  
  /**
   * Complete partial cards detected by OCR
   */
  async completePartialCards(
    detectedCards: Array<{name: string; quantity: number; colorHint?: string}>
  ): Promise<MTGCard[]> {
    
    const completedCards: MTGCard[] = [];
    
    for (const detected of detectedCards) {
      // Skip if card name seems complete (> 10 chars and no "...")
      if (detected.name.length > 10 && !detected.name.includes('...')) {
        completedCards.push({
          name: detected.name,
          quantity: detected.quantity
        });
        continue;
      }
      
      // Try to complete partial cards
      const partial = detected.name.replace('...', '').trim();
      
      if (partial.length >= 3) {
        const results = await this.searchByPartialAndColor(
          partial,
          detected.colorHint
        );
        
        if (results.length > 0) {
          console.log(`✅ Completed: "${detected.name}" → "${results[0].name}"`);
          completedCards.push({
            name: results[0].name,
            quantity: detected.quantity
          });
        } else {
          // Keep original if no match
          completedCards.push({
            name: detected.name,
            quantity: detected.quantity
          });
        }
      } else {
        // Too short to search
        completedCards.push({
          name: detected.name,
          quantity: detected.quantity
        });
      }
    }
    
    return completedCards;
  }
  
  /**
   * Deduplicate and merge quantities
   */
  mergeCards(cards: MTGCard[]): MTGCard[] {
    const cardMap = new Map<string, number>();
    
    for (const card of cards) {
      const current = cardMap.get(card.name) || 0;
      cardMap.set(card.name, current + card.quantity);
    }
    
    return Array.from(cardMap.entries()).map(([name, quantity]) => ({
      name,
      quantity
    }));
  }
}

export default new ScryfallEnhancedService();