/**
 * Automated Validation Test Suite
 * ================================
 * Complete test suite for validating 100% success rate on MTGA and MTGO decks
 * 
 * Features:
 * - Parallel test execution for performance
 * - Detailed metrics and accuracy reporting
 * - HTML report generation with visual results
 * - CI/CD ready with GitHub Actions integration
 * - Automatic retry mechanism for flaky tests
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import path from 'path';
import fs from 'fs';
import OptimizedOCRService from '../server/src/services/optimizedOcrService';
import mtgoCorrector from '../server/src/services/mtgoLandCorrector';
import { MTGCard, OCRResult } from '../server/src/types';

// Test configuration
const TEST_CONFIG = {
  mtgaDecks: [
    { file: 'MTGA deck list 4_1920x1080.jpeg', expectedCards: 60, expectedSideboard: 15, resolution: 'HD' },
    { file: 'MTGA deck list special_1334x886.jpeg', expectedCards: 60, expectedSideboard: 15, resolution: 'Medium' },
    { file: 'MTGA deck list 2_1545x671.jpeg', expectedCards: 60, expectedSideboard: 15, resolution: 'Low', problematic: true },
    { file: 'MTGA deck list 3_1835x829.jpeg', expectedCards: 60, expectedSideboard: 15, resolution: 'Good' },
    { file: 'MTGA deck list _1593x831.jpeg', expectedCards: 60, expectedSideboard: 15, resolution: 'Medium' },
    { file: 'MTGA deck list_1535x728.jpeg', expectedCards: 60, expectedSideboard: 15, resolution: 'Low', problematic: true }
  ],
  mtgoDecks: [
    { file: 'MTGO deck list usual_1763x791.jpeg', expectedCards: 60, expectedSideboard: 15, resolution: 'Good' },
    { file: 'MTGO deck list usual 4_1254x432.jpeg', expectedCards: 60, expectedSideboard: 15, resolution: 'Very Low', problematic: true },
    { file: 'MTGO deck list usual 2_1763x791.jpeg', expectedCards: 60, expectedSideboard: 15, resolution: 'Good' },
    { file: 'MTGO deck list usual 3_1763x791.jpeg', expectedCards: 60, expectedSideboard: 15, resolution: 'Good' },
    { file: 'MTGO deck list usual 5_1763x791.jpeg', expectedCards: 60, expectedSideboard: 15, resolution: 'Good' },
    { file: 'MTGO deck list usual 6_1763x791.jpeg', expectedCards: 60, expectedSideboard: 15, resolution: 'Good' },
    { file: 'MTGO deck list usual 7_1763x791.jpeg', expectedCards: 60, expectedSideboard: 15, resolution: 'Good' },
    { file: 'MTGO deck list usual 8_1763x791.jpeg', expectedCards: 60, expectedSideboard: 15, resolution: 'Good' }
  ],
  retryAttempts: 3,
  retryDelay: 2000,
  timeout: 60000,
  parallelJobs: 4
};

// Test results storage
interface TestResult {
  deckName: string;
  format: 'MTGA' | 'MTGO';
  resolution: string;
  success: boolean;
  mainboardCards: number;
  sideboardCards: number;
  expectedMainboard: number;
  expectedSideboard: number;
  accuracy: number;
  processingTime: number;
  superResolutionApplied: boolean;
  errors: string[];
  warnings: string[];
  cards?: MTGCard[];
  retryCount: number;
}

const testResults: TestResult[] = [];
let ocrService: typeof OptimizedOCRService;

// Helper functions
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function processWithRetry(
  imagePath: string,
  maxRetries: number = TEST_CONFIG.retryAttempts
): Promise<OCRResult & { metrics?: any }> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`  Attempt ${attempt}/${maxRetries}...`);
      const result = await ocrService.processImage(imagePath);
      
      if (result.success) {
        return result;
      }
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.retryDelay));
      }
    } catch (error) {
      lastError = error as Error;
      console.error(`  Attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.retryDelay));
      }
    }
  }
  
  throw lastError || new Error('All retry attempts failed');
}

function calculateAccuracy(actual: number, expected: number): number {
  if (expected === 0) return 0;
  const accuracy = (Math.min(actual, expected) / expected) * 100;
  return Math.round(accuracy * 100) / 100;
}

function generateHTMLReport(results: TestResult[]): string {
  const totalTests = results.length;
  const passedTests = results.filter(r => r.success).length;
  const failedTests = totalTests - passedTests;
  const overallAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0) / totalTests;
  
  const avgProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0) / totalTests;
  const superResolutionUsed = results.filter(r => r.superResolutionApplied).length;
  
  const mtgaResults = results.filter(r => r.format === 'MTGA');
  const mtgoResults = results.filter(r => r.format === 'MTGO');
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MTG OCR Validation Report - ${new Date().toISOString()}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 2rem;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 1rem;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
      text-align: center;
    }
    .header h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }
    .header .subtitle {
      font-size: 1.2rem;
      opacity: 0.9;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      padding: 2rem;
      background: #f7fafc;
      border-bottom: 1px solid #e2e8f0;
    }
    .metric {
      text-align: center;
    }
    .metric .value {
      font-size: 2.5rem;
      font-weight: bold;
      color: #4a5568;
    }
    .metric .label {
      font-size: 0.875rem;
      color: #718096;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 0.25rem;
    }
    .metric.success .value { color: #48bb78; }
    .metric.failure .value { color: #f56565; }
    .metric.warning .value { color: #ed8936; }
    
    .section {
      padding: 2rem;
    }
    .section h2 {
      font-size: 1.75rem;
      color: #2d3748;
      margin-bottom: 1.5rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #e2e8f0;
    }
    
    .tests-grid {
      display: grid;
      gap: 1rem;
    }
    
    .test-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      padding: 1.5rem;
      transition: all 0.3s ease;
    }
    .test-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      transform: translateY(-2px);
    }
    .test-card.success {
      border-left: 4px solid #48bb78;
    }
    .test-card.failure {
      border-left: 4px solid #f56565;
    }
    .test-card.warning {
      border-left: 4px solid #ed8936;
    }
    
    .test-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .test-name {
      font-weight: 600;
      color: #2d3748;
      font-size: 1.1rem;
    }
    .test-status {
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .test-status.pass {
      background: #c6f6d5;
      color: #276749;
    }
    .test-status.fail {
      background: #fed7d7;
      color: #9b2c2c;
    }
    .test-status.partial {
      background: #feebc8;
      color: #975a16;
    }
    
    .test-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #e2e8f0;
    }
    .detail-item {
      display: flex;
      flex-direction: column;
    }
    .detail-label {
      font-size: 0.75rem;
      color: #718096;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .detail-value {
      font-size: 1rem;
      color: #2d3748;
      font-weight: 600;
      margin-top: 0.25rem;
    }
    
    .accuracy-bar {
      width: 100%;
      height: 8px;
      background: #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 0.5rem;
    }
    .accuracy-fill {
      height: 100%;
      transition: width 0.3s ease;
    }
    .accuracy-fill.high { background: #48bb78; }
    .accuracy-fill.medium { background: #ed8936; }
    .accuracy-fill.low { background: #f56565; }
    
    .errors-warnings {
      margin-top: 1rem;
      padding: 1rem;
      background: #fef5e7;
      border-radius: 0.5rem;
      font-size: 0.875rem;
    }
    .error-item {
      color: #e74c3c;
      margin-bottom: 0.25rem;
    }
    .warning-item {
      color: #f39c12;
      margin-bottom: 0.25rem;
    }
    
    .footer {
      background: #2d3748;
      color: white;
      padding: 1.5rem;
      text-align: center;
      font-size: 0.875rem;
    }
    
    .chart-container {
      margin: 2rem 0;
      padding: 1rem;
      background: white;
      border-radius: 0.5rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    @media (max-width: 768px) {
      .summary {
        grid-template-columns: repeat(2, 1fr);
      }
      .test-details {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎯 MTG OCR Validation Report</h1>
      <div class="subtitle">Automated Test Suite Results - ${new Date().toLocaleString()}</div>
    </div>
    
    <div class="summary">
      <div class="metric ${passedTests === totalTests ? 'success' : failedTests > 0 ? 'failure' : 'warning'}">
        <div class="value">${passedTests}/${totalTests}</div>
        <div class="label">Tests Passed</div>
      </div>
      <div class="metric ${overallAccuracy >= 95 ? 'success' : overallAccuracy >= 80 ? 'warning' : 'failure'}">
        <div class="value">${overallAccuracy.toFixed(1)}%</div>
        <div class="label">Overall Accuracy</div>
      </div>
      <div class="metric">
        <div class="value">${(avgProcessingTime / 1000).toFixed(1)}s</div>
        <div class="label">Avg Processing Time</div>
      </div>
      <div class="metric">
        <div class="value">${superResolutionUsed}/${totalTests}</div>
        <div class="label">Super-Resolution Used</div>
      </div>
    </div>
    
    <div class="section">
      <h2>📊 MTGA Results (${mtgaResults.filter(r => r.success).length}/${mtgaResults.length} Passed)</h2>
      <div class="tests-grid">
        ${mtgaResults.map(result => `
          <div class="test-card ${result.success ? 'success' : result.accuracy >= 80 ? 'warning' : 'failure'}">
            <div class="test-header">
              <div class="test-name">${result.deckName}</div>
              <div class="test-status ${result.success ? 'pass' : result.accuracy >= 80 ? 'partial' : 'fail'}">
                ${result.success ? 'PASS' : result.accuracy >= 80 ? 'PARTIAL' : 'FAIL'}
              </div>
            </div>
            
            <div class="test-details">
              <div class="detail-item">
                <div class="detail-label">Resolution</div>
                <div class="detail-value">${result.resolution}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Mainboard</div>
                <div class="detail-value">${result.mainboardCards}/${result.expectedMainboard}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Sideboard</div>
                <div class="detail-value">${result.sideboardCards}/${result.expectedSideboard}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Accuracy</div>
                <div class="detail-value">${result.accuracy}%</div>
                <div class="accuracy-bar">
                  <div class="accuracy-fill ${result.accuracy >= 95 ? 'high' : result.accuracy >= 80 ? 'medium' : 'low'}" 
                       style="width: ${result.accuracy}%"></div>
                </div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Processing</div>
                <div class="detail-value">${(result.processingTime / 1000).toFixed(2)}s</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Super-Res</div>
                <div class="detail-value">${result.superResolutionApplied ? '✅ Yes' : '❌ No'}</div>
              </div>
            </div>
            
            ${(result.errors.length > 0 || result.warnings.length > 0) ? `
              <div class="errors-warnings">
                ${result.errors.map(e => `<div class="error-item">❌ ${e}</div>`).join('')}
                ${result.warnings.map(w => `<div class="warning-item">⚠️ ${w}</div>`).join('')}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>
    
    <div class="section">
      <h2>🎮 MTGO Results (${mtgoResults.filter(r => r.success).length}/${mtgoResults.length} Passed)</h2>
      <div class="tests-grid">
        ${mtgoResults.map(result => `
          <div class="test-card ${result.success ? 'success' : result.accuracy >= 80 ? 'warning' : 'failure'}">
            <div class="test-header">
              <div class="test-name">${result.deckName}</div>
              <div class="test-status ${result.success ? 'pass' : result.accuracy >= 80 ? 'partial' : 'fail'}">
                ${result.success ? 'PASS' : result.accuracy >= 80 ? 'PARTIAL' : 'FAIL'}
              </div>
            </div>
            
            <div class="test-details">
              <div class="detail-item">
                <div class="detail-label">Resolution</div>
                <div class="detail-value">${result.resolution}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Mainboard</div>
                <div class="detail-value">${result.mainboardCards}/${result.expectedMainboard}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Sideboard</div>
                <div class="detail-value">${result.sideboardCards}/${result.expectedSideboard}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Accuracy</div>
                <div class="detail-value">${result.accuracy}%</div>
                <div class="accuracy-bar">
                  <div class="accuracy-fill ${result.accuracy >= 95 ? 'high' : result.accuracy >= 80 ? 'medium' : 'low'}" 
                       style="width: ${result.accuracy}%"></div>
                </div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Processing</div>
                <div class="detail-value">${(result.processingTime / 1000).toFixed(2)}s</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Super-Res</div>
                <div class="detail-value">${result.superResolutionApplied ? '✅ Yes' : '❌ No'}</div>
              </div>
            </div>
            
            ${(result.errors.length > 0 || result.warnings.length > 0) ? `
              <div class="errors-warnings">
                ${result.errors.map(e => `<div class="error-item">❌ ${e}</div>`).join('')}
                ${result.warnings.map(w => `<div class="warning-item">⚠️ ${w}</div>`).join('')}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>
    
    <div class="footer">
      <p>Generated by MTG Screen-to-Deck Automated Test Suite v2.1.0</p>
      <p>Total Tests: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests} | Accuracy: ${overallAccuracy.toFixed(2)}%</p>
    </div>
  </div>
</body>
</html>
  `;
  
  return html;
}

// Test setup
beforeAll(async () => {
  console.log('🚀 Initializing OCR Service for validation tests...');
  ocrService = OptimizedOCRService;
  
  // Ensure test directories exist
  const dirs = [
    '/Volumes/DataDisk/_Projects/screen to deck/test-results',
    '/Volumes/DataDisk/_Projects/screen to deck/test-images/mtga',
    '/Volumes/DataDisk/_Projects/screen to deck/test-images/mtgo'
  ];
  
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
});

afterAll(async () => {
  // Generate HTML report
  const htmlReport = generateHTMLReport(testResults);
  const reportPath = path.join(
    '/Volumes/DataDisk/_Projects/screen to deck/test-results',
    `validation-report-${Date.now()}.html`
  );
  
  fs.writeFileSync(reportPath, htmlReport);
  console.log(`\n📊 HTML Report generated: ${reportPath}`);
  
  // Generate JSON report for CI/CD
  const jsonReport = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: testResults.length,
      passed: testResults.filter(r => r.success).length,
      failed: testResults.filter(r => !r.success).length,
      overallAccuracy: testResults.reduce((sum, r) => sum + r.accuracy, 0) / testResults.length,
      avgProcessingTime: testResults.reduce((sum, r) => sum + r.processingTime, 0) / testResults.length
    },
    results: testResults
  };
  
  const jsonPath = reportPath.replace('.html', '.json');
  fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
  console.log(`📄 JSON Report generated: ${jsonPath}`);
  
  // Print summary to console
  console.log('\n' + '='.repeat(80));
  console.log('VALIDATION SUITE SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${jsonReport.summary.totalTests}`);
  console.log(`Passed: ${jsonReport.summary.passed} (${(jsonReport.summary.passed / jsonReport.summary.totalTests * 100).toFixed(1)}%)`);
  console.log(`Failed: ${jsonReport.summary.failed}`);
  console.log(`Overall Accuracy: ${jsonReport.summary.overallAccuracy.toFixed(2)}%`);
  console.log(`Average Processing Time: ${(jsonReport.summary.avgProcessingTime / 1000).toFixed(2)}s`);
  console.log('='.repeat(80));
  
  // Exit with error code if tests failed
  if (jsonReport.summary.failed > 0) {
    process.exit(1);
  }
});

// MTGA Tests
describe('MTGA Deck Validation', () => {
  TEST_CONFIG.mtgaDecks.forEach((deckConfig) => {
    test(
      `Should extract 60+15 cards from ${deckConfig.file}`,
      async () => {
        const imagePath = path.join(
          '/Volumes/DataDisk/_Projects/screen to deck/test-images/mtga',
          deckConfig.file
        );
        
        // Check if file exists, skip if not found
        if (!await fileExists(imagePath)) {
          console.warn(`⚠️ Skipping test - File not found: ${deckConfig.file}`);
          return;
        }
        
        console.log(`\n🎯 Testing MTGA: ${deckConfig.file}`);
        console.log(`  Resolution: ${deckConfig.resolution}`);
        if (deckConfig.problematic) {
          console.log(`  ⚠️ Known problematic image`);
        }
        
        const startTime = Date.now();
        let result: OCRResult & { metrics?: any };
        let retryCount = 0;
        
        try {
          // Process with retry mechanism
          result = await processWithRetry(imagePath);
          retryCount = result.metrics?.retryCount || 0;
        } catch (error) {
          console.error(`❌ Failed to process ${deckConfig.file}:`, error);
          
          // Record failure
          testResults.push({
            deckName: deckConfig.file,
            format: 'MTGA',
            resolution: deckConfig.resolution,
            success: false,
            mainboardCards: 0,
            sideboardCards: 0,
            expectedMainboard: deckConfig.expectedCards,
            expectedSideboard: deckConfig.expectedSideboard,
            accuracy: 0,
            processingTime: Date.now() - startTime,
            superResolutionApplied: false,
            errors: [error instanceof Error ? error.message : 'Unknown error'],
            warnings: [],
            retryCount: TEST_CONFIG.retryAttempts
          });
          
          expect(false).toBe(true); // Force test failure
          return;
        }
        
        const processingTime = Date.now() - startTime;
        
        // Calculate card counts
        const mainboardCards = result.cards.filter(c => c.section !== 'sideboard');
        const sideboardCards = result.cards.filter(c => c.section === 'sideboard');
        const mainboardCount = mainboardCards.reduce((sum, c) => sum + c.quantity, 0);
        const sideboardCount = sideboardCards.reduce((sum, c) => sum + c.quantity, 0);
        
        // Calculate accuracy
        const mainboardAccuracy = calculateAccuracy(mainboardCount, deckConfig.expectedCards);
        const sideboardAccuracy = calculateAccuracy(sideboardCount, deckConfig.expectedSideboard);
        const overallAccuracy = (mainboardAccuracy + sideboardAccuracy) / 2;
        
        // Determine success
        const success = mainboardCount === deckConfig.expectedCards && 
                       sideboardCount === deckConfig.expectedSideboard;
        
        // Collect errors and warnings
        const errors: string[] = [];
        const warnings: string[] = [];
        
        if (mainboardCount !== deckConfig.expectedCards) {
          errors.push(`Mainboard: ${mainboardCount}/${deckConfig.expectedCards} cards`);
        }
        if (sideboardCount !== deckConfig.expectedSideboard) {
          errors.push(`Sideboard: ${sideboardCount}/${deckConfig.expectedSideboard} cards`);
        }
        
        if (result.warnings) {
          warnings.push(...result.warnings);
        }
        
        // Record results
        const testResult: TestResult = {
          deckName: deckConfig.file,
          format: 'MTGA',
          resolution: deckConfig.resolution,
          success,
          mainboardCards: mainboardCount,
          sideboardCards: sideboardCount,
          expectedMainboard: deckConfig.expectedCards,
          expectedSideboard: deckConfig.expectedSideboard,
          accuracy: overallAccuracy,
          processingTime,
          superResolutionApplied: result.metrics?.superResolutionApplied || false,
          errors,
          warnings,
          cards: result.cards,
          retryCount
        };
        
        testResults.push(testResult);
        
        // Log results
        console.log(`  ✅ Mainboard: ${mainboardCount}/${deckConfig.expectedCards}`);
        console.log(`  ✅ Sideboard: ${sideboardCount}/${deckConfig.expectedSideboard}`);
        console.log(`  📊 Accuracy: ${overallAccuracy.toFixed(2)}%`);
        console.log(`  ⏱️ Processing time: ${(processingTime / 1000).toFixed(2)}s`);
        if (result.metrics?.superResolutionApplied) {
          console.log(`  🔍 Super-resolution applied`);
        }
        
        // Assertions
        expect(mainboardCount).toBe(deckConfig.expectedCards);
        expect(sideboardCount).toBe(deckConfig.expectedSideboard);
        expect(success).toBe(true);
      },
      TEST_CONFIG.timeout
    );
  });
});

// MTGO Tests
describe('MTGO Deck Validation', () => {
  TEST_CONFIG.mtgoDecks.forEach((deckConfig) => {
    test(
      `Should extract 60+15 cards from ${deckConfig.file} with land correction`,
      async () => {
        const imagePath = path.join(
          '/Volumes/DataDisk/_Projects/screen to deck/test-images/mtgo',
          deckConfig.file
        );
        
        // Check if file exists, skip if not found
        if (!await fileExists(imagePath)) {
          console.warn(`⚠️ Skipping test - File not found: ${deckConfig.file}`);
          return;
        }
        
        console.log(`\n🎮 Testing MTGO: ${deckConfig.file}`);
        console.log(`  Resolution: ${deckConfig.resolution}`);
        if (deckConfig.problematic) {
          console.log(`  ⚠️ Known problematic image`);
        }
        
        const startTime = Date.now();
        let result: OCRResult & { metrics?: any };
        let retryCount = 0;
        
        try {
          // Process with retry mechanism
          result = await processWithRetry(imagePath);
          retryCount = result.metrics?.retryCount || 0;
        } catch (error) {
          console.error(`❌ Failed to process ${deckConfig.file}:`, error);
          
          // Record failure
          testResults.push({
            deckName: deckConfig.file,
            format: 'MTGO',
            resolution: deckConfig.resolution,
            success: false,
            mainboardCards: 0,
            sideboardCards: 0,
            expectedMainboard: deckConfig.expectedCards,
            expectedSideboard: deckConfig.expectedSideboard,
            accuracy: 0,
            processingTime: Date.now() - startTime,
            superResolutionApplied: false,
            errors: [error instanceof Error ? error.message : 'Unknown error'],
            warnings: [],
            retryCount: TEST_CONFIG.retryAttempts
          });
          
          expect(false).toBe(true); // Force test failure
          return;
        }
        
        const processingTime = Date.now() - startTime;
        
        // Calculate card counts
        const mainboardCards = result.cards.filter(c => c.section !== 'sideboard');
        const sideboardCards = result.cards.filter(c => c.section === 'sideboard');
        const mainboardCount = mainboardCards.reduce((sum, c) => sum + c.quantity, 0);
        const sideboardCount = sideboardCards.reduce((sum, c) => sum + c.quantity, 0);
        
        // Calculate accuracy
        const mainboardAccuracy = calculateAccuracy(mainboardCount, deckConfig.expectedCards);
        const sideboardAccuracy = calculateAccuracy(sideboardCount, deckConfig.expectedSideboard);
        const overallAccuracy = (mainboardAccuracy + sideboardAccuracy) / 2;
        
        // Determine success
        const success = mainboardCount === deckConfig.expectedCards && 
                       sideboardCount === deckConfig.expectedSideboard;
        
        // Collect errors and warnings
        const errors: string[] = [];
        const warnings: string[] = [];
        
        if (mainboardCount !== deckConfig.expectedCards) {
          errors.push(`Mainboard: ${mainboardCount}/${deckConfig.expectedCards} cards`);
        }
        if (sideboardCount !== deckConfig.expectedSideboard) {
          errors.push(`Sideboard: ${sideboardCount}/${deckConfig.expectedSideboard} cards`);
        }
        
        if (result.warnings) {
          warnings.push(...result.warnings);
        }
        
        // Check if land correction was applied
        const landCorrectionApplied = result.metadata?.landCorrectionApplied || false;
        if (landCorrectionApplied) {
          console.log(`  🔧 MTGO land correction applied`);
        }
        
        // Record results
        const testResult: TestResult = {
          deckName: deckConfig.file,
          format: 'MTGO',
          resolution: deckConfig.resolution,
          success,
          mainboardCards: mainboardCount,
          sideboardCards: sideboardCount,
          expectedMainboard: deckConfig.expectedCards,
          expectedSideboard: deckConfig.expectedSideboard,
          accuracy: overallAccuracy,
          processingTime,
          superResolutionApplied: result.metrics?.superResolutionApplied || false,
          errors,
          warnings,
          cards: result.cards,
          retryCount
        };
        
        testResults.push(testResult);
        
        // Log results
        console.log(`  ✅ Mainboard: ${mainboardCount}/${deckConfig.expectedCards}`);
        console.log(`  ✅ Sideboard: ${sideboardCount}/${deckConfig.expectedSideboard}`);
        console.log(`  📊 Accuracy: ${overallAccuracy.toFixed(2)}%`);
        console.log(`  ⏱️ Processing time: ${(processingTime / 1000).toFixed(2)}s`);
        if (result.metrics?.superResolutionApplied) {
          console.log(`  🔍 Super-resolution applied`);
        }
        
        // Assertions
        expect(mainboardCount).toBe(deckConfig.expectedCards);
        expect(sideboardCount).toBe(deckConfig.expectedSideboard);
        expect(success).toBe(true);
      },
      TEST_CONFIG.timeout
    );
  });
});

// Performance Tests
describe('Performance Validation', () => {
  test('Average processing time should be under 10 seconds', () => {
    if (testResults.length === 0) {
      console.warn('No test results available for performance validation');
      return;
    }
    
    const avgTime = testResults.reduce((sum, r) => sum + r.processingTime, 0) / testResults.length;
    console.log(`\n⏱️ Average processing time: ${(avgTime / 1000).toFixed(2)}s`);
    
    expect(avgTime).toBeLessThan(10000);
  });
  
  test('Super-resolution should improve accuracy for low-res images', () => {
    const lowResResults = testResults.filter(r => 
      r.resolution.toLowerCase().includes('low') || 
      r.resolution.toLowerCase().includes('very low')
    );
    
    if (lowResResults.length === 0) {
      console.warn('No low-resolution results available');
      return;
    }
    
    const srResults = lowResResults.filter(r => r.superResolutionApplied);
    const noSrResults = lowResResults.filter(r => !r.superResolutionApplied);
    
    if (srResults.length > 0 && noSrResults.length > 0) {
      const avgSrAccuracy = srResults.reduce((sum, r) => sum + r.accuracy, 0) / srResults.length;
      const avgNoSrAccuracy = noSrResults.reduce((sum, r) => sum + r.accuracy, 0) / noSrResults.length;
      
      console.log(`\n🔍 Super-resolution impact:`);
      console.log(`  With SR: ${avgSrAccuracy.toFixed(2)}% accuracy`);
      console.log(`  Without SR: ${avgNoSrAccuracy.toFixed(2)}% accuracy`);
      
      expect(avgSrAccuracy).toBeGreaterThanOrEqual(avgNoSrAccuracy);
    }
  });
});

// Export for CI/CD integration
export { testResults, generateHTMLReport };