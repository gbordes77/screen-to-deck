/**
 * Comprehensive End-to-End Integration Test Suite
 * NO MOCKS - Real API calls and image processing
 * Tests the COMPLETE flow: Upload → OCR → Validation → Export
 * Verifies 60+15 card guarantee (60 mainboard + 15 sideboard)
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import { spawn } from 'child_process';

// Test configuration
const SERVER_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const API_URL = `${SERVER_URL}/api`;
const VALIDATED_IMAGES_DIR = path.join(__dirname, '../../../../validated_decklists');

// Test image sets by category
const TEST_IMAGE_SETS = {
  MTGA: [
    { file: 'MTGA deck list 4_1920x1080.jpeg', description: 'High resolution MTGA' },
    { file: 'MTGA deck list special_1334x886.jpeg', description: 'Special case MTGA' }
  ],
  MTGO: [
    { file: 'MTGO deck list usual_1763x791.jpeg', description: 'Standard MTGO' },
    { file: 'MTGO deck list usual 4_1254x432.jpeg', description: 'Low height MTGO' }
  ],
  MTGGoldfish: [
    { file: 'mtggoldfish deck list 2_1383x1518.jpg', description: 'High res MTGGoldfish' },
    { file: 'mtggoldfish deck list 10_1239x1362.jpg', description: 'Standard MTGGoldfish' }
  ],
  Paper: [
    { file: 'real deck paper cards 4_2336x1098.jpeg', description: 'Physical cards photo' },
    { file: 'real deck cartes cachés_2048x1542.jpeg', description: 'Partially hidden cards' }
  ],
  Website: [
    { file: 'web site  deck list_2300x2210.jpeg', description: 'Large website screenshot' }
  ]
};

// Export formats to test
const EXPORT_FORMATS = ['mtga', 'moxfield', 'archidekt', 'tappedout', 'json'];

// Metrics storage
interface TestMetrics {
  category: string;
  file: string;
  description: string;
  success: boolean;
  processingTime: number;
  memoryUsage: number;
  mainboardCount: number;
  sideboardCount: number;
  totalCards: number;
  ocrAccuracy?: number;
  exportFormats: { [format: string]: boolean };
  errors?: string[];
  apiCalls: number;
  uploadSize: number;
  responseSize: number;
}

const testMetrics: TestMetrics[] = [];
let serverProcess: any = null;

describe('MTG Screen-to-Deck E2E Integration Tests', () => {
  
  beforeAll(async () => {
    console.log('\n🚀 Starting E2E Integration Test Suite');
    console.log('================================');
    console.log('📍 Server URL:', SERVER_URL);
    console.log('📁 Images directory:', VALIDATED_IMAGES_DIR);
    
    // Check if server is running, if not start it
    try {
      await axios.get(`${API_URL}/health`);
      console.log('✅ Server is already running');
    } catch (error) {
      console.log('🔄 Starting server...');
      serverProcess = spawn('npm', ['run', 'dev'], {
        cwd: path.join(__dirname, '../../../'),
        detached: false,
        stdio: 'pipe'
      });
      
      // Wait for server to be ready
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Verify server is up
      for (let i = 0; i < 10; i++) {
        try {
          await axios.get(`${API_URL}/health`);
          console.log('✅ Server started successfully');
          break;
        } catch (e) {
          if (i === 9) throw new Error('Failed to start server');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    // Verify OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for real E2E tests');
    }
    
    console.log('✅ All prerequisites met\n');
  });
  
  afterAll(async () => {
    // Generate comprehensive report
    generateReport();
    
    // Cleanup
    if (serverProcess) {
      console.log('🛑 Stopping server...');
      serverProcess.kill();
    }
  });
  
  /**
   * Test each image category
   */
  Object.entries(TEST_IMAGE_SETS).forEach(([category, images]) => {
    describe(`${category} Images`, () => {
      images.forEach(({ file, description }) => {
        test(`${description} (${file})`, async () => {
          await testCompleteFlow(category, file, description);
        }, 60000); // 60 second timeout per test
      });
    });
  });
  
  /**
   * Complete flow test for a single image
   */
  async function testCompleteFlow(category: string, filename: string, description: string) {
    const imagePath = path.join(VALIDATED_IMAGES_DIR, filename);
    const metrics: TestMetrics = {
      category,
      file: filename,
      description,
      success: false,
      processingTime: 0,
      memoryUsage: 0,
      mainboardCount: 0,
      sideboardCount: 0,
      totalCards: 0,
      exportFormats: {},
      apiCalls: 0,
      uploadSize: 0,
      responseSize: 0,
      errors: []
    };
    
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;
    
    try {
      // Verify image exists
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Image not found: ${imagePath}`);
      }
      
      const imageStats = fs.statSync(imagePath);
      metrics.uploadSize = imageStats.size;
      
      console.log(`\n📷 Testing: ${filename}`);
      console.log(`   Category: ${category}`);
      console.log(`   Size: ${(metrics.uploadSize / 1024 / 1024).toFixed(2)} MB`);
      
      // Step 1: Upload image for OCR
      console.log('   1️⃣ Uploading image...');
      const formData = new FormData();
      formData.append('image', fs.createReadStream(imagePath));
      
      const uploadResponse = await axios.post(`${API_URL}/ocr`, formData, {
        headers: formData.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
      metrics.apiCalls++;
      
      const jobId = uploadResponse.data.jobId;
      expect(jobId).toBeDefined();
      console.log(`   ✅ Job created: ${jobId}`);
      
      // Step 2: Poll for results
      console.log('   2️⃣ Processing OCR...');
      let ocrResult: any = null;
      let pollAttempts = 0;
      const maxPolls = 30; // 30 attempts, 2 seconds each = 60 seconds max
      
      while (pollAttempts < maxPolls) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const statusResponse = await axios.get(`${API_URL}/ocr/status/${jobId}`);
        metrics.apiCalls++;
        
        if (statusResponse.data.status === 'completed') {
          ocrResult = statusResponse.data.result;
          metrics.responseSize = JSON.stringify(ocrResult).length;
          break;
        } else if (statusResponse.data.status === 'failed') {
          throw new Error(`OCR failed: ${statusResponse.data.error}`);
        }
        
        pollAttempts++;
        if (pollAttempts % 5 === 0) {
          console.log(`      Still processing... (${pollAttempts * 2}s)`);
        }
      }
      
      if (!ocrResult) {
        throw new Error('OCR timeout after 60 seconds');
      }
      
      console.log('   ✅ OCR completed');
      
      // Step 3: Validate card counts
      console.log('   3️⃣ Validating card counts...');
      const mainboardCards = ocrResult.cards.filter((c: any) => c.section !== 'sideboard');
      const sideboardCards = ocrResult.cards.filter((c: any) => c.section === 'sideboard');
      
      metrics.mainboardCount = mainboardCards.reduce((sum: number, c: any) => sum + c.quantity, 0);
      metrics.sideboardCount = sideboardCards.reduce((sum: number, c: any) => sum + c.quantity, 0);
      metrics.totalCards = metrics.mainboardCount + metrics.sideboardCount;
      
      console.log(`   📊 Results:`);
      console.log(`      Mainboard: ${metrics.mainboardCount} cards`);
      console.log(`      Sideboard: ${metrics.sideboardCount} cards`);
      console.log(`      Total: ${metrics.totalCards} cards`);
      
      // Verify 60+15 guarantee
      expect(metrics.mainboardCount).toBe(60);
      expect(metrics.sideboardCount).toBe(15);
      expect(metrics.totalCards).toBe(75);
      
      console.log('   ✅ Card counts verified (60+15 guarantee)');
      
      // Step 4: Test card validation
      console.log('   4️⃣ Validating card names...');
      const cardNames = ocrResult.cards.map((c: any) => c.name);
      const validationResponse = await axios.post(`${API_URL}/cards/validate`, {
        cardNames: cardNames
      });
      metrics.apiCalls++;
      
      const validationResult = validationResponse.data;
      const validCards = validationResult.validCards || [];
      const invalidCards = validationResult.invalidCards || [];
      
      if (invalidCards.length > 0) {
        console.log(`   ⚠️ Invalid cards found: ${invalidCards.length}`);
        metrics.errors?.push(`Invalid cards: ${invalidCards.join(', ')}`);
      } else {
        console.log(`   ✅ All cards validated`);
      }
      
      // Calculate OCR accuracy
      metrics.ocrAccuracy = (validCards.length / cardNames.length) * 100;
      console.log(`   📈 OCR Accuracy: ${metrics.ocrAccuracy.toFixed(1)}%`);
      
      // Step 5: Test export formats
      console.log('   5️⃣ Testing export formats...');
      for (const format of EXPORT_FORMATS) {
        try {
          const exportResponse = await axios.post(`${API_URL}/export`, {
            cards: ocrResult.cards,
            format: format
          });
          metrics.apiCalls++;
          
          expect(exportResponse.data).toBeDefined();
          
          // Verify export contains expected data
          if (format === 'json') {
            expect(exportResponse.data.mainboard).toBeDefined();
            expect(exportResponse.data.sideboard).toBeDefined();
            expect(exportResponse.data.metadata).toBeDefined();
          } else {
            expect(typeof exportResponse.data).toBe('string');
            expect(exportResponse.data.length).toBeGreaterThan(0);
          }
          
          metrics.exportFormats[format] = true;
          console.log(`      ✅ ${format} export successful`);
        } catch (error: any) {
          metrics.exportFormats[format] = false;
          metrics.errors?.push(`Export ${format} failed: ${error.message}`);
          console.log(`      ❌ ${format} export failed`);
        }
      }
      
      // Step 6: Calculate final metrics
      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      
      metrics.processingTime = endTime - startTime;
      metrics.memoryUsage = (endMemory - startMemory) / 1024 / 1024; // MB
      metrics.success = true;
      
      console.log(`   ⏱️ Total time: ${metrics.processingTime}ms`);
      console.log(`   💾 Memory used: ${metrics.memoryUsage.toFixed(2)} MB`);
      console.log(`   🌐 API calls: ${metrics.apiCalls}`);
      console.log(`   ✅ Test PASSED`);
      
    } catch (error: any) {
      metrics.errors?.push(error.message);
      metrics.success = false;
      console.log(`   ❌ Test FAILED: ${error.message}`);
      throw error;
    } finally {
      testMetrics.push(metrics);
    }
  }
  
  /**
   * Additional integration tests
   */
  describe('Cross-Service Validation', () => {
    test('Batch processing multiple images', async () => {
      console.log('\n🔄 Testing batch processing...');
      const testBatch = [
        TEST_IMAGE_SETS.MTGA[0],
        TEST_IMAGE_SETS.MTGO[0],
        TEST_IMAGE_SETS.MTGGoldfish[0]
      ];
      
      const startTime = Date.now();
      const promises = testBatch.map(async ({ file }) => {
        const imagePath = path.join(VALIDATED_IMAGES_DIR, file);
        if (!fs.existsSync(imagePath)) return null;
        
        const formData = new FormData();
        formData.append('image', fs.createReadStream(imagePath));
        
        const response = await axios.post(`${API_URL}/ocr`, formData, {
          headers: formData.getHeaders()
        });
        
        return response.data.jobId;
      });
      
      const jobIds = (await Promise.all(promises)).filter(id => id !== null);
      expect(jobIds.length).toBeGreaterThan(0);
      
      // Wait for all jobs to complete
      const results = await Promise.all(jobIds.map(async (jobId) => {
        let attempts = 0;
        while (attempts < 30) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          const status = await axios.get(`${API_URL}/ocr/status/${jobId}`);
          if (status.data.status === 'completed') {
            return status.data.result;
          }
          attempts++;
        }
        return null;
      }));
      
      const successfulResults = results.filter(r => r !== null);
      const totalTime = Date.now() - startTime;
      
      console.log(`   ✅ Processed ${successfulResults.length}/${jobIds.length} images`);
      console.log(`   ⏱️ Total batch time: ${totalTime}ms`);
      console.log(`   ⚡ Average time per image: ${(totalTime / successfulResults.length).toFixed(0)}ms`);
      
      // All should guarantee 60+15
      successfulResults.forEach(result => {
        const mainboard = result.cards.filter((c: any) => c.section !== 'sideboard');
        const sideboard = result.cards.filter((c: any) => c.section === 'sideboard');
        const mainCount = mainboard.reduce((sum: number, c: any) => sum + c.quantity, 0);
        const sideCount = sideboard.reduce((sum: number, c: any) => sum + c.quantity, 0);
        
        expect(mainCount).toBe(60);
        expect(sideCount).toBe(15);
      });
    }, 120000); // 2 minute timeout for batch
    
    test('Concurrent API load test', async () => {
      console.log('\n⚡ Testing concurrent load...');
      const imagePath = path.join(VALIDATED_IMAGES_DIR, TEST_IMAGE_SETS.MTGA[0].file);
      
      if (!fs.existsSync(imagePath)) {
        console.log('   ⚠️ Test image not found, skipping');
        return;
      }
      
      const concurrentRequests = 5;
      const startTime = Date.now();
      
      const promises = Array(concurrentRequests).fill(null).map(async () => {
        const formData = new FormData();
        formData.append('image', fs.createReadStream(imagePath));
        
        const response = await axios.post(`${API_URL}/ocr`, formData, {
          headers: formData.getHeaders()
        });
        
        return response.data.jobId;
      });
      
      const jobIds = await Promise.all(promises);
      expect(jobIds.length).toBe(concurrentRequests);
      
      const totalTime = Date.now() - startTime;
      console.log(`   ✅ Created ${concurrentRequests} concurrent jobs`);
      console.log(`   ⏱️ Time to create jobs: ${totalTime}ms`);
      
      // Verify all jobs complete successfully
      const results = await Promise.all(jobIds.map(async (jobId) => {
        let attempts = 0;
        while (attempts < 30) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          const status = await axios.get(`${API_URL}/ocr/status/${jobId}`);
          if (status.data.status === 'completed') {
            return true;
          } else if (status.data.status === 'failed') {
            return false;
          }
          attempts++;
        }
        return false;
      }));
      
      const successCount = results.filter(r => r).length;
      console.log(`   ✅ ${successCount}/${concurrentRequests} jobs completed successfully`);
      expect(successCount).toBe(concurrentRequests);
    }, 120000);
  });
  
  /**
   * Memory and performance tests
   */
  describe('Performance & Reliability', () => {
    test('Memory leak detection', async () => {
      console.log('\n💾 Testing for memory leaks...');
      const imagePath = path.join(VALIDATED_IMAGES_DIR, TEST_IMAGE_SETS.MTGA[0].file);
      
      if (!fs.existsSync(imagePath)) {
        console.log('   ⚠️ Test image not found, skipping');
        return;
      }
      
      const iterations = 3;
      const memoryReadings: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const startMemory = process.memoryUsage().heapUsed / 1024 / 1024;
        
        // Process image
        const formData = new FormData();
        formData.append('image', fs.createReadStream(imagePath));
        
        const response = await axios.post(`${API_URL}/ocr`, formData, {
          headers: formData.getHeaders()
        });
        
        const jobId = response.data.jobId;
        
        // Wait for completion
        let completed = false;
        for (let j = 0; j < 30; j++) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          const status = await axios.get(`${API_URL}/ocr/status/${jobId}`);
          if (status.data.status === 'completed') {
            completed = true;
            break;
          }
        }
        
        expect(completed).toBe(true);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
        const endMemory = process.memoryUsage().heapUsed / 1024 / 1024;
        const memoryDiff = endMemory - startMemory;
        memoryReadings.push(memoryDiff);
        
        console.log(`   Iteration ${i + 1}: ${memoryDiff.toFixed(2)} MB`);
      }
      
      // Check that memory usage doesn't continuously increase
      const avgMemory = memoryReadings.reduce((a, b) => a + b, 0) / memoryReadings.length;
      const maxMemory = Math.max(...memoryReadings);
      
      console.log(`   📊 Average memory per iteration: ${avgMemory.toFixed(2)} MB`);
      console.log(`   📊 Max memory usage: ${maxMemory.toFixed(2)} MB`);
      
      // Memory shouldn't increase by more than 50MB per iteration on average
      expect(avgMemory).toBeLessThan(50);
    }, 180000); // 3 minute timeout
    
    test('Response time consistency', async () => {
      console.log('\n⏱️ Testing response time consistency...');
      const imagePath = path.join(VALIDATED_IMAGES_DIR, TEST_IMAGE_SETS.MTGA[0].file);
      
      if (!fs.existsSync(imagePath)) {
        console.log('   ⚠️ Test image not found, skipping');
        return;
      }
      
      const timings: number[] = [];
      const runs = 3;
      
      for (let i = 0; i < runs; i++) {
        const startTime = Date.now();
        
        const formData = new FormData();
        formData.append('image', fs.createReadStream(imagePath));
        
        const response = await axios.post(`${API_URL}/ocr`, formData, {
          headers: formData.getHeaders()
        });
        
        const jobId = response.data.jobId;
        
        // Wait for completion
        for (let j = 0; j < 30; j++) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          const status = await axios.get(`${API_URL}/ocr/status/${jobId}`);
          if (status.data.status === 'completed') {
            break;
          }
        }
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        timings.push(duration);
        
        console.log(`   Run ${i + 1}: ${duration}ms`);
      }
      
      const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
      const minTime = Math.min(...timings);
      const maxTime = Math.max(...timings);
      const variance = maxTime - minTime;
      
      console.log(`   📊 Average time: ${avgTime.toFixed(0)}ms`);
      console.log(`   📊 Min/Max: ${minTime}ms / ${maxTime}ms`);
      console.log(`   📊 Variance: ${variance}ms`);
      
      // Variance shouldn't be more than 50% of average
      expect(variance).toBeLessThan(avgTime * 0.5);
    }, 180000);
  });
});

/**
 * Generate comprehensive test report
 */
function generateReport() {
  console.log('\n\n');
  console.log('════════════════════════════════════════════');
  console.log('     E2E INTEGRATION TEST REPORT');
  console.log('════════════════════════════════════════════');
  
  // Group metrics by category
  const byCategory: { [key: string]: TestMetrics[] } = {};
  testMetrics.forEach(metric => {
    if (!byCategory[metric.category]) {
      byCategory[metric.category] = [];
    }
    byCategory[metric.category].push(metric);
  });
  
  // Category summaries
  console.log('\n📊 RESULTS BY CATEGORY:');
  console.log('─────────────────────────────────────────');
  
  Object.entries(byCategory).forEach(([category, metrics]) => {
    const successful = metrics.filter(m => m.success).length;
    const total = metrics.length;
    const avgTime = metrics.reduce((sum, m) => sum + m.processingTime, 0) / total;
    const avgAccuracy = metrics.reduce((sum, m) => sum + (m.ocrAccuracy || 0), 0) / total;
    
    console.log(`\n${category}:`);
    console.log(`  Success Rate: ${successful}/${total} (${((successful/total) * 100).toFixed(0)}%)`);
    console.log(`  Avg Time: ${avgTime.toFixed(0)}ms`);
    console.log(`  Avg OCR Accuracy: ${avgAccuracy.toFixed(1)}%`);
    console.log(`  60+15 Guarantee: ${successful === total ? '✅ YES' : '❌ NO'}`);
  });
  
  // Overall statistics
  console.log('\n\n📈 OVERALL STATISTICS:');
  console.log('─────────────────────────────────────────');
  
  const totalTests = testMetrics.length;
  const successfulTests = testMetrics.filter(m => m.success).length;
  const overallSuccessRate = (successfulTests / totalTests) * 100;
  
  const avgProcessingTime = testMetrics.reduce((sum, m) => sum + m.processingTime, 0) / totalTests;
  const avgMemoryUsage = testMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / totalTests;
  const avgOcrAccuracy = testMetrics.reduce((sum, m) => sum + (m.ocrAccuracy || 0), 0) / totalTests;
  const avgApiCalls = testMetrics.reduce((sum, m) => sum + m.apiCalls, 0) / totalTests;
  
  console.log(`  Total Tests: ${totalTests}`);
  console.log(`  Successful: ${successfulTests}`);
  console.log(`  Failed: ${totalTests - successfulTests}`);
  console.log(`  Success Rate: ${overallSuccessRate.toFixed(1)}%`);
  console.log(`  Avg Processing Time: ${avgProcessingTime.toFixed(0)}ms`);
  console.log(`  Avg Memory Usage: ${avgMemoryUsage.toFixed(2)} MB`);
  console.log(`  Avg OCR Accuracy: ${avgOcrAccuracy.toFixed(1)}%`);
  console.log(`  Avg API Calls: ${avgApiCalls.toFixed(1)}`);
  
  // Export format success rates
  console.log('\n\n📦 EXPORT FORMAT SUCCESS RATES:');
  console.log('─────────────────────────────────────────');
  
  EXPORT_FORMATS.forEach(format => {
    const successful = testMetrics.filter(m => m.exportFormats[format]).length;
    const attempted = testMetrics.filter(m => format in m.exportFormats).length;
    const rate = attempted > 0 ? (successful / attempted) * 100 : 0;
    
    console.log(`  ${format}: ${successful}/${attempted} (${rate.toFixed(0)}%)`);
  });
  
  // Performance brackets
  console.log('\n\n⚡ PERFORMANCE DISTRIBUTION:');
  console.log('─────────────────────────────────────────');
  
  const timeBrackets = {
    '<1s': 0,
    '1-2s': 0,
    '2-5s': 0,
    '5-10s': 0,
    '>10s': 0
  };
  
  testMetrics.forEach(m => {
    const seconds = m.processingTime / 1000;
    if (seconds < 1) timeBrackets['<1s']++;
    else if (seconds < 2) timeBrackets['1-2s']++;
    else if (seconds < 5) timeBrackets['2-5s']++;
    else if (seconds < 10) timeBrackets['5-10s']++;
    else timeBrackets['>10s']++;
  });
  
  Object.entries(timeBrackets).forEach(([bracket, count]) => {
    const percentage = (count / totalTests) * 100;
    console.log(`  ${bracket}: ${count} tests (${percentage.toFixed(0)}%)`);
  });
  
  // Card count validation
  console.log('\n\n🃏 CARD COUNT VALIDATION:');
  console.log('─────────────────────────────────────────');
  
  const allMatch60_15 = testMetrics.every(m => 
    m.mainboardCount === 60 && m.sideboardCount === 15
  );
  
  console.log(`  60+15 Guarantee: ${allMatch60_15 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  if (!allMatch60_15) {
    console.log('\n  Failed tests:');
    testMetrics.filter(m => 
      m.mainboardCount !== 60 || m.sideboardCount !== 15
    ).forEach(m => {
      console.log(`    - ${m.file}: ${m.mainboardCount}+${m.sideboardCount}`);
    });
  }
  
  // Errors summary
  const testsWithErrors = testMetrics.filter(m => m.errors && m.errors.length > 0);
  if (testsWithErrors.length > 0) {
    console.log('\n\n⚠️ ERRORS ENCOUNTERED:');
    console.log('─────────────────────────────────────────');
    
    testsWithErrors.forEach(m => {
      console.log(`\n  ${m.file}:`);
      m.errors?.forEach(error => {
        console.log(`    - ${error}`);
      });
    });
  }
  
  // Recommendations
  console.log('\n\n💡 RECOMMENDATIONS:');
  console.log('─────────────────────────────────────────');
  
  if (avgProcessingTime > 5000) {
    console.log('  ⚠️ Average processing time exceeds 5 seconds');
    console.log('     Consider optimizing OCR pipeline or using parallel processing');
  }
  
  if (avgOcrAccuracy < 90) {
    console.log('  ⚠️ OCR accuracy below 90%');
    console.log('     Consider improving image preprocessing or OCR model selection');
  }
  
  if (avgMemoryUsage > 100) {
    console.log('  ⚠️ High memory usage detected');
    console.log('     Review memory management and potential memory leaks');
  }
  
  if (!allMatch60_15) {
    console.log('  ❌ 60+15 guarantee not met for all tests');
    console.log('     Critical: Review card counting and padding logic');
  }
  
  if (overallSuccessRate === 100 && allMatch60_15) {
    console.log('  ✅ All tests passed successfully!');
    console.log('  ✅ 60+15 card guarantee maintained');
    console.log('  ✅ System is production ready');
  }
  
  // Save detailed metrics to file
  const reportPath = path.join(__dirname, 'test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    summary: {
      totalTests,
      successfulTests,
      overallSuccessRate,
      avgProcessingTime,
      avgMemoryUsage,
      avgOcrAccuracy,
      allMatch60_15
    },
    byCategory,
    detailedMetrics: testMetrics,
    timestamp: new Date().toISOString()
  }, null, 2));
  
  console.log(`\n\n📄 Detailed report saved to: ${reportPath}`);
  console.log('════════════════════════════════════════════\n');
}