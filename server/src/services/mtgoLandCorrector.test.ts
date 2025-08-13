/**
 * Unit tests for MTGO Land Corrector
 */

import { MTGOLandCorrector } from './mtgoLandCorrector';
import { MTGCard } from '../types';

describe('MTGOLandCorrector', () => {
  let corrector: MTGOLandCorrector;

  beforeEach(() => {
    corrector = new MTGOLandCorrector();
  });

  describe('detectMTGOFormat', () => {
    it('should detect MTGO format from text', () => {
      const mtgoText = 'Lands: 24  Creatures: 14  Other: 22  Sideboard: 15';
      expect(corrector.detectMTGOFormat(mtgoText)).toBe(true);
    });

    it('should not detect MTGO format from Arena text', () => {
      const arenaText = '60 Cards\nMainboard\n4x Lightning Bolt';
      expect(corrector.detectMTGOFormat(arenaText)).toBe(false);
    });

    it('should detect MTGO with partial indicators', () => {
      const partialText = 'Sideboard: 15\nDisplay  Sort  Apply Filters';
      expect(corrector.detectMTGOFormat(partialText)).toBe(true);
    });
  });

  describe('extractMTGOTotals', () => {
    it('should extract correct totals from MTGO text', () => {
      const mtgoText = 'Lands: 24  Creatures: 14  Other: 22  Sideboard: 15';
      const totals = corrector.extractMTGOTotals(mtgoText);
      
      expect(totals.lands).toBe(24);
      expect(totals.creatures).toBe(14);
      expect(totals.other).toBe(22);
      expect(totals.sideboard).toBe(15);
      expect(totals.mainboard).toBe(60);
    });

    it('should handle missing values gracefully', () => {
      const partialText = 'Lands: 24  Creatures: 14';
      const totals = corrector.extractMTGOTotals(partialText);
      
      expect(totals.lands).toBe(24);
      expect(totals.creatures).toBe(14);
      expect(totals.other).toBe(0);
      expect(totals.mainboard).toBe(38);
    });
  });

  describe('applyMTGOLandCorrection', () => {
    const mtgoText = 'Lands: 24  Creatures: 14  Other: 22  Sideboard: 15';

    it('should correct missing basic lands', () => {
      const cards: MTGCard[] = [
        { name: 'Concealed Courtyard', quantity: 4, section: 'mainboard' },
        { name: 'Floodform Verge', quantity: 2, section: 'mainboard' },
        { name: 'Gloomlake Verge', quantity: 4, section: 'mainboard' },
        { name: 'Island', quantity: 2, section: 'mainboard' }, // Should be 8
        { name: 'Starting Town', quantity: 3, section: 'mainboard' },
        { name: 'Watery Grave', quantity: 1, section: 'mainboard' },
        { name: 'Raffine\'s Tower', quantity: 1, section: 'mainboard' },
        { name: 'Godless Shrine', quantity: 1, section: 'mainboard' },
      ];

      const corrected = corrector.applyMTGOLandCorrection(cards, mtgoText);
      
      // Find the Island card
      const island = corrected.find(c => c.name === 'Island');
      expect(island).toBeDefined();
      expect(island?.quantity).toBe(8); // 2 + 6 correction

      // Total lands should be 24
      const landCards = corrected.filter(c => 
        c.section === 'mainboard' && 
        corrector['isLand'](c.name)
      );
      const totalLands = landCards.reduce((sum, c) => sum + c.quantity, 0);
      expect(totalLands).toBe(24);
    });

    it('should not correct if count is already correct', () => {
      const cards: MTGCard[] = [
        { name: 'Island', quantity: 24, section: 'mainboard' },
        { name: 'Lightning Bolt', quantity: 36, section: 'mainboard' },
      ];

      const corrected = corrector.applyMTGOLandCorrection(cards, mtgoText);
      
      const island = corrected.find(c => c.name === 'Island');
      expect(island?.quantity).toBe(24); // No change
    });

    it('should add basic land if not present', () => {
      const cards: MTGCard[] = [
        { name: 'Concealed Courtyard', quantity: 4, section: 'mainboard' },
        { name: 'Floodform Verge', quantity: 4, section: 'mainboard' },
        { name: 'Gloomlake Verge', quantity: 4, section: 'mainboard' },
        // No basic lands
      ];

      const corrected = corrector.applyMTGOLandCorrection(cards, mtgoText);
      
      // Should add Island (or another basic) with the difference
      const hasBasicLand = corrected.some(c => 
        ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest'].includes(c.name)
      );
      expect(hasBasicLand).toBe(true);
    });

    it('should not modify sideboard cards', () => {
      const cards: MTGCard[] = [
        { name: 'Island', quantity: 2, section: 'mainboard' },
        { name: 'Negate', quantity: 3, section: 'sideboard' },
        { name: 'Dovin\'s Veto', quantity: 2, section: 'sideboard' },
      ];

      const corrected = corrector.applyMTGOLandCorrection(cards, mtgoText);
      
      const sideboardCards = corrected.filter(c => c.section === 'sideboard');
      expect(sideboardCards).toHaveLength(2);
      expect(sideboardCards[0].quantity).toBe(3);
      expect(sideboardCards[1].quantity).toBe(2);
    });
  });

  describe('validateDeckCounts', () => {
    const mtgoText = 'Lands: 24  Creatures: 14  Other: 22  Sideboard: 15';

    it('should validate correct MTGO deck', () => {
      const cards: MTGCard[] = [
        // 60 mainboard
        ...Array(60).fill(null).map((_, i) => ({
          name: `Card ${i}`,
          quantity: 1,
          section: 'mainboard' as const
        })),
        // 15 sideboard
        ...Array(15).fill(null).map((_, i) => ({
          name: `Side ${i}`,
          quantity: 1,
          section: 'sideboard' as const
        }))
      ];

      const validation = corrector.validateDeckCounts(cards, mtgoText);
      
      expect(validation.valid).toBe(true);
      expect(validation.mainboardCount).toBe(60);
      expect(validation.sideboardCount).toBe(15);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect incomplete MTGO mainboard', () => {
      const cards: MTGCard[] = [
        { name: 'Island', quantity: 20, section: 'mainboard' },
        { name: 'Lightning Bolt', quantity: 35, section: 'mainboard' }, // Total: 55
        { name: 'Negate', quantity: 15, section: 'sideboard' },
      ];

      const validation = corrector.validateDeckCounts(cards, mtgoText);
      
      expect(validation.valid).toBe(false);
      expect(validation.mainboardCount).toBe(55);
      expect(validation.errors).toContain('Mainboard: 55/60 cards');
    });

    it('should detect incorrect sideboard', () => {
      const cards: MTGCard[] = [
        { name: 'Island', quantity: 60, section: 'mainboard' },
        { name: 'Negate', quantity: 10, section: 'sideboard' }, // Only 10
      ];

      const validation = corrector.validateDeckCounts(cards, mtgoText);
      
      expect(validation.valid).toBe(false);
      expect(validation.sideboardCount).toBe(10);
      expect(validation.errors).toContain('Sideboard: 10/15 cards');
    });

    it('should be flexible for non-MTGO formats', () => {
      const arenaText = '60 Cards';
      const cards: MTGCard[] = [
        { name: 'Island', quantity: 62, section: 'mainboard' }, // Overloaded
        { name: 'Negate', quantity: 16, section: 'sideboard' }, // Overloaded
      ];

      const validation = corrector.validateDeckCounts(cards, arenaText);
      
      expect(validation.valid).toBe(true); // Warnings, not errors
      expect(validation.warnings).toContain('Mainboard overloaded: 62/60');
      expect(validation.warnings).toContain('Sideboard overloaded: 16/15');
    });
  });

  describe('countCardsByType', () => {
    it('should correctly categorize cards', () => {
      const cards: MTGCard[] = [
        { name: 'Island', quantity: 4, section: 'mainboard' },
        { name: 'Mountain', quantity: 4, section: 'mainboard' },
        { name: 'Pixie Guide', quantity: 4, section: 'mainboard' },
        { name: 'Lightning Bolt', quantity: 4, section: 'mainboard' },
      ];

      const counts = corrector.countCardsByType(cards);
      
      expect(counts.lands).toBe(8);
      expect(counts.creatures).toBe(4);
      expect(counts.other).toBe(4);
      expect(counts.total).toBe(16);
    });
  });
});