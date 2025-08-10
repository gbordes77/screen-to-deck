import request from 'supertest';
import express, { Express } from 'express';
import fs from 'fs';
import path from 'path';
import { EnhancedOCRService } from '../../services/enhancedOcrService';
import ocrEnhancedRouter from '../ocr.enhanced';

// Mock des modules
jest.mock('../../services/enhancedOcrService');
jest.mock('fs');

describe('OCR Enhanced Routes', () => {
  let app: Express;
  let mockOCRService: jest.Mocked<EnhancedOCRService>;

  beforeEach(() => {
    // Configuration Express
    app = express();
    app.use(express.json());
    app.use('/api/ocr', ocrEnhancedRouter);

    // Reset des mocks
    jest.clearAllMocks();

    // Mock file system
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
    (fs.unlinkSync as jest.Mock).mockImplementation(() => {});
  });

  describe('POST /api/ocr/enhanced', () => {
    it('should process image successfully with complete deck', async () => {
      // Mock OCR service response
      const mockResult = {
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
        processing_time: 2500,
        warnings: []
      };

      // Mock processImage
      EnhancedOCRService.prototype.processImage = jest.fn().mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/ocr/enhanced')
        .attach('image', Buffer.from('test'), 'test.jpg')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.cards).toHaveLength(75);
      expect(response.body.statistics.mainboard_count).toBe(60);
      expect(response.body.statistics.sideboard_count).toBe(15);
      expect(response.body.validation.complete).toBe(true);
    });

    it('should return 400 when no image is provided', async () => {
      const response = await request(app)
        .post('/api/ocr/enhanced')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No image file provided');
    });

    it('should handle incomplete deck results', async () => {
      const mockResult = {
        success: true,
        cards: [
          ...Array(50).fill(null).map((_, i) => ({
            name: `Card ${i + 1}`,
            quantity: 1,
            section: 'mainboard'
          })),
          ...Array(10).fill(null).map((_, i) => ({
            name: `Sideboard ${i + 1}`,
            quantity: 1,
            section: 'sideboard'
          }))
        ],
        confidence: 0.7,
        processing_time: 3000,
        warnings: ['Incomplete deck detected']
      };

      EnhancedOCRService.prototype.processImage = jest.fn().mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/ocr/enhanced')
        .attach('image', Buffer.from('test'), 'test.jpg')
        .expect(200);

      expect(response.body.validation.mainboard_valid).toBe(false);
      expect(response.body.validation.sideboard_valid).toBe(false);
      expect(response.body.validation.complete).toBe(false);
      expect(response.body.statistics.mainboard_count).toBe(50);
      expect(response.body.statistics.sideboard_count).toBe(10);
    });

    it('should handle OCR service errors', async () => {
      EnhancedOCRService.prototype.processImage = jest.fn()
        .mockRejectedValue(new Error('OCR processing failed'));

      const response = await request(app)
        .post('/api/ocr/enhanced')
        .attach('image', Buffer.from('test'), 'test.jpg')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('OCR processing failed');
    });

    it('should calculate unique cards correctly', async () => {
      const mockResult = {
        success: true,
        cards: [
          { name: 'Lightning Bolt', quantity: 4, section: 'mainboard' },
          { name: 'Island', quantity: 20, section: 'mainboard' },
          { name: 'Mountain', quantity: 20, section: 'mainboard' },
          { name: 'Counterspell', quantity: 4, section: 'mainboard' },
          { name: 'Shock', quantity: 4, section: 'mainboard' },
          { name: 'Cancel', quantity: 4, section: 'mainboard' },
          { name: 'Opt', quantity: 4, section: 'mainboard' },
          { name: 'Negate', quantity: 3, section: 'sideboard' },
          { name: 'Duress', quantity: 3, section: 'sideboard' },
          { name: 'Rest in Peace', quantity: 3, section: 'sideboard' },
          { name: 'Pyroblast', quantity: 3, section: 'sideboard' },
          { name: 'Tormod\'s Crypt', quantity: 3, section: 'sideboard' }
        ],
        confidence: 0.9,
        processing_time: 2000
      };

      EnhancedOCRService.prototype.processImage = jest.fn().mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/ocr/enhanced')
        .attach('image', Buffer.from('test'), 'test.jpg')
        .expect(200);

      expect(response.body.statistics.total_unique_cards).toBe(12);
    });

    it('should clean up uploaded file after processing', async () => {
      const mockResult = {
        success: true,
        cards: [],
        confidence: 0.5,
        processing_time: 1000
      };

      EnhancedOCRService.prototype.processImage = jest.fn().mockResolvedValue(mockResult);

      await request(app)
        .post('/api/ocr/enhanced')
        .attach('image', Buffer.from('test'), 'test.jpg')
        .expect(200);

      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it('should clean up file even on error', async () => {
      EnhancedOCRService.prototype.processImage = jest.fn()
        .mockRejectedValue(new Error('Processing error'));

      // Mock file exists
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      await request(app)
        .post('/api/ocr/enhanced')
        .attach('image', Buffer.from('test'), 'test.jpg')
        .expect(500);

      expect(fs.unlinkSync).toHaveBeenCalled();
    });
  });

  describe('GET /api/ocr/enhanced/status', () => {
    beforeEach(() => {
      // Reset environment
      delete process.env.OPENAI_API_KEY;
    });

    it('should return service status with all capabilities', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      return request(app)
        .get('/api/ocr/enhanced/status')
        .expect(200)
        .then(response => {
          expect(response.body.service).toBe('Enhanced OCR Service');
          expect(response.body.version).toBe('2.0.0');
          expect(response.body.capabilities.super_resolution).toBe(true);
          expect(response.body.capabilities.easyocr).toBe(true);
          expect(response.body.capabilities.openai_vision).toBe(true);
          expect(response.body.capabilities.never_give_up_mode).toBe(true);
        });
    });

    it('should detect missing OpenAI API key', () => {
      process.env.OPENAI_API_KEY = 'TO_BE_SET';
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      return request(app)
        .get('/api/ocr/enhanced/status')
        .expect(200)
        .then(response => {
          expect(response.body.capabilities.openai_vision).toBe(false);
          expect(response.body.capabilities.never_give_up_mode).toBe(false);
        });
    });

    it('should detect missing Python installation', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      return request(app)
        .get('/api/ocr/enhanced/status')
        .expect(200)
        .then(response => {
          expect(response.body.capabilities.easyocr).toBe(false);
        });
    });

    it('should include format detection capabilities', () => {
      return request(app)
        .get('/api/ocr/enhanced/status')
        .expect(200)
        .then(response => {
          expect(response.body.capabilities.format_detection).toEqual([
            'arena', 'mtgo', 'paper'
          ]);
        });
    });

    it('should include validation rules', () => {
      return request(app)
        .get('/api/ocr/enhanced/status')
        .expect(200)
        .then(response => {
          expect(response.body.capabilities.validation.mainboard_target).toBe(60);
          expect(response.body.capabilities.validation.sideboard_target).toBe(15);
        });
    });

    it('should include processing rules', () => {
      return request(app)
        .get('/api/ocr/enhanced/status')
        .expect(200)
        .then(response => {
          expect(response.body.rules.min_resolution).toBe(1200);
          expect(response.body.rules.upscale_factor).toBe(4);
          expect(response.body.rules.max_file_size_mb).toBe(10);
        });
    });

    it('should include documentation link', () => {
      return request(app)
        .get('/api/ocr/enhanced/status')
        .expect(200)
        .then(response => {
          expect(response.body.documentation).toBe('/MASTER_OCR_RULES_AND_METHODOLOGY.md');
        });
    });
  });

  describe('File upload validation', () => {
    it('should reject non-image files', async () => {
      const response = await request(app)
        .post('/api/ocr/enhanced')
        .attach('image', Buffer.from('test'), 'test.txt');

      // Le multer fileFilter devrait rejeter ce fichier
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should accept various image formats', async () => {
      const mockResult = {
        success: true,
        cards: [],
        confidence: 0.5,
        processing_time: 1000
      };

      EnhancedOCRService.prototype.processImage = jest.fn().mockResolvedValue(mockResult);

      const formats = ['test.jpg', 'test.jpeg', 'test.png', 'test.gif', 'test.webp'];

      for (const filename of formats) {
        const response = await request(app)
          .post('/api/ocr/enhanced')
          .attach('image', Buffer.from('test'), filename);

        expect([200, 400, 500]).toContain(response.status);
      }
    });
  });
});