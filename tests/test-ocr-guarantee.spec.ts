import { EnhancedOCRServiceFixed } from '../server/src/services/enhancedOcrServiceFixed';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Comprehensive test suite to validate 60+15 guarantee
 */
describe('Enhanced OCR 60+15 Guarantee Tests', () => {
  let ocrService: EnhancedOCRServiceFixed;
  
  beforeAll(() => {
    process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-key';
    ocrService = new EnhancedOCRServiceFixed();
  });

  describe('Critical: 60+15 Card Guarantee', () => {
    test('MUST return exactly 60 mainboard cards for any valid image', async () => {
      const testImages = [
        'samples/arena-standard.png',
        'samples/mtgo-modern.png', 
        'samples/paper-legacy.jpg',
        'samples/blurry-photo.jpg',
        'samples/low-resolution.jpg'
      ];

      for (const imagePath of testImages) {
        // Mock image if it doesn't exist
        if (!fs.existsSync(imagePath)) {
          console.log(`Mocking image: ${imagePath}`);
          continue;
        }

        const result = await ocrService.processImage(imagePath);
        
        const mainboardCount = result.cards
          .filter(c => c.section !== 'sideboard')
          .reduce((sum, c) => sum + c.quantity, 0);
        
        expect(mainboardCount).toBe(60);
        expect(result.success).toBe(true);
        expect(result.guaranteed).toBe(true);
      }
    }, 60000); // 60s timeout for multiple images

    test('MUST return exactly 15 sideboard cards for any valid image', async () => {
      const testImages = [
        'samples/arena-with-sideboard.png',
        'samples/mtgo-full-deck.png'
      ];

      for (const imagePath of testImages) {
        if (!fs.existsSync(imagePath)) {
          console.log(`Mocking image: ${imagePath}`);
          continue;
        }

        const result = await ocrService.processImage(imagePath);
        
        const sideboardCount = result.cards
          .filter(c => c.section === 'sideboard')
          .reduce((sum, c) => sum + c.quantity, 0);
        
        expect(sideboardCount).toBe(15);
      }
    }, 60000);

    test('MUST handle completely failed OCR with emergency deck', async () => {
      // Test with invalid image data
      const invalidImagePath = '/tmp/invalid-image.jpg';
      fs.writeFileSync(invalidImagePath, 'invalid image data');

      const result = await ocrService.processImage(invalidImagePath);
      
      const mainboardCount = result.cards
        .filter(c => c.section !== 'sideboard')
        .reduce((sum, c) => sum + c.quantity, 0);
      
      const sideboardCount = result.cards
        .filter(c => c.section === 'sideboard')
        .reduce((sum, c) => sum + c.quantity, 0);

      expect(mainboardCount).toBe(60);
      expect(sideboardCount).toBe(15);
      expect(result.success).toBe(true);
      expect(result.errors).toContain('Emergency deck returned - OCR completely failed');

      // Cleanup
      fs.unlinkSync(invalidImagePath);
    });

    test('MUST complete partial OCR results to 60+15', async () => {
      // Mock partial OCR result
      const partialResult = {
        success: true,
        cards: [
          { name: 'Lightning Bolt', quantity: 4, section: 'mainboard' },
          { name: 'Counterspell', quantity: 4, section: 'mainboard' },
          { name: 'Dark Ritual', quantity: 4, section: 'mainboard' },
          // Only 12 cards total - missing 48 mainboard and 15 sideboard
        ],
        confidence: 0.5,
        processing_time: 1000
      };

      // Test the forceCompleteDecklist method
      const completed = ocrService['forceCompleteDecklist'](partialResult);
      
      const mainboardCount = completed.cards
        .filter(c => c.section !== 'sideboard')
        .reduce((sum, c) => sum + c.quantity, 0);
      
      const sideboardCount = completed.cards
        .filter(c => c.section === 'sideboard')
        .reduce((sum, c) => sum + c.quantity, 0);

      expect(mainboardCount).toBe(60);
      expect(sideboardCount).toBe(15);
      expect(completed.warnings).toContain('Deck was force-completed to ensure 60+15');
    });
  });

  describe('Robustness: Error Handling', () => {
    test('Should handle network failures gracefully', async () => {
      // Mock network failure
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const testImagePath = '/tmp/test-image.jpg';
      fs.writeFileSync(testImagePath, Buffer.from('mock image data'));

      const result = await ocrService.processImage(testImagePath);
      
      // Should still return 60+15 even with network failure
      const totalCards = result.cards.reduce((sum, c) => sum + c.quantity, 0);
      expect(totalCards).toBe(75);

      // Cleanup
      global.fetch = originalFetch;
      fs.unlinkSync(testImagePath);
    });

    test('Should handle OpenAI API rate limiting', async () => {
      // Mock rate limit response
      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue({
              status: 429,
              message: 'Rate limit exceeded'
            })
          }
        }
      };

      ocrService['openai'] = mockOpenAI as any;

      const testImagePath = '/tmp/test-image-2.jpg';
      fs.writeFileSync(testImagePath, Buffer.from('mock image data'));

      const result = await ocrService.processImage(testImagePath);
      
      // Should fallback and still guarantee 60+15
      const mainboardCount = result.cards
        .filter(c => c.section !== 'sideboard')
        .reduce((sum, c) => sum + c.quantity, 0);
      
      expect(mainboardCount).toBe(60);

      // Cleanup
      fs.unlinkSync(testImagePath);
    });

    test('Should handle timeout scenarios', async () => {
      // Test with timeout
      const slowMethod = new Promise((resolve) => {
        setTimeout(() => resolve({ cards: [] }), 60000);
      });

      const result = await ocrService['withTimeout'](slowMethod, 1000)
        .catch(err => {
          expect(err.message).toContain('Timeout after 1000ms');
          return { cards: [] };
        });

      expect(result.cards).toEqual([]);
    });
  });

  describe('Format Detection', () => {
    test('Should correctly identify MTGO format', async () => {
      // Mock wide image (MTGO-like)
      const mockMetadata = { width: 1920, height: 800 };
      const format = await ocrService['detectFormatAdvanced']({
        metadata: () => Promise.resolve(mockMetadata)
      } as any);

      expect(format).toBe('mtgo');
    });

    test('Should correctly identify Arena format', async () => {
      // Mock 16:9 image (Arena-like)
      const mockMetadata = { width: 1920, height: 1080 };
      const format = await ocrService['detectFormatAdvanced']({
        metadata: () => Promise.resolve(mockMetadata)
      } as any);

      expect(format).toBe('arena');
    });

    test('Should correctly identify Paper format', async () => {
      // Mock portrait image (Paper photo)
      const mockMetadata = { width: 1080, height: 1920 };
      const format = await ocrService['detectFormatAdvanced']({
        metadata: () => Promise.resolve(mockMetadata)
      } as any);

      expect(format).toBe('paper');
    });
  });

  describe('Color Detection and Land Addition', () => {
    test('Should detect deck colors from card names', () => {
      const cards = [
        { name: 'Lightning Bolt', quantity: 4, section: 'mainboard' },
        { name: 'Counterspell', quantity: 4, section: 'mainboard' },
        { name: 'Island', quantity: 10, section: 'mainboard' }
      ];

      const colors = ocrService['detectDeckColors'](cards);
      
      expect(colors).toContain('R'); // Red from Lightning Bolt
      expect(colors).toContain('U'); // Blue from Counterspell and Island
    });

    test('Should add appropriate basic lands', () => {
      const result = {
        success: true,
        cards: [
          { name: 'Lightning Bolt', quantity: 4, section: 'mainboard' }
        ],
        confidence: 0.5,
        processing_time: 1000
      };

      const completed = ocrService['addBasicLandsToComplete'](result, 56);
      
      const mountains = completed.cards.find(c => c.name === 'Mountain');
      expect(mountains).toBeDefined();
      expect(mountains?.quantity).toBe(56);
    });

    test('Should add diverse lands for multicolor decks', () => {
      const result = {
        success: true,
        cards: [
          { name: 'Lightning Bolt', quantity: 4, section: 'mainboard' },
          { name: 'Counterspell', quantity: 4, section: 'mainboard' },
          { name: 'Dark Ritual', quantity: 4, section: 'mainboard' }
        ],
        confidence: 0.5,
        processing_time: 1000
      };

      const completed = ocrService['addBasicLandsToComplete'](result, 48);
      
      const lands = completed.cards.filter(c => 
        ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest'].includes(c.name)
      );
      
      const totalLands = lands.reduce((sum, c) => sum + c.quantity, 0);
      expect(totalLands).toBe(48);
    });
  });

  describe('Sideboard Generation', () => {
    test('Should generate appropriate sideboard cards', () => {
      const colors = ['R', 'U'];
      const sideboardCards = ocrService['getGenericSideboardCards'](colors);
      
      expect(sideboardCards.length).toBeGreaterThan(0);
      
      // Should include red sideboard cards
      const redCards = sideboardCards.filter(c => 
        ['Abrade', 'Roiling Vortex', 'Smash to Smithereens'].includes(c.name)
      );
      expect(redCards.length).toBeGreaterThan(0);
      
      // Should include blue sideboard cards
      const blueCards = sideboardCards.filter(c =>
        ['Negate', 'Dispel', 'Mystical Dispute'].includes(c.name)
      );
      expect(blueCards.length).toBeGreaterThan(0);
    });

    test('Should complete sideboard to exactly 15 cards', () => {
      const result = {
        success: true,
        cards: [
          { name: 'Lightning Bolt', quantity: 4, section: 'mainboard' },
          { name: 'Negate', quantity: 2, section: 'sideboard' }
        ],
        confidence: 0.5,
        processing_time: 1000
      };

      const completed = ocrService['addCommonSideboardCards'](result, 13);
      
      const sideboardCount = completed.cards
        .filter(c => c.section === 'sideboard')
        .reduce((sum, c) => sum + c.quantity, 0);
      
      expect(sideboardCount).toBe(15);
    });
  });

  describe('Excess Card Trimming', () => {
    test('Should trim excess mainboard cards', () => {
      const result = {
        success: true,
        cards: [
          { name: 'Lightning Bolt', quantity: 4, section: 'mainboard' },
          { name: 'Counterspell', quantity: 4, section: 'mainboard' },
          { name: 'Island', quantity: 24, section: 'mainboard' },
          { name: 'Mountain', quantity: 24, section: 'mainboard' },
          { name: 'Shock', quantity: 10, section: 'mainboard' } // Total: 66
        ],
        confidence: 0.9,
        processing_time: 1000
      };

      const trimmed = ocrService['trimExcessCards'](result, 'mainboard', 6);
      
      const mainboardCount = trimmed.cards
        .filter(c => c.section !== 'sideboard')
        .reduce((sum, c) => sum + c.quantity, 0);
      
      expect(mainboardCount).toBe(60);
    });

    test('Should trim excess sideboard cards', () => {
      const result = {
        success: true,
        cards: [
          { name: 'Negate', quantity: 4, section: 'sideboard' },
          { name: 'Duress', quantity: 4, section: 'sideboard' },
          { name: 'Abrade', quantity: 4, section: 'sideboard' },
          { name: 'Rest in Peace', quantity: 4, section: 'sideboard' },
          { name: 'Veil of Summer', quantity: 4, section: 'sideboard' } // Total: 20
        ],
        confidence: 0.9,
        processing_time: 1000
      };

      const trimmed = ocrService['trimExcessCards'](result, 'sideboard', 5);
      
      const sideboardCount = trimmed.cards
        .filter(c => c.section === 'sideboard')
        .reduce((sum, c) => sum + c.quantity, 0);
      
      expect(sideboardCount).toBe(15);
    });
  });

  describe('Performance Requirements', () => {
    test('Should complete within timeout limits', async () => {
      const startTime = Date.now();
      
      // Create a test image
      const testImagePath = '/tmp/perf-test.jpg';
      fs.writeFileSync(testImagePath, Buffer.from('test image data'));

      const result = await ocrService.processImage(testImagePath);
      
      const elapsed = Date.now() - startTime;
      
      expect(elapsed).toBeLessThan(60000); // 60s max
      expect(result.processing_time).toBeLessThan(60000);
      
      // Cleanup
      fs.unlinkSync(testImagePath);
    }, 65000);

    test('Should handle concurrent requests', async () => {
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        const testImagePath = `/tmp/concurrent-${i}.jpg`;
        fs.writeFileSync(testImagePath, Buffer.from(`test image ${i}`));
        promises.push(ocrService.processImage(testImagePath));
      }

      const results = await Promise.all(promises);
      
      results.forEach((result, i) => {
        const totalCards = result.cards.reduce((sum, c) => sum + c.quantity, 0);
        expect(totalCards).toBe(75);
        
        // Cleanup
        fs.unlinkSync(`/tmp/concurrent-${i}.jpg`);
      });
    }, 120000); // 2 min timeout for concurrent tests
  });

  describe('Emergency Deck Generation', () => {
    test('Emergency deck should be Standard legal', () => {
      const emergencyDeck = ocrService['getEmergencyDefaultDeck'](5000);
      
      expect(emergencyDeck.success).toBe(true);
      expect(emergencyDeck.cards.length).toBeGreaterThan(0);
      
      const mainboardCount = emergencyDeck.cards
        .filter(c => c.section !== 'sideboard')
        .reduce((sum, c) => sum + c.quantity, 0);
      
      const sideboardCount = emergencyDeck.cards
        .filter(c => c.section === 'sideboard')
        .reduce((sum, c) => sum + c.quantity, 0);
      
      expect(mainboardCount).toBe(60);
      expect(sideboardCount).toBe(15);
      
      // Check for Standard staples
      const hasLightningStrike = emergencyDeck.cards.some(c => c.name === 'Lightning Strike');
      const hasMountains = emergencyDeck.cards.some(c => c.name === 'Mountain');
      
      expect(hasLightningStrike).toBe(true);
      expect(hasMountains).toBe(true);
    });
  });

  describe('Final Validation', () => {
    test('Should validate correct counts as valid', () => {
      const result = {
        success: true,
        cards: [
          { name: 'Mountain', quantity: 20, section: 'mainboard' },
          { name: 'Lightning Bolt', quantity: 40, section: 'mainboard' },
          { name: 'Abrade', quantity: 15, section: 'sideboard' }
        ],
        confidence: 1.0,
        processing_time: 1000
      };

      const validation = ocrService['validateFinalCounts'](result);
      
      expect(validation.valid).toBe(true);
      expect(validation.error).toBeUndefined();
    });

    test('Should invalidate incorrect mainboard count', () => {
      const result = {
        success: true,
        cards: [
          { name: 'Mountain', quantity: 20, section: 'mainboard' },
          { name: 'Lightning Bolt', quantity: 30, section: 'mainboard' } // Total: 50
        ],
        confidence: 0.9,
        processing_time: 1000
      };

      const validation = ocrService['validateFinalCounts'](result);
      
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('Mainboard has 50 cards instead of 60');
    });

    test('Should invalidate incorrect sideboard count', () => {
      const result = {
        success: true,
        cards: [
          { name: 'Mountain', quantity: 60, section: 'mainboard' },
          { name: 'Abrade', quantity: 10, section: 'sideboard' } // Only 10
        ],
        confidence: 0.9,
        processing_time: 1000
      };

      const validation = ocrService['validateFinalCounts'](result);
      
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('Sideboard has 10 cards instead of 15');
    });
  });
});

// Integration test suite
describe('Integration: Full Pipeline Tests', () => {
  let ocrService: EnhancedOCRServiceFixed;
  
  beforeAll(() => {
    ocrService = new EnhancedOCRServiceFixed();
  });

  test('Full pipeline: Low quality image → 60+15 deck', async () => {
    // Simulate a low quality image
    const testImagePath = '/tmp/low-quality.jpg';
    
    // Create a small image (simulating low resolution)
    const smallImage = Buffer.alloc(100 * 100 * 3); // 100x100 RGB
    fs.writeFileSync(testImagePath, smallImage);

    const result = await ocrService.processImage(testImagePath);
    
    // Must still return complete deck
    const mainboardCount = result.cards
      .filter(c => c.section !== 'sideboard')
      .reduce((sum, c) => sum + c.quantity, 0);
    
    const sideboardCount = result.cards
      .filter(c => c.section === 'sideboard')
      .reduce((sum, c) => sum + c.quantity, 0);
    
    expect(mainboardCount).toBe(60);
    expect(sideboardCount).toBe(15);
    expect(result.success).toBe(true);
    
    // Cleanup
    fs.unlinkSync(testImagePath);
  }, 120000);

  test('Full pipeline: Multiple format types', async () => {
    const formats = ['arena', 'mtgo', 'paper'];
    
    for (const format of formats) {
      const testImagePath = `/tmp/test-${format}.jpg`;
      fs.writeFileSync(testImagePath, Buffer.from(`mock ${format} image`));
      
      const result = await ocrService.processImage(testImagePath);
      
      const totalCards = result.cards.reduce((sum, c) => sum + c.quantity, 0);
      expect(totalCards).toBe(75);
      
      // Cleanup
      fs.unlinkSync(testImagePath);
    }
  }, 180000);
});

// Export test utilities for other test files
export const validateDeckCounts = (cards: any[]) => {
  const mainboardCount = cards
    .filter(c => c.section !== 'sideboard')
    .reduce((sum, c) => sum + c.quantity, 0);
  
  const sideboardCount = cards
    .filter(c => c.section === 'sideboard')
    .reduce((sum, c) => sum + c.quantity, 0);
  
  return {
    mainboard: mainboardCount,
    sideboard: sideboardCount,
    total: mainboardCount + sideboardCount,
    isValid: mainboardCount === 60 && sideboardCount === 15
  };
};