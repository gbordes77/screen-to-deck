import { MTGCard, DeckList, ExportFormat, ExportResult } from '../types';

class ExportService {
  /**
   * Export deck to specified format
   */
  async exportDeck(cards: MTGCard[], format: ExportFormat, deckName?: string): Promise<ExportResult> {
    switch (format) {
      case 'mtga':
        return this.exportToMTGA(cards, deckName);
      case 'moxfield':
        return this.exportToMoxfield(cards, deckName);
      case 'archidekt':
        return this.exportToArchidekt(cards, deckName);
      case 'tappedout':
        return this.exportToTappedOut(cards, deckName);
      case 'txt':
        return this.exportToTxt(cards, deckName);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export to MTG Arena format
   */
  private exportToMTGA(cards: MTGCard[], deckName?: string): ExportResult {
    let content = '';
    
    if (deckName) {
      content += `Deck\n`;
    }

    // Group cards by mainboard/sideboard
    const mainboard = cards.filter(card => !card.name.includes('SB:'));
    const sideboard = cards.filter(card => card.name.includes('SB:'));

    // Add mainboard cards
    for (const card of mainboard) {
      const cleanName = card.name.replace(' (UNVALIDATED)', '').replace(' (NOT FOUND)', '');
      content += `${card.quantity} ${cleanName}`;
      
      // Add set information if available
      if (card.set && card.collector_number) {
        content += ` (${card.set.toUpperCase()}) ${card.collector_number}`;
      }
      
      content += '\n';
    }

    // Add sideboard if present
    if (sideboard.length > 0) {
      content += '\nSideboard\n';
      for (const card of sideboard) {
        const cleanName = card.name.replace('SB:', '').replace(' (UNVALIDATED)', '').replace(' (NOT FOUND)', '').trim();
        content += `${card.quantity} ${cleanName}`;
        
        if (card.set && card.collector_number) {
          content += ` (${card.set.toUpperCase()}) ${card.collector_number}`;
        }
        
        content += '\n';
      }
    }

    return {
      format: 'mtga',
      content: content.trim(),
      filename: `${deckName || 'deck'}_mtga.txt`,
    };
  }

  /**
   * Export to Moxfield format
   */
  private exportToMoxfield(cards: MTGCard[], deckName?: string): ExportResult {
    const deckData = {
      name: deckName || 'Imported Deck',
      description: 'Imported from MTG Deck Converter',
      format: 'standard', // Default format
      mainboard: {} as Record<string, { quantity: number; card: any }>,
      sideboard: {} as Record<string, { quantity: number; card: any }>,
    };

    // Process cards
    for (const card of cards) {
      const isSideboard = card.name.includes('SB:');
      const cleanName = card.name
        .replace('SB:', '')
        .replace(' (UNVALIDATED)', '')
        .replace(' (NOT FOUND)', '')
        .trim();

      const cardData = {
        quantity: card.quantity,
        card: {
          name: cleanName,
          set: card.set || undefined,
          collector_number: card.collector_number || undefined,
          scryfall_id: card.scryfall_id || undefined,
        },
      };

      if (isSideboard) {
        deckData.sideboard[cleanName] = cardData;
      } else {
        deckData.mainboard[cleanName] = cardData;
      }
    }

    const content = JSON.stringify(deckData, null, 2);
    
    // Generate Moxfield import URL
    const encodedData = encodeURIComponent(content);
    const url = `https://www.moxfield.com/decks/new?data=${encodedData}`;

    return {
      format: 'moxfield',
      content,
      filename: `${deckName || 'deck'}_moxfield.json`,
      url: url.length < 2048 ? url : '',
    };
  }

  /**
   * Export to Archidekt format
   */
  private exportToArchidekt(cards: MTGCard[], deckName?: string): ExportResult {
    let content = '';
    
    if (deckName) {
      content += `// ${deckName}\n`;
    }
    
    content += '// Exported from MTG Deck Converter\n\n';

    // Group cards
    const mainboard = cards.filter(card => !card.name.includes('SB:'));
    const sideboard = cards.filter(card => card.name.includes('SB:'));
    const commander = cards.filter(card => card.name.includes('CMD:'));

    // Commander section
    if (commander.length > 0) {
      content += '// Commander\n';
      for (const card of commander) {
        const cleanName = card.name.replace('CMD:', '').replace(' (UNVALIDATED)', '').replace(' (NOT FOUND)', '').trim();
        content += `1 ${cleanName}\n`;
      }
      content += '\n';
    }

    // Mainboard section
    if (mainboard.length > 0) {
      content += '// Mainboard\n';
      for (const card of mainboard) {
        const cleanName = card.name.replace(' (UNVALIDATED)', '').replace(' (NOT FOUND)', '');
        content += `${card.quantity} ${cleanName}\n`;
      }
    }

    // Sideboard section
    if (sideboard.length > 0) {
      content += '\n// Sideboard\n';
      for (const card of sideboard) {
        const cleanName = card.name.replace('SB:', '').replace(' (UNVALIDATED)', '').replace(' (NOT FOUND)', '').trim();
        content += `${card.quantity} ${cleanName}\n`;
      }
    }

    return {
      format: 'archidekt',
      content: content.trim(),
      filename: `${deckName || 'deck'}_archidekt.txt`,
    };
  }

  /**
   * Export to TappedOut format
   */
  private exportToTappedOut(cards: MTGCard[], deckName?: string): ExportResult {
    let content = '';

    // Group cards by type for better organization
    const creatures = cards.filter(card => card.type_line?.includes('Creature'));
    const instants = cards.filter(card => card.type_line?.includes('Instant'));
    const sorceries = cards.filter(card => card.type_line?.includes('Sorcery'));
    const enchantments = cards.filter(card => card.type_line?.includes('Enchantment'));
    const artifacts = cards.filter(card => card.type_line?.includes('Artifact'));
    const planeswalkers = cards.filter(card => card.type_line?.includes('Planeswalker'));
    const lands = cards.filter(card => card.type_line?.includes('Land'));
    const others = cards.filter(card => 
      !card.type_line || 
      (!card.type_line.includes('Creature') && 
       !card.type_line.includes('Instant') && 
       !card.type_line.includes('Sorcery') && 
       !card.type_line.includes('Enchantment') && 
       !card.type_line.includes('Artifact') && 
       !card.type_line.includes('Planeswalker') && 
       !card.type_line.includes('Land'))
    );

    const addSection = (sectionName: string, sectionCards: MTGCard[]) => {
      if (sectionCards.length > 0) {
        content += `# ${sectionName}\n`;
        for (const card of sectionCards) {
          const cleanName = card.name
            .replace('SB:', '')
            .replace('CMD:', '')
            .replace(' (UNVALIDATED)', '')
            .replace(' (NOT FOUND)', '')
            .trim();
          content += `${card.quantity}x ${cleanName}\n`;
        }
        content += '\n';
      }
    };

    addSection('Creatures', creatures);
    addSection('Instants', instants);
    addSection('Sorceries', sorceries);
    addSection('Enchantments', enchantments);
    addSection('Artifacts', artifacts);
    addSection('Planeswalkers', planeswalkers);
    addSection('Lands', lands);
    addSection('Other', others);

    return {
      format: 'tappedout',
      content: content.trim(),
      filename: `${deckName || 'deck'}_tappedout.txt`,
    };
  }

  /**
   * Export to plain text format
   */
  private exportToTxt(cards: MTGCard[], deckName?: string): ExportResult {
    let content = '';
    
    if (deckName) {
      content += `${deckName}\n`;
      content += '='.repeat(deckName.length) + '\n\n';
    }

    // Simple card list
    for (const card of cards) {
      const cleanName = card.name
        .replace('SB:', '')
        .replace('CMD:', '')
        .replace(' (UNVALIDATED)', '')
        .replace(' (NOT FOUND)', '')
        .trim();
      
      content += `${card.quantity}x ${cleanName}`;
      
      if (card.mana_cost) {
        content += ` ${card.mana_cost}`;
      }
      
      if (card.type_line) {
        content += ` - ${card.type_line}`;
      }
      
      content += '\n';
    }

    // Add statistics
    const totalCards = cards.reduce((sum, card) => sum + card.quantity, 0);
    const uniqueCards = cards.length;
    
    content += `\nStatistics:\n`;
    content += `Total cards: ${totalCards}\n`;
    content += `Unique cards: ${uniqueCards}\n`;

    return {
      format: 'txt',
      content: content.trim(),
      filename: `${deckName || 'deck'}.txt`,
    };
  }

  /**
   * Export to multiple formats at once
   */
  async exportToAllFormats(cards: MTGCard[], deckName?: string): Promise<ExportResult[]> {
    const formats: ExportFormat[] = ['mtga', 'moxfield', 'archidekt', 'tappedout', 'txt'];
    const results: ExportResult[] = [];

    for (const format of formats) {
      try {
        const result = await this.exportDeck(cards, format, deckName);
        results.push(result);
      } catch (error) {
        console.error(`Failed to export to ${format}:`, error);
        // Continue with other formats
      }
    }

    return results;
  }

  /**
   * Generate deck statistics
   */
  generateDeckStats(cards: MTGCard[]): {
    totalCards: number;
    uniqueCards: number;
    averageCMC: number;
    colorDistribution: Record<string, number>;
    typeDistribution: Record<string, number>;
    rarityDistribution: Record<string, number>;
  } {
    const totalCards = cards.reduce((sum, card) => sum + card.quantity, 0);
    const uniqueCards = cards.length;
    
    // Calculate average CMC
    let totalCMC = 0;
    let cardsWithCMC = 0;
    
    for (const card of cards) {
      if (card.cmc !== undefined) {
        totalCMC += card.cmc * card.quantity;
        cardsWithCMC += card.quantity;
      }
    }
    
    const averageCMC = cardsWithCMC > 0 ? totalCMC / cardsWithCMC : 0;

    // Color distribution
    const colorDistribution: Record<string, number> = {};
    for (const card of cards) {
      if (card.colors) {
        for (const color of card.colors) {
          colorDistribution[color] = (colorDistribution[color] || 0) + card.quantity;
        }
      }
    }

    // Type distribution
    const typeDistribution: Record<string, number> = {};
    for (const card of cards) {
      if (card.type_line) {
        const primaryType = card.type_line.split(' ')[0];
        typeDistribution[primaryType] = (typeDistribution[primaryType] || 0) + card.quantity;
      }
    }

    // Rarity distribution
    const rarityDistribution: Record<string, number> = {};
    for (const card of cards) {
      if (card.rarity) {
        rarityDistribution[card.rarity] = (rarityDistribution[card.rarity] || 0) + card.quantity;
      }
    }

    return {
      totalCards,
      uniqueCards,
      averageCMC: Number(averageCMC.toFixed(2)),
      colorDistribution,
      typeDistribution,
      rarityDistribution,
    };
  }
}

export default new ExportService(); 