import { EnhancedOCRService } from '../enhancedOcrService';
import OpenAI from 'openai';
import fs from 'fs';
import sharp from 'sharp';
import { spawn } from 'child_process';
import path from 'path';

// Mock des modules externes
jest.mock('openai');
jest.mock('fs');
jest.mock('sharp');
jest.mock('child_process');

describe('EnhancedOCRService', () => {
  let service: EnhancedOCRService;
  let mockOpenAI: jest.Mocked<OpenAI>;
  
  beforeEach(() => {
    // Reset des mocks
    jest.clearAllMocks();
    
    // Configuration de base
    process.env.OPENAI_API_KEY = 'test-api-key';
    
    // Initialisation du service
    service = new EnhancedOCRService();
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  describe('processImage', () => {
    it('should process image successfully with complete deck (60+15)', async () => {
      // Mock image metadata
      const mockMetadata = { width: 1920, height: 1080 };
      const mockSharp = {
        metadata: jest.fn().mockResolvedValue(mockMetadata),
        resize: jest.fn().mockReturnThis(),
        png: jest.fn().mockReturnThis(),
        toFile: jest.fn().mockResolvedValue(undefined)
      };
      (sharp as jest.Mock).mockReturnValue(mockSharp);

      // Mock file system
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('test-image'));
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});

      // Mock OpenAI response avec 60 mainboard + 15 sideboard
      const mockOpenAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              mainboard: Array(60).fill(null).map((_, i) => ({
                name: `Card ${i + 1}`,
                quantity: 1
              })),
              sideboard: Array(15).fill(null).map((_, i) => ({
                name: `Sideboard Card ${i + 1}`,
                quantity: 1
              }))
            })
          }
        }]
      };

      // Mock OpenAI
      if (service['openai']) {
        service['openai'].chat = {
          completions: {
            create: jest.fn().mockResolvedValue(mockOpenAIResponse)
          }
        } as any;
      }

      const result = await service.processImage('/test/image.jpg');

      expect(result.success).toBe(true);
      expect(result.cards).toHaveLength(75);
      expect(result.cards.filter(c => c.section !== 'sideboard')).toHaveLength(60);
      expect(result.cards.filter(c => c.section === 'sideboard')).toHaveLength(15);
    });

    it('should apply super-resolution for low-quality images', async () => {
      // Mock low-res image
      const mockMetadata = { width: 800, height: 600 };
      const mockSharp = {
        metadata: jest.fn().mockResolvedValue(mockMetadata),
        resize: jest.fn().mockReturnThis(),
        png: jest.fn().mockReturnThis(),
        toFile: jest.fn().mockResolvedValue(undefined)
      };
      (sharp as jest.Mock).mockReturnValue(mockSharp);

      // Mock spawn pour Python script
      const mockSpawn = {
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            callback(0);
          }
        })
      };
      (spawn as jest.Mock).mockReturnValue(mockSpawn);

      const result = await service['applySuperResolution']('/test/low-res.jpg');

      expect(spawn).toHaveBeenCalledWith(
        'python3',
        expect.arrayContaining([expect.stringContaining('super_resolution_free.py')])
      );
    });

    it('should detect MTGO format correctly', async () => {
      const mockMetadata = { width: 1920, height: 800 }; // Wide aspect ratio
      const mockSharp = {
        metadata: jest.fn().mockResolvedValue(mockMetadata)
      };
      (sharp as jest.Mock).mockReturnValue(mockSharp);

      const format = await service['detectFormat']('/test/mtgo.jpg');
      
      expect(format).toBe('mtgo');
    });

    it('should detect Arena format by default', async () => {
      const mockMetadata = { width: 1920, height: 1080 };
      const mockSharp = {
        metadata: jest.fn().mockResolvedValue(mockMetadata)
      };
      (sharp as jest.Mock).mockReturnValue(mockSharp);

      const format = await service['detectFormat']('/test/arena.jpg');
      
      expect(format).toBe('arena');
    });

    it('should use never-give-up mode when cards are missing', async () => {
      // Mock incomplete result
      const incompleteCards = Array(50).fill(null).map((_, i) => ({
        name: `Card ${i + 1}`,
        quantity: 1,
        section: 'mainboard'
      }));

      // Mock OpenAI pour never-give-up
      const mockCompleteResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              mainboard: Array(60).fill(null).map((_, i) => ({
                name: `Card ${i + 1}`,
                quantity: 1
              })),
              sideboard: Array(15).fill(null).map((_, i) => ({
                name: `Sideboard Card ${i + 1}`,
                quantity: 1
              }))
            })
          }
        }]
      };

      if (service['openai']) {
        service['openai'].chat = {
          completions: {
            create: jest.fn()
              .mockResolvedValueOnce({ choices: [{ message: { content: '{}' } }] })
              .mockResolvedValueOnce(mockCompleteResponse)
          }
        } as any;
      }

      const result = await service['neverGiveUpMode']('/test/image.jpg', 'arena');

      expect(result.cards).toHaveLength(75);
      expect(result.warnings).toContain('Used never-give-up mode to ensure completeness');
    });

    it('should handle errors gracefully', async () => {
      (sharp as jest.Mock).mockImplementation(() => {
        throw new Error('Sharp error');
      });

      const result = await service.processImage('/test/error.jpg');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Sharp error');
    });
  });

  describe('progressiveOCR', () => {
    it('should try multiple OCR methods progressively', async () => {
      // Mock EasyOCR failure
      const mockSpawn = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') callback(1);
        })
      };
      (spawn as jest.Mock).mockReturnValue(mockSpawn);

      // Mock successful OpenAI
      const mockOpenAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              mainboard: Array(60).fill(null).map((_, i) => ({
                name: `Card ${i + 1}`,
                quantity: 1
              })),
              sideboard: []
            })
          }
        }]
      };

      if (service['openai']) {
        service['openai'].chat = {
          completions: {
            create: jest.fn().mockResolvedValue(mockOpenAIResponse)
          }
        } as any;
      }

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('test'));

      const result = await service['progressiveOCR']('/test/image.jpg', 'arena');

      expect(result.cards.length).toBeGreaterThan(0);
    });
  });

  describe('validateAndFix', () => {
    it('should return result as-is when counts are perfect', async () => {
      const perfectResult = {
        success: true,
        cards: [
          ...Array(60).fill(null).map((_, i) => ({
            name: `Card ${i + 1}`,
            quantity: 1,
            section: 'mainboard'
          })),
          ...Array(15).fill(null).map((_, i) => ({
            name: `Sideboard ${i + 1}`,
            quantity: 1,
            section: 'sideboard'
          }))
        ],
        confidence: 0.95,
        processing_time: 1000
      };

      const result = await service['validateAndFix'](
        perfectResult,
        '/test/image.jpg',
        'arena'
      );

      expect(result).toBe(perfectResult);
    });

    it('should try MTGO fix for incomplete MTGO decks', async () => {
      const incompleteResult = {
        success: true,
        cards: Array(50).fill(null).map((_, i) => ({
          name: `Card ${i + 1}`,
          quantity: 1,
          section: 'mainboard'
        })),
        confidence: 0.7,
        processing_time: 1000
      };

      // Mock MTGO fix script
      const mockSpawn = {
        stdout: { on: jest.fn((event, callback) => {
          if (event === 'data') {
            callback(JSON.stringify({
              mainboard: Array(60).fill(null).map((_, i) => ({
                name: `Card ${i + 1}`,
                quantity: 1
              })),
              sideboard: []
            }));
          }
        })},
        on: jest.fn((event, callback) => {
          if (event === 'close') callback(0);
        })
      };
      (spawn as jest.Mock).mockReturnValue(mockSpawn);
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const result = await service['validateAndFix'](
        incompleteResult,
        '/test/mtgo.jpg',
        'mtgo'
      );

      expect(result.cards.length).toBeGreaterThanOrEqual(60);
    });
  });

  describe('parseOpenAIResponse', () => {
    it('should parse valid JSON response correctly', () => {
      const content = `
        Here are the cards:
        {
          "mainboard": [
            {"name": "Lightning Bolt", "quantity": 4},
            {"name": "Island", "quantity": 10}
          ],
          "sideboard": [
            {"name": "Negate", "quantity": 2}
          ]
        }
      `;

      const cards = service['parseOpenAIResponse'](content);

      expect(cards).toHaveLength(3);
      expect(cards[0]).toEqual({
        name: 'Lightning Bolt',
        quantity: 4,
        section: 'mainboard'
      });
      expect(cards[2].section).toBe('sideboard');
    });

    it('should handle malformed JSON gracefully', () => {
      const content = 'This is not valid JSON';
      const cards = service['parseOpenAIResponse'](content);
      expect(cards).toEqual([]);
    });
  });

  describe('deduplicateCards', () => {
    it('should merge duplicate cards correctly', () => {
      const cards = [
        { name: 'Island', quantity: 2, section: 'mainboard' },
        { name: 'Island', quantity: 3, section: 'mainboard' },
        { name: 'Island', quantity: 1, section: 'sideboard' },
        { name: 'Mountain', quantity: 4, section: 'mainboard' }
      ];

      const deduplicated = service['deduplicateCards'](cards);

      expect(deduplicated).toHaveLength(3);
      
      const mainIsland = deduplicated.find(
        c => c.name === 'Island' && c.section === 'mainboard'
      );
      expect(mainIsland?.quantity).toBe(3); // Max of 2 and 3
      
      const sideIsland = deduplicated.find(
        c => c.name === 'Island' && c.section === 'sideboard'
      );
      expect(sideIsland?.quantity).toBe(1);
    });
  });

  describe('tryEasyOCR', () => {
    it('should handle EasyOCR script not found', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(
        service['tryEasyOCR']('/test/image.jpg', false)
      ).rejects.toThrow('EasyOCR script not found');
    });

    it('should parse EasyOCR output correctly', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      
      const mockOutput = JSON.stringify({
        cards: [
          { name: 'Lightning Bolt', quantity: 4, section: 'mainboard' },
          { name: 'Counterspell', quantity: 2, section: 'sideboard' }
        ]
      });

      const mockSpawn = {
        stdout: { on: jest.fn((event, callback) => {
          if (event === 'data') callback(mockOutput);
        })},
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') callback(0);
        })
      };
      (spawn as jest.Mock).mockReturnValue(mockSpawn);

      const result = await service['tryEasyOCR']('/test/image.jpg', false);

      expect(result.success).toBe(true);
      expect(result.cards).toHaveLength(2);
    });
  });

  describe('tryOpenAIVision', () => {
    it('should throw error when OpenAI is not configured', async () => {
      const serviceNoAPI = new EnhancedOCRService();
      delete process.env.OPENAI_API_KEY;

      await expect(
        serviceNoAPI['tryOpenAIVision']('/test/image.jpg', 'arena')
      ).rejects.toThrow('OpenAI not configured');
    });

    it('should process OpenAI Vision response correctly', async () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('test-image'));

      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              mainboard: [
                { name: 'Lightning Bolt', quantity: 4 }
              ],
              sideboard: []
            })
          }
        }]
      };

      if (service['openai']) {
        service['openai'].chat = {
          completions: {
            create: jest.fn().mockResolvedValue(mockResponse)
          }
        } as any;
      }

      const result = await service['tryOpenAIVision']('/test/image.jpg', 'arena');

      expect(result.success).toBe(true);
      expect(result.confidence).toBe(0.95);
      expect(result.cards).toHaveLength(1);
    });
  });
});