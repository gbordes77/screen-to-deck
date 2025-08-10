#!/usr/bin/env node

/**
 * Standalone Test Runner for E2E Integration Tests
 * Runs tests without Jest - pure Node.js implementation
 * Generates detailed metrics and comparison reports
 */

import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import { spawn, ChildProcess } from 'child_process';

// Configuration
const SERVER_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const API_URL = `${SERVER_URL}/api`;
const VALIDATED_IMAGES_DIR = path.join(__dirname, '../../../../validated_decklists');
const REPORT_DIR = path.join(__dirname, 'reports');

// Ensure report directory exists
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

// Test configuration
interface TestImage {
  category: string;
  file: string;
  description: string;
  expectedMainboard?: number;
  expectedSideboard?: number;
}

const TEST_IMAGES: TestImage[] = [
  // MTGA
  { category: 'MTGA', file: 'MTGA deck list 4_1920x1080.jpeg', description: 'High resolution MTGA' },
  { category: 'MTGA', file: 'MTGA deck list special_1334x886.jpeg', description: 'Special case MTGA' },
  
  // MTGO
  { category: 'MTGO', file: 'MTGO deck list usual_1763x791.jpeg', description: 'Standard MTGO' },
  { category: 'MTGO', file: 'MTGO deck list usual 4_1254x432.jpeg', description: 'Low height MTGO' },
  
  // MTGGoldfish
  { category: 'MTGGoldfish', file: 'mtggoldfish deck list 2_1383x1518.jpg', description: 'High res MTGGoldfish' },
  { category: 'MTGGoldfish', file: 'mtggoldfish deck list 10_1239x1362.jpg', description: 'Standard MTGGoldfish' },
  
  // Paper/Physical
  { category: 'Paper', file: 'real deck paper cards 4_2336x1098.jpeg', description: 'Physical cards photo' },
  { category: 'Paper', file: 'real deck cartes cachés_2048x1542.jpeg', description: 'Partially hidden cards' },
  
  // Website
  { category: 'Website', file: 'web site  deck list_2300x2210.jpeg', description: 'Large website screenshot' }
];

// Export formats to test
const EXPORT_FORMATS = ['mtga', 'moxfield', 'archidekt', 'tappedout', 'json'];

// Test result interface
interface TestResult {
  image: TestImage;
  success: boolean;
  startTime: number;
  endTime: number;
  duration: number;
  memoryStart: number;
  memoryEnd: number;
  memoryUsed: number;
  mainboardCount: number;
  sideboardCount: number;
  totalCards: number;
  uniqueCards: number;
  ocrRawText?: string;
  ocrCards: any[];
  validatedCards: any[];
  invalidCards: string[];
  ocrAccuracy: number;
  exportResults: { [format: string]: boolean };
  apiCalls: number;
  uploadSize: number;
  responseSize: number;
  errors: string[];
  warnings: string[];
  jobId?: string;
  imageResolution?: { width: number; height: number };
}

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class TestRunner {
  private serverProcess: ChildProcess | null = null;
  private results: TestResult[] = [];
  private startTime: number = 0;
  
  async run() {
    console.log(`${colors.bright}${colors.cyan}
╔══════════════════════════════════════════════════════════════╗
║     MTG Screen-to-Deck E2E Integration Test Runner          ║
║                   NO MOCKS - REAL APIS                      ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}`);
    
    this.startTime = Date.now();
    
    try {
      // Step 1: Start server if needed
      await this.ensureServerRunning();
      
      // Step 2: Verify prerequisites
      await this.verifyPrerequisites();
      
      // Step 3: Run tests
      await this.runAllTests();
      
      // Step 4: Generate reports
      await this.generateReports();
      
    } catch (error: any) {
      console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
      process.exit(1);
    } finally {
      // Cleanup
      if (this.serverProcess) {
        console.log(`\n${colors.yellow}Stopping server...${colors.reset}`);
        this.serverProcess.kill();
      }
    }
  }
  
  private async ensureServerRunning() {
    console.log(`\n${colors.yellow}Checking server status...${colors.reset}`);
    
    try {
      const response = await axios.get(`${API_URL}/health`, { timeout: 2000 });
      console.log(`${colors.green}✓ Server is running${colors.reset}`);
    } catch (error) {
      console.log(`${colors.yellow}Starting server...${colors.reset}`);
      
      this.serverProcess = spawn('npm', ['run', 'dev'], {
        cwd: path.join(__dirname, '../../../'),
        detached: false,
        stdio: 'pipe'
      });
      
      // Wait for server to start
      let attempts = 0;
      while (attempts < 15) {
        await this.sleep(2000);
        try {
          await axios.get(`${API_URL}/health`, { timeout: 2000 });
          console.log(`${colors.green}✓ Server started successfully${colors.reset}`);
          break;
        } catch (e) {
          attempts++;
          if (attempts === 15) {
            throw new Error('Failed to start server after 30 seconds');
          }
        }
      }
    }
  }
  
  private async verifyPrerequisites() {
    console.log(`\n${colors.yellow}Verifying prerequisites...${colors.reset}`);
    
    // Check OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    console.log(`${colors.green}✓ OpenAI API key found${colors.reset}`);
    
    // Check image directory
    if (!fs.existsSync(VALIDATED_IMAGES_DIR)) {
      throw new Error(`Image directory not found: ${VALIDATED_IMAGES_DIR}`);
    }
    console.log(`${colors.green}✓ Image directory found${colors.reset}`);
    
    // Count available test images
    let availableImages = 0;
    for (const testImage of TEST_IMAGES) {
      const imagePath = path.join(VALIDATED_IMAGES_DIR, testImage.file);
      if (fs.existsSync(imagePath)) {
        availableImages++;
      }
    }
    
    console.log(`${colors.green}✓ ${availableImages}/${TEST_IMAGES.length} test images available${colors.reset}`);
    
    if (availableImages === 0) {
      throw new Error('No test images found');
    }
  }
  
  private async runAllTests() {
    console.log(`\n${colors.bright}${colors.blue}Starting test execution...${colors.reset}\n`);
    
    for (let i = 0; i < TEST_IMAGES.length; i++) {
      const testImage = TEST_IMAGES[i];
      const testNumber = i + 1;
      
      console.log(`${colors.bright}[${testNumber}/${TEST_IMAGES.length}] Testing: ${testImage.file}${colors.reset}`);
      console.log(`     Category: ${testImage.category}`);
      console.log(`     Description: ${testImage.description}`);
      
      const result = await this.runSingleTest(testImage);
      this.results.push(result);
      
      if (result.success) {
        console.log(`     ${colors.green}✓ PASSED${colors.reset} (${result.duration}ms)\n`);
      } else {
        console.log(`     ${colors.red}✗ FAILED${colors.reset}`);
        result.errors.forEach(error => {
          console.log(`       ${colors.red}Error: ${error}${colors.reset}`);
        });
        console.log('');
      }
    }
  }
  
  private async runSingleTest(testImage: TestImage): Promise<TestResult> {
    const result: TestResult = {
      image: testImage,
      success: false,
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      memoryStart: process.memoryUsage().heapUsed,
      memoryEnd: 0,
      memoryUsed: 0,
      mainboardCount: 0,
      sideboardCount: 0,
      totalCards: 0,
      uniqueCards: 0,
      ocrCards: [],
      validatedCards: [],
      invalidCards: [],
      ocrAccuracy: 0,
      exportResults: {},
      apiCalls: 0,
      uploadSize: 0,
      responseSize: 0,
      errors: [],
      warnings: []
    };
    
    const imagePath = path.join(VALIDATED_IMAGES_DIR, testImage.file);
    
    try {
      // Check if image exists
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Image not found: ${imagePath}`);
      }
      
      const imageStats = fs.statSync(imagePath);
      result.uploadSize = imageStats.size;
      
      // Get image resolution (simplified, would need sharp or similar for real resolution)
      const match = testImage.file.match(/_(\d+)x(\d+)\./);
      if (match) {
        result.imageResolution = {
          width: parseInt(match[1]),
          height: parseInt(match[2])
        };
      }
      
      // Step 1: Upload image
      console.log(`     Uploading image (${(result.uploadSize / 1024 / 1024).toFixed(2)} MB)...`);
      
      const formData = new FormData();
      formData.append('image', fs.createReadStream(imagePath));
      
      const uploadResponse = await axios.post(`${API_URL}/ocr`, formData, {
        headers: {
          ...formData.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 30000
      });
      
      result.apiCalls++;
      result.jobId = uploadResponse.data.jobId;
      
      if (!result.jobId) {
        throw new Error('No job ID returned from OCR endpoint');
      }
      
      console.log(`     Job created: ${result.jobId}`);
      
      // Step 2: Poll for results
      console.log(`     Processing OCR...`);
      let ocrResult: any = null;
      let pollAttempts = 0;
      const maxPolls = 30;
      
      while (pollAttempts < maxPolls) {
        await this.sleep(2000);
        
        const statusResponse = await axios.get(`${API_URL}/ocr/status/${result.jobId}`, {
          timeout: 5000
        });
        
        result.apiCalls++;
        
        if (statusResponse.data.status === 'completed') {
          ocrResult = statusResponse.data.result;
          result.responseSize = JSON.stringify(ocrResult).length;
          break;
        } else if (statusResponse.data.status === 'failed') {
          throw new Error(`OCR failed: ${statusResponse.data.error || 'Unknown error'}`);
        }
        
        pollAttempts++;
        if (pollAttempts % 5 === 0) {
          console.log(`     Still processing (${pollAttempts * 2}s)...`);
        }
      }
      
      if (!ocrResult) {
        throw new Error('OCR timeout after 60 seconds');
      }
      
      // Step 3: Analyze results
      result.ocrCards = ocrResult.cards || [];
      result.ocrRawText = ocrResult.rawText;
      result.uniqueCards = result.ocrCards.length;
      
      // Count cards by section
      const mainboardCards = result.ocrCards.filter((c: any) => c.section !== 'sideboard');
      const sideboardCards = result.ocrCards.filter((c: any) => c.section === 'sideboard');
      
      result.mainboardCount = mainboardCards.reduce((sum: number, c: any) => sum + (c.quantity || 0), 0);
      result.sideboardCount = sideboardCards.reduce((sum: number, c: any) => sum + (c.quantity || 0), 0);
      result.totalCards = result.mainboardCount + result.sideboardCount;
      
      console.log(`     Cards: ${result.mainboardCount} main + ${result.sideboardCount} side = ${result.totalCards} total`);
      
      // Verify 60+15 guarantee
      if (result.mainboardCount !== 60) {
        result.errors.push(`Mainboard count is ${result.mainboardCount}, expected 60`);
      }
      if (result.sideboardCount !== 15) {
        result.errors.push(`Sideboard count is ${result.sideboardCount}, expected 15`);
      }
      
      // Step 4: Validate cards
      console.log(`     Validating card names...`);
      
      const cardNames = result.ocrCards.map((c: any) => c.name);
      const validationResponse = await axios.post(`${API_URL}/cards/validate`, {
        cardNames: cardNames
      }, {
        timeout: 10000
      });
      
      result.apiCalls++;
      
      const validationData = validationResponse.data;
      result.validatedCards = validationData.validCards || [];
      result.invalidCards = validationData.invalidCards || [];
      
      // Calculate accuracy
      if (cardNames.length > 0) {
        result.ocrAccuracy = (result.validatedCards.length / cardNames.length) * 100;
      }
      
      console.log(`     OCR Accuracy: ${result.ocrAccuracy.toFixed(1)}%`);
      
      if (result.invalidCards.length > 0) {
        result.warnings.push(`${result.invalidCards.length} invalid cards detected`);
      }
      
      // Step 5: Test export formats
      console.log(`     Testing export formats...`);
      
      for (const format of EXPORT_FORMATS) {
        try {
          const exportResponse = await axios.post(`${API_URL}/export`, {
            cards: result.ocrCards,
            format: format
          }, {
            timeout: 5000
          });
          
          result.apiCalls++;
          
          if (exportResponse.data) {
            result.exportResults[format] = true;
          } else {
            result.exportResults[format] = false;
            result.warnings.push(`Export format ${format} returned empty`);
          }
        } catch (error: any) {
          result.exportResults[format] = false;
          result.warnings.push(`Export format ${format} failed: ${error.message}`);
        }
      }
      
      const exportSuccess = Object.values(result.exportResults).filter(v => v).length;
      console.log(`     Export formats: ${exportSuccess}/${EXPORT_FORMATS.length} successful`);
      
      // Calculate final metrics
      result.endTime = Date.now();
      result.duration = result.endTime - result.startTime;
      result.memoryEnd = process.memoryUsage().heapUsed;
      result.memoryUsed = (result.memoryEnd - result.memoryStart) / 1024 / 1024;
      
      // Determine overall success
      result.success = (
        result.mainboardCount === 60 &&
        result.sideboardCount === 15 &&
        result.errors.length === 0
      );
      
    } catch (error: any) {
      result.errors.push(error.message);
      result.endTime = Date.now();
      result.duration = result.endTime - result.startTime;
      result.memoryEnd = process.memoryUsage().heapUsed;
      result.memoryUsed = (result.memoryEnd - result.memoryStart) / 1024 / 1024;
    }
    
    return result;
  }
  
  private async generateReports() {
    const totalDuration = Date.now() - this.startTime;
    
    console.log(`\n${colors.bright}${colors.cyan}
════════════════════════════════════════════════════════════════
                    TEST EXECUTION SUMMARY                      
════════════════════════════════════════════════════════════════${colors.reset}`);
    
    // Calculate statistics
    const totalTests = this.results.length;
    const successfulTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - successfulTests;
    const successRate = (successfulTests / totalTests) * 100;
    
    // Group by category
    const byCategory: { [key: string]: TestResult[] } = {};
    this.results.forEach(result => {
      const category = result.image.category;
      if (!byCategory[category]) {
        byCategory[category] = [];
      }
      byCategory[category].push(result);
    });
    
    // Category summary
    console.log(`\n${colors.bright}Results by Category:${colors.reset}`);
    Object.entries(byCategory).forEach(([category, results]) => {
      const catSuccess = results.filter(r => r.success).length;
      const catTotal = results.length;
      const avgTime = results.reduce((sum, r) => sum + r.duration, 0) / catTotal;
      const avgAccuracy = results.reduce((sum, r) => sum + r.ocrAccuracy, 0) / catTotal;
      
      const statusColor = catSuccess === catTotal ? colors.green : colors.yellow;
      console.log(`\n  ${colors.bright}${category}:${colors.reset}`);
      console.log(`    Status: ${statusColor}${catSuccess}/${catTotal} passed${colors.reset}`);
      console.log(`    Avg Time: ${avgTime.toFixed(0)}ms`);
      console.log(`    Avg Accuracy: ${avgAccuracy.toFixed(1)}%`);
    });
    
    // Overall statistics
    console.log(`\n${colors.bright}Overall Statistics:${colors.reset}`);
    console.log(`  Total Tests: ${totalTests}`);
    console.log(`  Passed: ${colors.green}${successfulTests}${colors.reset}`);
    console.log(`  Failed: ${colors.red}${failedTests}${colors.reset}`);
    console.log(`  Success Rate: ${successRate >= 100 ? colors.green : colors.yellow}${successRate.toFixed(1)}%${colors.reset}`);
    console.log(`  Total Duration: ${(totalDuration / 1000).toFixed(1)}s`);
    
    // Performance metrics
    const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / totalTests;
    const avgMemory = this.results.reduce((sum, r) => sum + r.memoryUsed, 0) / totalTests;
    const avgAccuracy = this.results.reduce((sum, r) => sum + r.ocrAccuracy, 0) / totalTests;
    const avgApiCalls = this.results.reduce((sum, r) => sum + r.apiCalls, 0) / totalTests;
    
    console.log(`\n${colors.bright}Performance Metrics:${colors.reset}`);
    console.log(`  Avg Processing Time: ${avgDuration.toFixed(0)}ms`);
    console.log(`  Avg Memory Usage: ${avgMemory.toFixed(2)} MB`);
    console.log(`  Avg OCR Accuracy: ${avgAccuracy.toFixed(1)}%`);
    console.log(`  Avg API Calls: ${avgApiCalls.toFixed(1)}`);
    
    // 60+15 Guarantee Check
    const all60_15 = this.results.every(r => 
      r.mainboardCount === 60 && r.sideboardCount === 15
    );
    
    console.log(`\n${colors.bright}Card Count Validation:${colors.reset}`);
    if (all60_15) {
      console.log(`  ${colors.green}✓ ALL tests maintained 60+15 guarantee${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ Some tests failed 60+15 guarantee:${colors.reset}`);
      this.results.filter(r => 
        r.mainboardCount !== 60 || r.sideboardCount !== 15
      ).forEach(r => {
        console.log(`    - ${r.image.file}: ${r.mainboardCount}+${r.sideboardCount}`);
      });
    }
    
    // Export format success
    console.log(`\n${colors.bright}Export Format Success:${colors.reset}`);
    EXPORT_FORMATS.forEach(format => {
      const formatSuccess = this.results.filter(r => r.exportResults[format]).length;
      const formatRate = (formatSuccess / totalTests) * 100;
      const color = formatRate >= 100 ? colors.green : formatRate >= 80 ? colors.yellow : colors.red;
      console.log(`  ${format}: ${color}${formatSuccess}/${totalTests} (${formatRate.toFixed(0)}%)${colors.reset}`);
    });
    
    // Failed tests details
    if (failedTests > 0) {
      console.log(`\n${colors.bright}${colors.red}Failed Tests:${colors.reset}`);
      this.results.filter(r => !r.success).forEach(r => {
        console.log(`\n  ${r.image.file}:`);
        r.errors.forEach(error => {
          console.log(`    ${colors.red}Error: ${error}${colors.reset}`);
        });
      });
    }
    
    // Save JSON report
    const reportData = {
      summary: {
        totalTests,
        successfulTests,
        failedTests,
        successRate,
        totalDuration,
        avgDuration,
        avgMemory,
        avgAccuracy,
        all60_15,
        timestamp: new Date().toISOString()
      },
      byCategory: Object.entries(byCategory).map(([category, results]) => ({
        category,
        tests: results.length,
        passed: results.filter(r => r.success).length,
        avgTime: results.reduce((sum, r) => sum + r.duration, 0) / results.length,
        avgAccuracy: results.reduce((sum, r) => sum + r.ocrAccuracy, 0) / results.length
      })),
      results: this.results.map(r => ({
        file: r.image.file,
        category: r.image.category,
        success: r.success,
        duration: r.duration,
        memory: r.memoryUsed,
        mainboard: r.mainboardCount,
        sideboard: r.sideboardCount,
        accuracy: r.ocrAccuracy,
        exports: r.exportResults,
        errors: r.errors,
        warnings: r.warnings
      }))
    };
    
    const reportPath = path.join(REPORT_DIR, `report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    
    console.log(`\n${colors.bright}Report saved to: ${reportPath}${colors.reset}`);
    
    // Generate CSV report
    const csvPath = path.join(REPORT_DIR, `report-${Date.now()}.csv`);
    const csvHeader = 'File,Category,Success,Duration(ms),Memory(MB),Mainboard,Sideboard,Accuracy(%),Errors\n';
    const csvRows = this.results.map(r => 
      `"${r.image.file}","${r.image.category}",${r.success},${r.duration},${r.memoryUsed.toFixed(2)},${r.mainboardCount},${r.sideboardCount},${r.ocrAccuracy.toFixed(1)},"${r.errors.join('; ')}"`
    ).join('\n');
    fs.writeFileSync(csvPath, csvHeader + csvRows);
    
    console.log(`${colors.bright}CSV report saved to: ${csvPath}${colors.reset}`);
    
    // Final recommendation
    console.log(`\n${colors.bright}${colors.cyan}FINAL ASSESSMENT:${colors.reset}`);
    if (successRate === 100 && all60_15) {
      console.log(`${colors.green}${colors.bright}✓ SYSTEM READY FOR PRODUCTION${colors.reset}`);
      console.log(`${colors.green}  All tests passed with 60+15 guarantee maintained${colors.reset}`);
    } else if (successRate >= 90) {
      console.log(`${colors.yellow}${colors.bright}⚠ SYSTEM MOSTLY READY${colors.reset}`);
      console.log(`${colors.yellow}  Minor issues need addressing before production${colors.reset}`);
    } else {
      console.log(`${colors.red}${colors.bright}✗ SYSTEM NOT READY${colors.reset}`);
      console.log(`${colors.red}  Critical issues must be resolved${colors.reset}`);
    }
    
    console.log(`\n${colors.cyan}════════════════════════════════════════════════════════════════${colors.reset}\n`);
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the test runner
const runner = new TestRunner();
runner.run().catch(error => {
  console.error(`${colors.red}Unexpected error: ${error}${colors.reset}`);
  process.exit(1);
});