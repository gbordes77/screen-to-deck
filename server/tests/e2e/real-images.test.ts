/**
 * Real Image End-to-End Test Suite
 * Tests the OCR service with actual MTG images to validate 60+15 guarantee
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { EnhancedOCRServiceGuaranteed } from '../../src/services/enhancedOcrServiceGuaranteed';
import * as fs from 'fs';
import * as path from 'path';

interface TestImageMetadata {
  file: string;
  expectedMain: number;
  expectedSide: number;
  description: string;
}

interface CardResult {
  name: string;
  quantity: number;
  section?: string;
}

describe('Real Image OCR Tests - Web Service', () => {
  let ocrService: EnhancedOCRServiceGuaranteed;
  const testImagesDir = path.join(__dirname, '../test-images');
  const metadataPath = path.join(testImagesDir, 'test-images-metadata.json');
  let testImages: TestImageMetadata[] = [];
  const performanceMetrics: any[] = [];

  beforeAll(async () => {
    // Initialize service
    ocrService = new EnhancedOCRServiceGuaranteed();
    
    // Load test image metadata
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      testImages = metadata.images;
    } else {
      throw new Error('Test images not found. Run create-mtg-test-images.js first.');
    }
    
    // Ensure OpenAI API key is set (use real key for actual testing)
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'test-key') {
      console.warn('⚠️ Using mock API key. Set OPENAI_API_KEY for real OCR testing.');
    }
  });

  afterAll(() => {
    // Generate performance report
    console.log('\n📊 Performance Metrics:');
    console.log('================================');
    performanceMetrics.forEach(metric => {
      console.log(`📷 ${metric.image}:`);
      console.log(`   ⏱️ Time: ${metric.duration}ms`);
      console.log(`   📦 Memory: ${metric.memory}MB`);
      console.log(`   ✅ Mainboard: ${metric.mainCount} cards`);
      console.log(`   📋 Sideboard: ${metric.sideCount} cards`);
      console.log(`   🎯 Success: ${metric.success ? '✓' : '✗'}`);
    });
    
    const avgTime = performanceMetrics.reduce((sum, m) => sum + m.duration, 0) / performanceMetrics.length;
    const successRate = (performanceMetrics.filter(m => m.success).length / performanceMetrics.length) * 100;
    
    console.log('\n📈 Summary:');
    console.log(`   Average processing time: ${avgTime.toFixed(0)}ms`);
    console.log(`   Success rate: ${successRate.toFixed(1)}%`);
    console.log(`   All tests guarantee 60+15: ${successRate === 100 ? '✅ YES' : '❌ NO'}`);
  });

  /**
   * Helper function to count cards by section
   */
  function countCards(cards: CardResult[]): { mainboard: number; sideboard: number } {
    const mainboard = cards
      .filter(c => c.section !== 'sideboard')
      .reduce((sum, c) => sum + c.quantity, 0);
    
    const sideboard = cards
      .filter(c => c.section === 'sideboard')
      .reduce((sum, c) => sum + c.quantity, 0);
    
    return { mainboard, sideboard };
  }

  /**
   * Test each real image
   */
  describe('Individual Image Tests', () => {
    testImages.forEach((imageData) => {
      test(`Process ${imageData.file}: ${imageData.description}`, async () => {
        const imagePath = path.join(testImagesDir, imageData.file);
        
        // Skip if image doesn't exist
        if (!fs.existsSync(imagePath)) {
          console.warn(`⚠️ Image not found: ${imagePath}`);
          return;
        }
        
        const startTime = Date.now();
        const startMemory = process.memoryUsage().heapUsed / 1024 / 1024;
        
        // Process image
        const result = await ocrService.processImage(imagePath);
        
        const duration = Date.now() - startTime;
        const endMemory = process.memoryUsage().heapUsed / 1024 / 1024;
        const memoryUsed = endMemory - startMemory;
        
        // Count cards
        const counts = countCards(result.cards);
        
        // Validate guarantee
        const success = counts.mainboard === 60 && counts.sideboard === 15;
        
        // Store metrics
        performanceMetrics.push({
          image: imageData.file,
          duration,
          memory: memoryUsed.toFixed(2),
          mainCount: counts.mainboard,
          sideCount: counts.sideboard,
          success
        });
        
        // Assertions
        expect(counts.mainboard).toBe(60);
        expect(counts.sideboard).toBe(15);
        expect(result.cards.length).toBeGreaterThan(0);
        
        // Additional validations
        expect(result.metadata).toBeDefined();
        expect(result.metadata.totalCards).toBe(75);
        expect(result.metadata.processingTime).toBeDefined();
        
        // Log details for debugging
        console.log(`\n✅ ${imageData.file}:`);
        console.log(`   Cards detected: ${result.cards.length} unique`);
        console.log(`   Mainboard: ${counts.mainboard}, Sideboard: ${counts.sideboard}`);
        console.log(`   Processing time: ${duration}ms`);
        
        // Performance assertions
        expect(duration).toBeLessThan(5000); // Should process in under 5 seconds
      }, 10000); // 10 second timeout per test
    });
  });

  /**
   * Critical edge case tests
   */
  describe('Edge Case Handling', () => {
    test('Empty image returns emergency deck (60+15)', async () => {
      const imagePath = path.join(testImagesDir, 'empty-image.png');
      
      if (!fs.existsSync(imagePath)) {
        console.warn('Empty image test skipped - file not found');
        return;
      }
      
      const result = await ocrService.processImage(imagePath);
      const counts = countCards(result.cards);
      
      expect(counts.mainboard).toBe(60);
      expect(counts.sideboard).toBe(15);
      
      // Should use emergency fallback
      expect(result.metadata.usedFallback).toBe(true);
    });

    test('Partial deck gets padded to 60+15', async () => {
      const imagePath = path.join(testImagesDir, 'partial-deck.png');
      
      if (!fs.existsSync(imagePath)) {
        console.warn('Partial deck test skipped - file not found');
        return;
      }
      
      const result = await ocrService.processImage(imagePath);
      const counts = countCards(result.cards);
      
      expect(counts.mainboard).toBe(60);
      expect(counts.sideboard).toBe(15);
      
      // Check that lands were added for padding
      const lands = result.cards.filter(c => 
        c.name.includes('Mountain') || 
        c.name.includes('Island') || 
        c.name.includes('Swamp') ||
        c.name.includes('Plains') ||
        c.name.includes('Forest')
      );
      expect(lands.length).toBeGreaterThan(0);
    });

    test('Oversized deck gets trimmed to 60+15', async () => {
      const imagePath = path.join(testImagesDir, 'oversized-deck.png');
      
      if (!fs.existsSync(imagePath)) {
        console.warn('Oversized deck test skipped - file not found');
        return;
      }
      
      const result = await ocrService.processImage(imagePath);
      const counts = countCards(result.cards);
      
      expect(counts.mainboard).toBe(60);
      expect(counts.sideboard).toBe(15);
      
      // Should have trimmed excess cards
      expect(result.metadata.trimmedCards).toBeGreaterThan(0);
    });

    test('Low quality image still returns 60+15', async () => {
      const imagePath = path.join(testImagesDir, 'low-quality.jpg');
      
      if (!fs.existsSync(imagePath)) {
        console.warn('Low quality image test skipped - file not found');
        return;
      }
      
      const result = await ocrService.processImage(imagePath);
      const counts = countCards(result.cards);
      
      expect(counts.mainboard).toBe(60);
      expect(counts.sideboard).toBe(15);
    });
  });

  /**
   * Performance and reliability tests
   */
  describe('Performance Tests', () => {
    test('All images process within 5 seconds', async () => {
      const promises = testImages.map(async (imageData) => {
        const imagePath = path.join(testImagesDir, imageData.file);
        if (!fs.existsSync(imagePath)) return null;
        
        const start = Date.now();
        await ocrService.processImage(imagePath);
        return Date.now() - start;
      });
      
      const times = (await Promise.all(promises)).filter(t => t !== null) as number[];
      const maxTime = Math.max(...times);
      
      expect(maxTime).toBeLessThan(5000);
    });

    test('Memory usage stays reasonable', async () => {
      const imagePath = path.join(testImagesDir, 'arena-standard.png');
      if (!fs.existsSync(imagePath)) return;
      
      const startMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      
      // Process multiple times to check for memory leaks
      for (let i = 0; i < 5; i++) {
        await ocrService.processImage(imagePath);
      }
      
      const endMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      const memoryIncrease = endMemory - startMemory;
      
      // Should not increase memory by more than 100MB after 5 runs
      expect(memoryIncrease).toBeLessThan(100);
    });
  });

  /**
   * Consistency tests
   */
  describe('Consistency Tests', () => {
    test('Same image returns consistent results', async () => {
      const imagePath = path.join(testImagesDir, 'arena-standard.png');
      if (!fs.existsSync(imagePath)) return;
      
      const results = [];
      for (let i = 0; i < 3; i++) {
        const result = await ocrService.processImage(imagePath);
        results.push(countCards(result.cards));
      }
      
      // All runs should return exactly 60+15
      results.forEach(counts => {
        expect(counts.mainboard).toBe(60);
        expect(counts.sideboard).toBe(15);
      });
    });
  });
});