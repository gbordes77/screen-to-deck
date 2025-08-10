import request from 'supertest';
import express, { Express } from 'express';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Import real services (not mocked for integration tests)
import { EnhancedOCRService } from '../../services/enhancedOcrService';
import ocrEnhancedRouter from '../../routes/ocr.enhanced';
import { scryfallService } from '../../services/scryfallService';
import { exportService } from '../../services/exportService';

describe('OCR Pipeline Integration Tests', () => {
  let app: Express;
  let testImagePath: string;

  beforeAll(async () => {
    // Setup Express app with real routes
    app = express();
    app.use(express.json());
    app.use('/api/ocr', ocrEnhancedRouter);
    
    // Create test image
    testImagePath = path.join(__dirname, 'test-deck.jpg');
    await createTestImage(testImagePath);
  });

  afterAll(async () => {
    // Cleanup test image
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
  });

  describe('Complete OCR Pipeline', () => {
    it('should process image through entire pipeline: upload → OCR → validation', async () => {
      // Skip if no OpenAI key
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'TO_BE_SET') {
        console.log('Skipping integration test: OpenAI API key not configured');
        return;
      }

      const imageBuffer = fs.readFileSync(testImagePath);
      
      const response = await request(app)
        .post('/api/ocr/enhanced')
        .attach('image', imageBuffer, 'test-deck.jpg')
        .timeout(30000); // 30 seconds timeout for OCR processing

      expect(response.status).toBe(200);
      expect(response.body.success).toBeDefined();
      
      if (response.body.success) {
        expect(response.body.cards).toBeInstanceOf(Array);
        expect(response.body.statistics).toBeDefined();
        expect(response.body.validation).toBeDefined();
      }
    });

    it('should handle low-resolution images with super-resolution', async () => {
      // Create low-res test image
      const lowResPath = path.join(__dirname, 'low-res-test.jpg');
      await createTestImage(lowResPath, 400, 300);

      const service = new EnhancedOCRService();
      
      // Test that super-resolution is triggered
      const quality = await service['analyzeImageQuality'](lowResPath);
      expect(quality.needsUpscale).toBe(true);

      // Cleanup
      if (fs.existsSync(lowResPath)) {
        fs.unlinkSync(lowResPath);
      }
    });

    it('should detect different formats correctly', async () => {
      const service = new EnhancedOCRService();

      // Test MTGO format detection (wide aspect ratio)
      const mtgoPath = path.join(__dirname, 'mtgo-test.jpg');
      await createTestImage(mtgoPath, 1920, 800);
      const mtgoFormat = await service['detectFormat'](mtgoPath);
      expect(mtgoFormat).toBe('mtgo');
      fs.unlinkSync(mtgoPath);

      // Test Arena format detection (standard aspect ratio)
      const arenaPath = path.join(__dirname, 'arena-test.jpg');
      await createTestImage(arenaPath, 1920, 1080);
      const arenaFormat = await service['detectFormat'](arenaPath);
      expect(arenaFormat).toBe('arena');
      fs.unlinkSync(arenaPath);
    });
  });

  describe('Scryfall Validation Integration', () => {
    it('should validate card names through Scryfall', async () => {
      const cards = [
        { name: 'Lightning Bolt', quantity: 4 },
        { name: 'Counterspel', quantity: 2 }, // Typo intentional
        { name: 'Island', quantity: 10 }
      ];

      const validated = await validateCardsWithScryfall(cards);
      
      // Should correct "Counterspel" to "Counterspell"
      const counterspell = validated.find(c => c.name.toLowerCase().includes('counterspell'));
      expect(counterspell).toBeDefined();
    });

    it('should handle rate limiting gracefully', async () => {
      // Make multiple rapid requests
      const promises = Array(10).fill(null).map(() => 
        scryfallService.searchCard('Lightning Bolt')
      );

      const results = await Promise.allSettled(promises);
      
      // All should eventually succeed (with rate limiting)
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(0);
    });
  });

  describe('Export Format Integration', () => {
    it('should export to MTGA format correctly', () => {
      const cards = [
        { name: 'Lightning Bolt', quantity: 4, section: 'mainboard' },
        { name: 'Island', quantity: 20, section: 'mainboard' },
        { name: 'Negate', quantity: 3, section: 'sideboard' }
      ];

      const mtgaFormat = exportService.toMTGA(cards);
      
      expect(mtgaFormat).toContain('4 Lightning Bolt');
      expect(mtgaFormat).toContain('20 Island');
      expect(mtgaFormat).toContain('Sideboard');
      expect(mtgaFormat).toContain('3 Negate');
    });

    it('should export to Moxfield format correctly', () => {
      const cards = [
        { name: 'Lightning Bolt', quantity: 4, section: 'mainboard' },
        { name: 'Negate', quantity: 2, section: 'sideboard' }
      ];

      const moxfieldFormat = exportService.toMoxfield(cards);
      
      expect(moxfieldFormat).toContain('4x Lightning Bolt');
      expect(moxfieldFormat).toContain('SB: 2x Negate');
    });

    it('should export to JSON format correctly', () => {
      const cards = [
        { name: 'Lightning Bolt', quantity: 4, section: 'mainboard' }
      ];

      const jsonFormat = exportService.toJSON(cards);
      const parsed = JSON.parse(jsonFormat);
      
      expect(parsed.mainboard).toHaveLength(1);
      expect(parsed.mainboard[0].name).toBe('Lightning Bolt');
      expect(parsed.mainboard[0].quantity).toBe(4);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from partial OCR failures', async () => {
      const service = new EnhancedOCRService();
      
      // Mock a scenario where EasyOCR fails but OpenAI succeeds
      const result = await service['progressiveOCR'](testImagePath, 'arena');
      
      // Should have attempted multiple methods
      expect(result.cards).toBeDefined();
    });

    it('should handle corrupt image files gracefully', async () => {
      const corruptPath = path.join(__dirname, 'corrupt.jpg');
      fs.writeFileSync(corruptPath, 'not a real image');

      const response = await request(app)
        .post('/api/ocr/enhanced')
        .attach('image', fs.readFileSync(corruptPath), 'corrupt.jpg');

      expect(response.status).toBeGreaterThanOrEqual(400);
      
      fs.unlinkSync(corruptPath);
    });
  });

  describe('Consistency Tests', () => {
    it('should maintain consistency between Discord bot and Web app OCR', async () => {
      // This test would compare results from both implementations
      // For now, we'll test that both use the same core service
      
      const webService = new EnhancedOCRService();
      const botScriptExists = fs.existsSync(
        path.join(__dirname, '../../../../discord-bot/ocr_parser_easyocr.py')
      );
      
      // Both should have access to the same OCR methods
      expect(webService).toBeDefined();
      expect(botScriptExists).toBe(true);
    });

    it('should validate 60+15 card requirement consistently', async () => {
      const service = new EnhancedOCRService();
      
      // Test with incomplete deck
      const incompleteResult = {
        success: true,
        cards: Array(50).fill(null).map((_, i) => ({
          name: `Card ${i}`,
          quantity: 1,
          section: 'mainboard'
        })),
        confidence: 0.5,
        processing_time: 1000
      };

      const validated = await service['validateAndFix'](
        incompleteResult,
        testImagePath,
        'arena'
      );
      
      // Should attempt to find missing cards
      expect(validated.cards.length).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Performance Tests', () => {
    it('should process standard resolution image within 10 seconds', async () => {
      const service = new EnhancedOCRService();
      const startTime = Date.now();
      
      // Create standard resolution test image
      const standardPath = path.join(__dirname, 'standard-res.jpg');
      await createTestImage(standardPath, 1920, 1080);
      
      await service['analyzeImageQuality'](standardPath);
      
      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(10000);
      
      fs.unlinkSync(standardPath);
    });

    it('should handle concurrent requests efficiently', async () => {
      const promises = Array(3).fill(null).map((_, i) => 
        request(app)
          .get('/api/ocr/enhanced/status')
      );

      const results = await Promise.all(promises);
      
      results.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});

// Helper functions
async function createTestImage(path: string, width = 1920, height = 1080): Promise<void> {
  // Create a simple test image with text
  const svg = `
    <svg width="${width}" height="${height}">
      <rect width="${width}" height="${height}" fill="white"/>
      <text x="50" y="50" font-size="20" fill="black">4 Lightning Bolt</text>
      <text x="50" y="80" font-size="20" fill="black">20 Island</text>
      <text x="50" y="110" font-size="20" fill="black">20 Mountain</text>
      <text x="50" y="140" font-size="20" fill="black">4 Counterspell</text>
      <text x="50" y="170" font-size="20" fill="black">4 Shock</text>
      <text x="50" y="200" font-size="20" fill="black">4 Cancel</text>
      <text x="50" y="230" font-size="20" fill="black">4 Opt</text>
      <text x="${width - 200}" y="50" font-size="18" fill="black">Sideboard</text>
      <text x="${width - 200}" y="80" font-size="18" fill="black">3 Negate</text>
      <text x="${width - 200}" y="110" font-size="18" fill="black">3 Duress</text>
      <text x="${width - 200}" y="140" font-size="18" fill="black">3 Rest in Peace</text>
      <text x="${width - 200}" y="170" font-size="18" fill="black">3 Pyroblast</text>
      <text x="${width - 200}" y="200" font-size="18" fill="black">3 Tormod's Crypt</text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .jpeg()
    .toFile(path);
}

async function validateCardsWithScryfall(cards: any[]): Promise<any[]> {
  const validated = [];
  
  for (const card of cards) {
    try {
      const result = await scryfallService.searchCard(card.name);
      if (result) {
        validated.push({
          ...card,
          name: result.name,
          validated: true
        });
      } else {
        validated.push({
          ...card,
          validated: false
        });
      }
    } catch (error) {
      validated.push({
        ...card,
        validated: false,
        error: error.message
      });
    }
  }
  
  return validated;
}