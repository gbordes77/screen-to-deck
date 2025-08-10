/**
 * CRITICAL TEST SUITE: Enhanced OCR Service
 * REQUIREMENT: Must ALWAYS extract exactly 60 mainboard + 15 sideboard cards
 */

import { EnhancedOCRService } from '../../src/services/enhancedOcrService';
import { OCRResult, MTGCard } from '../../src/types';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Mock OpenAI to control test behavior
jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    }))
  };
});

// Mock file system for test images
jest.mock('fs');
jest.mock('sharp');

describe('🚨 CRITICAL: Enhanced OCR Service - 60+15 Guarantee', () => {
  let service: EnhancedOCRService;
  
  beforeEach(() => {
    service = new EnhancedOCRService();
    jest.clearAllMocks();
  });

  describe('✅ Core Guarantee: Always Return 60+15', () => {
    
    test('MUST return exactly 60 mainboard + 15 sideboard for valid Arena screenshot', async () => {
      // Arrange
      const testImagePath = '/test/arena-standard.png';
      mockImageMetadata(testImagePath, 1920, 1080);
      mockOpenAIResponse(generateValidDeckResponse());

      // Act
      const result = await service.processImage(testImagePath);

      // Assert
      const mainCount = countCards(result.cards, 'mainboard');
      const sideCount = countCards(result.cards, 'sideboard');
      
      expect(result.success).toBe(true);
      expect(mainCount).toBe(60);
      expect(sideCount).toBe(15);
      expect(result.cards.length).toBeGreaterThan(0);
    });

    test('MUST return exactly 60+15 even with partial OCR failure', async () => {
      // Arrange
      const testImagePath = '/test/blurry-photo.jpg';
      mockImageMetadata(testImagePath, 800, 600);
      // Mock partial OCR response (only 40 cards detected)
      mockOpenAIResponse(generatePartialDeckResponse());

      // Act
      const result = await service.processImage(testImagePath);

      // Assert - Should complete with basic lands
      const mainCount = countCards(result.cards, 'mainboard');
      const sideCount = countCards(result.cards, 'sideboard');
      
      expect(result.success).toBe(true);
      expect(mainCount).toBe(60);
      expect(sideCount).toBe(15);
      expect(result.cards.some(c => c.name.includes('Land'))).toBe(true);
    });

    test('MUST handle complete OCR failure and still return 60+15', async () => {
      // Arrange
      const testImagePath = '/test/corrupted.png';
      mockImageMetadata(testImagePath, 100, 100);
      mockOpenAIFailure();

      // Act
      const result = await service.processImage(testImagePath);

      // Assert - Should return default deck
      const mainCount = countCards(result.cards, 'mainboard');
      const sideCount = countCards(result.cards, 'sideboard');
      
      expect(result.success).toBe(true);
      expect(mainCount).toBe(60);
      expect(sideCount).toBe(15);
      // Should have basic lands as fallback
      expect(result.cards.filter(c => c.name.includes('Plains')).length).toBeGreaterThan(0);
    });

    test('MUST handle duplicate cards and maintain 60+15 total', async () => {
      // Arrange
      const testImagePath = '/test/duplicates.png';
      mockImageMetadata(testImagePath, 1920, 1080);
      mockOpenAIResponse(generateDuplicateDeckResponse());

      // Act
      const result = await service.processImage(testImagePath);

      // Assert
      const mainCount = countCards(result.cards, 'mainboard');
      const sideCount = countCards(result.cards, 'sideboard');
      
      expect(result.success).toBe(true);
      expect(mainCount).toBe(60);
      expect(sideCount).toBe(15);
      // Check no single card exceeds 4 copies (except basic lands)
      const nonBasicCards = result.cards.filter(c => !isBasicLand(c.name));
      nonBasicCards.forEach(card => {
        expect(card.quantity).toBeLessThanOrEqual(4);
      });
    });
  });

  describe('🔄 Progressive OCR Pipeline', () => {
    
    test('Should try multiple OCR methods before giving up', async () => {
      // Arrange
      const testImagePath = '/test/difficult.png';
      mockImageMetadata(testImagePath, 1024, 768);
      let attempts = 0;
      mockProgressiveOCRAttempts(() => {
        attempts++;
        if (attempts < 3) {
          return generatePartialDeckResponse();
        }
        return generateValidDeckResponse();
      });

      // Act
      const result = await service.processImage(testImagePath);

      // Assert
      expect(attempts).toBeGreaterThanOrEqual(2);
      expect(result.success).toBe(true);
      const mainCount = countCards(result.cards, 'mainboard');
      const sideCount = countCards(result.cards, 'sideboard');
      expect(mainCount).toBe(60);
      expect(sideCount).toBe(15);
    });

    test('Should apply super-resolution for low-quality images', async () => {
      // Arrange
      const testImagePath = '/test/low-res.png';
      mockImageMetadata(testImagePath, 400, 300); // Below MIN_RESOLUTION
      mockOpenAIResponse(generateValidDeckResponse());
      const sharpMock = sharp as jest.MockedFunction<typeof sharp>;

      // Act
      const result = await service.processImage(testImagePath);

      // Assert
      expect(sharpMock).toHaveBeenCalled();
      // Verify resize was called with upscale factor
      const mockInstance = sharpMock.mock.results[0]?.value;
      expect(mockInstance?.resize).toHaveBeenCalledWith(
        expect.objectContaining({
          width: expect.any(Number)
        })
      );
      expect(result.success).toBe(true);
    });
  });

  describe('📏 Format Detection', () => {
    
    test('Should detect Arena format correctly', async () => {
      // Arrange
      const testImagePath = '/test/arena.png';
      mockImageMetadata(testImagePath, 1920, 1080); // 16:9 aspect ratio
      mockOpenAIResponse(generateValidDeckResponse());

      // Act
      const result = await service.processImage(testImagePath);

      // Assert
      expect(result.success).toBe(true);
      expect(result.format).toBe('arena');
    });

    test('Should detect MTGO format correctly', async () => {
      // Arrange
      const testImagePath = '/test/mtgo.png';
      mockImageMetadata(testImagePath, 1024, 768); // 4:3 aspect ratio
      mockOpenAIResponse(generateValidDeckResponse());

      // Act
      const result = await service.processImage(testImagePath);

      // Assert
      expect(result.success).toBe(true);
      expect(result.format).toBe('mtgo');
    });
  });

  describe('🔧 Validation and Auto-Fix', () => {
    
    test('Should add basic lands when mainboard < 60', async () => {
      // Arrange
      const testImagePath = '/test/incomplete.png';
      mockImageMetadata(testImagePath, 1920, 1080);
      // Only 45 cards detected
      mockOpenAIResponse(generateIncompleteDeckResponse(45));

      // Act
      const result = await service.processImage(testImagePath);

      // Assert
      const mainCount = countCards(result.cards, 'mainboard');
      const basicLands = result.cards.filter(c => isBasicLand(c.name));
      
      expect(result.success).toBe(true);
      expect(mainCount).toBe(60);
      expect(basicLands.length).toBeGreaterThan(0);
    });

    test('Should generate sideboard when missing', async () => {
      // Arrange
      const testImagePath = '/test/no-sideboard.png';
      mockImageMetadata(testImagePath, 1920, 1080);
      mockOpenAIResponse(generateMainboardOnlyResponse());

      // Act
      const result = await service.processImage(testImagePath);

      // Assert
      const sideCount = countCards(result.cards, 'sideboard');
      
      expect(result.success).toBe(true);
      expect(sideCount).toBe(15);
    });

    test('Should handle overlapping text regions correctly', async () => {
      // Arrange
      const testImagePath = '/test/overlapping.png';
      mockImageMetadata(testImagePath, 1920, 1080);
      mockOpenAIResponse(generateOverlappingResponse());

      // Act
      const result = await service.processImage(testImagePath);

      // Assert
      const mainCount = countCards(result.cards, 'mainboard');
      const sideCount = countCards(result.cards, 'sideboard');
      
      expect(result.success).toBe(true);
      expect(mainCount).toBe(60);
      expect(sideCount).toBe(15);
      // Verify no duplicate entries
      const cardNames = result.cards.map(c => c.name);
      const uniqueNames = [...new Set(cardNames)];
      expect(uniqueNames.length).toBe(cardNames.length);
    });
  });

  describe('🚀 Performance and Reliability', () => {
    
    test('Should complete within 30 seconds timeout', async () => {
      // Arrange
      const testImagePath = '/test/complex.png';
      mockImageMetadata(testImagePath, 3840, 2160);
      mockOpenAIResponse(generateValidDeckResponse(), 2000); // 2 second delay

      // Act
      const startTime = Date.now();
      const result = await service.processImage(testImagePath);
      const processingTime = Date.now() - startTime;

      // Assert
      expect(result.success).toBe(true);
      expect(processingTime).toBeLessThan(30000);
      expect(result.processing_time).toBeDefined();
    });

    test('Should handle API rate limiting with retry', async () => {
      // Arrange
      const testImagePath = '/test/rate-limited.png';
      mockImageMetadata(testImagePath, 1920, 1080);
      let attempts = 0;
      mockRateLimitedResponse(() => {
        attempts++;
        if (attempts > 2) {
          return generateValidDeckResponse();
        }
        throw new Error('Rate limited');
      });

      // Act
      const result = await service.processImage(testImagePath);

      // Assert
      expect(attempts).toBeGreaterThan(2);
      expect(result.success).toBe(true);
      const mainCount = countCards(result.cards, 'mainboard');
      const sideCount = countCards(result.cards, 'sideboard');
      expect(mainCount).toBe(60);
      expect(sideCount).toBe(15);
    });

    test('Should cache processed results for identical images', async () => {
      // Arrange
      const testImagePath = '/test/cached.png';
      mockImageMetadata(testImagePath, 1920, 1080);
      let apiCalls = 0;
      mockOpenAIResponse(() => {
        apiCalls++;
        return generateValidDeckResponse();
      });

      // Act
      const result1 = await service.processImage(testImagePath);
      const result2 = await service.processImage(testImagePath);

      // Assert
      expect(apiCalls).toBe(1); // Should only call API once
      expect(result1.cards).toEqual(result2.cards);
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });
});

// Helper Functions
function countCards(cards: MTGCard[], section: 'mainboard' | 'sideboard' = 'mainboard'): number {
  return cards
    .filter(c => (section === 'sideboard' ? c.section === 'sideboard' : c.section !== 'sideboard'))
    .reduce((sum, card) => sum + card.quantity, 0);
}

function isBasicLand(cardName: string): boolean {
  const basicLands = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest'];
  return basicLands.some(land => cardName.includes(land));
}

function mockImageMetadata(imagePath: string, width: number, height: number) {
  (fs.existsSync as jest.Mock).mockReturnValue(true);
  ((sharp as unknown) as jest.Mock).mockReturnValue({
    metadata: jest.fn().mockResolvedValue({ width, height }),
    resize: jest.fn().mockReturnThis(),
    modulate: jest.fn().mockReturnThis(),
    sharpen: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    toFile: jest.fn().mockResolvedValue(undefined),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('test'))
  });
}

function mockOpenAIResponse(response: any, delay: number = 0) {
  const OpenAI = require('openai').default;
  OpenAI.mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockImplementation(async () => {
          if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          if (typeof response === 'function') {
            return response();
          }
          return response;
        })
      }
    }
  }));
}

function mockOpenAIFailure() {
  const OpenAI = require('openai').default;
  OpenAI.mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockRejectedValue(new Error('OpenAI API failure'))
      }
    }
  }));
}

function mockProgressiveOCRAttempts(attemptFn: () => any) {
  mockOpenAIResponse(attemptFn);
}

function mockRateLimitedResponse(attemptFn: () => any) {
  mockOpenAIResponse(attemptFn);
}

function generateValidDeckResponse() {
  return {
    choices: [{
      message: {
        content: JSON.stringify({
          cards: [
            // Mainboard - 60 cards
            { name: "Lightning Bolt", quantity: 4, section: "mainboard" },
            { name: "Ragavan, Nimble Pilferer", quantity: 4, section: "mainboard" },
            { name: "Dragon's Rage Channeler", quantity: 4, section: "mainboard" },
            { name: "Murktide Regent", quantity: 2, section: "mainboard" },
            { name: "Ledger Shredder", quantity: 4, section: "mainboard" },
            { name: "Counterspell", quantity: 4, section: "mainboard" },
            { name: "Expressive Iteration", quantity: 4, section: "mainboard" },
            { name: "Unholy Heat", quantity: 4, section: "mainboard" },
            { name: "Mishra's Bauble", quantity: 4, section: "mainboard" },
            { name: "Consider", quantity: 4, section: "mainboard" },
            { name: "Steam Vents", quantity: 4, section: "mainboard" },
            { name: "Spirebluff Canal", quantity: 4, section: "mainboard" },
            { name: "Island", quantity: 6, section: "mainboard" },
            { name: "Mountain", quantity: 8, section: "mainboard" },
            // Sideboard - 15 cards
            { name: "Mystical Dispute", quantity: 3, section: "sideboard" },
            { name: "Engineered Explosives", quantity: 2, section: "sideboard" },
            { name: "Blood Moon", quantity: 2, section: "sideboard" },
            { name: "Flusterstorm", quantity: 2, section: "sideboard" },
            { name: "Dress Down", quantity: 2, section: "sideboard" },
            { name: "Unlicensed Hearse", quantity: 2, section: "sideboard" },
            { name: "Brotherhood's End", quantity: 2, section: "sideboard" }
          ]
        })
      }
    }]
  };
}

function generatePartialDeckResponse() {
  return {
    choices: [{
      message: {
        content: JSON.stringify({
          cards: [
            { name: "Lightning Bolt", quantity: 4, section: "mainboard" },
            { name: "Ragavan, Nimble Pilferer", quantity: 4, section: "mainboard" },
            { name: "Dragon's Rage Channeler", quantity: 4, section: "mainboard" },
            { name: "Counterspell", quantity: 4, section: "mainboard" },
            { name: "Island", quantity: 12, section: "mainboard" },
            { name: "Mountain", quantity: 12, section: "mainboard" }
          ]
        })
      }
    }]
  };
}

function generateDuplicateDeckResponse() {
  return {
    choices: [{
      message: {
        content: JSON.stringify({
          cards: [
            { name: "Lightning Bolt", quantity: 8, section: "mainboard" }, // Too many!
            { name: "Lightning Bolt", quantity: 4, section: "mainboard" }, // Duplicate
            { name: "Island", quantity: 20, section: "mainboard" },
            { name: "Mountain", quantity: 20, section: "mainboard" },
            { name: "Mystical Dispute", quantity: 20, section: "sideboard" } // Too many in side
          ]
        })
      }
    }]
  };
}

function generateIncompleteDeckResponse(cardCount: number) {
  const cards = [];
  for (let i = 0; i < cardCount; i++) {
    cards.push({
      name: `Test Card ${i}`,
      quantity: 1,
      section: "mainboard"
    });
  }
  return {
    choices: [{
      message: {
        content: JSON.stringify({ cards })
      }
    }]
  };
}

function generateMainboardOnlyResponse() {
  return {
    choices: [{
      message: {
        content: JSON.stringify({
          cards: [
            { name: "Lightning Bolt", quantity: 4, section: "mainboard" },
            { name: "Ragavan, Nimble Pilferer", quantity: 4, section: "mainboard" },
            { name: "Dragon's Rage Channeler", quantity: 4, section: "mainboard" },
            { name: "Murktide Regent", quantity: 4, section: "mainboard" },
            { name: "Counterspell", quantity: 4, section: "mainboard" },
            { name: "Island", quantity: 20, section: "mainboard" },
            { name: "Mountain", quantity: 20, section: "mainboard" }
          ]
        })
      }
    }]
  };
}

function generateOverlappingResponse() {
  return {
    choices: [{
      message: {
        content: JSON.stringify({
          cards: [
            { name: "Lightning Bolt", quantity: 4, section: "mainboard" },
            { name: "Lightning Bolt", quantity: 4, section: "mainboard" }, // Duplicate
            { name: "Ragavan, Nimble Pilferer", quantity: 4, section: "mainboard" },
            { name: "Island", quantity: 24, section: "mainboard" },
            { name: "Mountain", quantity: 24, section: "mainboard" },
            { name: "Mystical Dispute", quantity: 15, section: "sideboard" }
          ]
        })
      }
    }]
  };
}