/**
 * MTGO Land Correction Service
 * =============================
 * Implements automatic land correction for MTGO decks
 * 
 * Problem: MTGO displays "Lands: 24" but OCR often finds less
 * Solution: The difference is ALWAYS on basic lands
 */

import { MTGCard } from '../types';

interface MTGOTotals {
  lands: number;
  creatures: number;
  other: number;
  sideboard: number;
  mainboard: number;
}

interface CardCount {
  lands: number;
  creatures: number;
  other: number;
  total: number;
}

export class MTGOLandCorrector {
  private readonly BASIC_LANDS = [
    'Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes',
    'Snow-Covered Plains', 'Snow-Covered Island', 'Snow-Covered Swamp',
    'Snow-Covered Mountain', 'Snow-Covered Forest'
  ];

  /**
   * Detect if the text is from MTGO interface
   */
  detectMTGOFormat(text: string): boolean {
    const mtgoIndicators = [
      /Lands:\s*\d+/i,
      /Creatures:\s*\d+/i,
      /Other:\s*\d+/i,
      /Sideboard:\s*\d+/i,
      /Display.*Sort.*Apply Filters/i
    ];

    let matches = 0;
    for (const pattern of mtgoIndicators) {
      if (pattern.test(text)) {
        matches++;
      }
    }

    // At least 2 indicators = MTGO
    const isMTGO = matches >= 2;
    if (isMTGO) {
      console.log('✓ MTGO format detected');
    }
    return isMTGO;
  }

  /**
   * Extract the totals displayed by MTGO
   */
  extractMTGOTotals(text: string): MTGOTotals {
    const totals: MTGOTotals = {
      lands: 0,
      creatures: 0,
      other: 0,
      sideboard: 0,
      mainboard: 60
    };

    const patterns: Record<keyof Omit<MTGOTotals, 'mainboard'>, RegExp> = {
      lands: /Lands:\s*(\d+)/i,
      creatures: /Creatures:\s*(\d+)/i,
      other: /Other:\s*(\d+)/i,
      sideboard: /Sideboard:\s*(\d+)/i
    };

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = text.match(pattern);
      if (match) {
        totals[key as keyof typeof patterns] = parseInt(match[1], 10);
      }
    }

    // Calculate mainboard total
    totals.mainboard = totals.lands + totals.creatures + totals.other;

    console.log(`📊 MTGO totals extracted: ${totals.mainboard} mainboard ` +
                `(${totals.lands}L/${totals.creatures}C/${totals.other}O), ` +
                `${totals.sideboard} sideboard`);

    return totals;
  }

  /**
   * Count cards by type
   */
  countCardsByType(cards: MTGCard[]): CardCount {
    const counts: CardCount = {
      lands: 0,
      creatures: 0,
      other: 0,
      total: 0
    };

    for (const card of cards) {
      counts.total += card.quantity;

      if (this.isLand(card.name)) {
        counts.lands += card.quantity;
      } else if (this.isCreature(card.name)) {
        counts.creatures += card.quantity;
      } else {
        counts.other += card.quantity;
      }
    }

    return counts;
  }

  /**
   * Determine if a card is a land
   */
  private isLand(cardName: string): boolean {
    const landKeywords = [
      'land', 'plains', 'island', 'swamp', 'mountain', 'forest',
      'wastes', 'verge', 'courtyard', 'tower', 'shrine', 'grave',
      'shores', 'coast', 'catacomb', 'fountain', 'otawara', 'eiganjo',
      'takenuma', 'town', 'raffine', 'godless', 'watery', 'hallowed',
      'drowned', 'darkslick', 'seachrome', 'gloomlake', 'floodform',
      'concealed', 'starting', 'cavern', 'urza', 'fetchland', 'shock',
      'tango', 'check', 'fast', 'slow', 'triome', 'horizon'
    ];

    const nameLower = cardName.toLowerCase();
    return landKeywords.some(keyword => nameLower.includes(keyword));
  }

  /**
   * Determine if a card is a creature
   */
  private isCreature(cardName: string): boolean {
    // Common creature keywords
    const creatureKeywords = [
      'pixie', 'kirin', 'siren', 'spyglass', 'relic', 'faerie',
      'mastermind', 'riptide', 'enduring', 'entity', 'operative',
      'elf', 'goblin', 'zombie', 'vampire', 'dragon', 'angel',
      'demon', 'beast', 'soldier', 'wizard', 'cleric', 'rogue',
      'warrior', 'knight', 'shaman', 'bird', 'spider', 'snake'
    ];

    const nameLower = cardName.toLowerCase();
    return creatureKeywords.some(keyword => nameLower.includes(keyword));
  }

  /**
   * Find a basic land in the deck
   */
  private findBasicLandInDeck(cards: MTGCard[]): string | null {
    // First, look for exact matches
    for (const card of cards) {
      if (this.BASIC_LANDS.includes(card.name)) {
        return card.name;
      }
    }

    // Look for partial matches
    for (const card of cards) {
      const nameLower = card.name.toLowerCase();
      for (const basic of this.BASIC_LANDS) {
        if (nameLower.includes(basic.toLowerCase())) {
          return basic;
        }
      }
    }

    return null;
  }

  /**
   * Guess basic land based on deck colors
   */
  private guessBasicLand(cards: MTGCard[]): string {
    const colorHints: Record<string, string> = {
      'island': 'Island',
      'blue': 'Island',
      'plains': 'Plains',
      'white': 'Plains',
      'swamp': 'Swamp',
      'black': 'Swamp',
      'mountain': 'Mountain',
      'red': 'Mountain',
      'forest': 'Forest',
      'green': 'Forest'
    };

    for (const card of cards) {
      const nameLower = card.name.toLowerCase();
      for (const [hint, land] of Object.entries(colorHints)) {
        if (nameLower.includes(hint)) {
          return land;
        }
      }
    }

    // Default to Island (common in control decks)
    return 'Island';
  }

  /**
   * Apply MTGO land correction
   */
  applyMTGOLandCorrection(cards: MTGCard[], ocrText: string): MTGCard[] {
    // Only apply to mainboard cards
    const mainboardCards = cards.filter(c => c.section !== 'sideboard');
    const sideboardCards = cards.filter(c => c.section === 'sideboard');

    // Check if it's MTGO format
    if (!this.detectMTGOFormat(ocrText)) {
      return cards;
    }

    console.log('🔧 Applying MTGO land correction');

    // 1. Extract MTGO totals
    const mtgoTotals = this.extractMTGOTotals(ocrText);
    const expectedLands = mtgoTotals.lands;

    // 2. Count what we found
    const currentCounts = this.countCardsByType(mainboardCards);
    const foundLands = currentCounts.lands;

    console.log(`  Expected: ${expectedLands} lands, Found: ${foundLands} lands`);

    // 3. If count is correct, no correction needed
    if (foundLands === expectedLands) {
      console.log('  ✓ Count correct, no correction needed');
      return cards;
    }

    // 4. Calculate difference
    const diff = expectedLands - foundLands;

    if (diff <= 0) {
      console.warn(`  ⚠️ Too many lands found (${foundLands} > ${expectedLands})`);
      return cards;
    }

    console.log(`  🎯 Correction needed: +${diff} lands`);

    // 5. Find the basic land to adjust
    let basicLand = this.findBasicLandInDeck(mainboardCards);

    if (!basicLand) {
      basicLand = this.guessBasicLand(mainboardCards);
      console.log(`  📌 Guessed basic land: ${basicLand}`);
    }

    // 6. Apply correction
    const correctedCards: MTGCard[] = [];
    let basicLandFound = false;

    for (const card of mainboardCards) {
      if (card.name === basicLand || card.name.toLowerCase() === basicLand.toLowerCase()) {
        // Add the difference to the basic land
        const correctedCard: MTGCard = {
          ...card,
          quantity: card.quantity + diff
        };
        correctedCards.push(correctedCard);
        basicLandFound = true;
        console.log(`  ✅ Corrected: ${card.name} ${card.quantity}x → ${correctedCard.quantity}x`);
      } else {
        correctedCards.push(card);
      }
    }

    // If basic land wasn't in the list, add it
    if (!basicLandFound) {
      correctedCards.push({
        name: basicLand,
        quantity: diff,
        section: 'mainboard'
      });
      console.log(`  ✅ Added: ${basicLand} ${diff}x`);
    }

    // 7. Final validation
    const finalCounts = this.countCardsByType(correctedCards);
    console.log(`  📊 After correction: ${finalCounts.lands} lands, ${finalCounts.total} total`);

    // Return corrected mainboard + original sideboard
    return [...correctedCards, ...sideboardCards];
  }

  /**
   * Validate deck counts
   */
  validateDeckCounts(cards: MTGCard[], ocrText: string): {
    valid: boolean;
    mainboardCount: number;
    sideboardCount: number;
    errors: string[];
    warnings: string[];
  } {
    const mainboard = cards.filter(c => c.section !== 'sideboard');
    const sideboard = cards.filter(c => c.section === 'sideboard');

    const mainTotal = mainboard.reduce((sum, c) => sum + c.quantity, 0);
    const sideTotal = sideboard.reduce((sum, c) => sum + c.quantity, 0);

    const result = {
      valid: false,
      mainboardCount: mainTotal,
      sideboardCount: sideTotal,
      errors: [] as string[],
      warnings: [] as string[]
    };

    // For MTGO, expect exactly 60+15
    if (this.detectMTGOFormat(ocrText)) {
      if (mainTotal !== 60) {
        result.errors.push(`Mainboard: ${mainTotal}/60 cards`);
      }
      if (sideTotal !== 15) {
        result.errors.push(`Sideboard: ${sideTotal}/15 cards`);
      }
    } else {
      // For other formats, be more flexible
      if (mainTotal < 60) {
        result.errors.push(`Mainboard incomplete: ${mainTotal}/60`);
      } else if (mainTotal > 60) {
        result.warnings.push(`Mainboard overloaded: ${mainTotal}/60`);
      }

      if (sideTotal > 15) {
        result.warnings.push(`Sideboard overloaded: ${sideTotal}/15`);
      }
    }

    result.valid = result.errors.length === 0;

    if (result.valid) {
      console.log('✅ Deck validated: 60+15 cards');
    } else {
      console.warn(`❌ Deck invalid: ${result.errors.join(', ')}`);
    }

    return result;
  }
}

export default new MTGOLandCorrector();