#!/usr/bin/env node

/**
 * Test Report Generator
 * Generates a comprehensive HTML report of all test results
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class TestReportGenerator {
  constructor() {
    this.timestamp = new Date().toISOString();
    this.results = {
      timestamp: this.timestamp,
      webService: null,
      discordBot: null,
      images: [],
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        successRate: 0,
        guarantee60_15: false
      }
    };
  }

  runTests() {
    console.log('🧪 Running comprehensive test suite...\n');
    
    // Generate test images if needed
    if (!fs.existsSync('server/tests/test-images/arena-standard.png')) {
      console.log('📸 Generating test images...');
      execSync('node server/tests/test-images/create-mtg-test-images.js', { stdio: 'inherit' });
    }
    
    // Run web service tests
    console.log('\n🌐 Testing Web Service...');
    try {
      const webOutput = execSync('cd server && npm run test:real 2>&1', { encoding: 'utf-8' });
      this.results.webService = this.parseWebResults(webOutput);
    } catch (error) {
      this.results.webService = { success: false, error: error.message };
    }
    
    // Run Discord bot tests
    console.log('\n🤖 Testing Discord Bot...');
    try {
      const botOutput = execSync('cd discord-bot && python -m pytest tests/test_real_images.py -v 2>&1', { encoding: 'utf-8' });
      this.results.discordBot = this.parseBotResults(botOutput);
    } catch (error) {
      this.results.discordBot = { success: false, error: error.message };
    }
    
    // Calculate summary
    this.calculateSummary();
  }

  parseWebResults(output) {
    const result = {
      success: output.includes('ALL TESTS PASSED'),
      tests: [],
      averageTime: 0
    };
    
    // Extract test results
    const testPattern = /✅\s+([^:]+).*?(\d+)\+(\d+).*?(\d+)ms/g;
    let match;
    while ((match = testPattern.exec(output)) !== null) {
      result.tests.push({
        name: match[1],
        mainboard: parseInt(match[2]),
        sideboard: parseInt(match[3]),
        time: parseInt(match[4]),
        passed: match[2] === '60' && match[3] === '15'
      });
    }
    
    if (result.tests.length > 0) {
      result.averageTime = result.tests.reduce((sum, t) => sum + t.time, 0) / result.tests.length;
    }
    
    return result;
  }

  parseBotResults(output) {
    const result = {
      success: output.includes('passed'),
      tests: [],
      averageTime: 0
    };
    
    // Extract test results
    const testPattern = /test_([^\s]+).*?(PASSED|FAILED)/g;
    let match;
    while ((match = testPattern.exec(output)) !== null) {
      result.tests.push({
        name: match[1],
        passed: match[2] === 'PASSED'
      });
    }
    
    return result;
  }

  calculateSummary() {
    const webTests = this.results.webService?.tests || [];
    const botTests = this.results.discordBot?.tests || [];
    
    this.results.summary.totalTests = webTests.length + botTests.length;
    this.results.summary.passed = webTests.filter(t => t.passed).length + botTests.filter(t => t.passed).length;
    this.results.summary.failed = this.results.summary.totalTests - this.results.summary.passed;
    this.results.summary.successRate = this.results.summary.totalTests > 0 
      ? (this.results.summary.passed / this.results.summary.totalTests * 100).toFixed(1)
      : 0;
    
    // Check if 60+15 guarantee is maintained
    this.results.summary.guarantee60_15 = webTests.every(t => t.mainboard === 60 && t.sideboard === 15);
  }

  generateHTML() {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MTG OCR Test Report - ${new Date(this.timestamp).toLocaleDateString()}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 2rem;
        }
        .container {
            max-width: 1200px;
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
        .header .timestamp {
            opacity: 0.9;
            font-size: 1rem;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            padding: 2rem;
            background: #f8f9fa;
        }
        .summary-card {
            background: white;
            padding: 1.5rem;
            border-radius: 0.5rem;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .summary-card .value {
            font-size: 2rem;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 0.5rem;
        }
        .summary-card .label {
            color: #6c757d;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .success { color: #28a745 !important; }
        .failure { color: #dc3545 !important; }
        .section {
            padding: 2rem;
        }
        .section h2 {
            font-size: 1.8rem;
            margin-bottom: 1.5rem;
            color: #333;
            border-bottom: 2px solid #667eea;
            padding-bottom: 0.5rem;
        }
        .test-grid {
            display: grid;
            gap: 1rem;
        }
        .test-card {
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 0.5rem;
            padding: 1rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: all 0.3s ease;
        }
        .test-card:hover {
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            transform: translateY(-2px);
        }
        .test-card.passed {
            border-left: 4px solid #28a745;
        }
        .test-card.failed {
            border-left: 4px solid #dc3545;
        }
        .test-name {
            font-weight: 500;
            color: #333;
        }
        .test-result {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        .badge {
            padding: 0.25rem 0.75rem;
            border-radius: 1rem;
            font-size: 0.85rem;
            font-weight: 500;
        }
        .badge.success {
            background: #d4edda;
            color: #155724;
        }
        .badge.failure {
            background: #f8d7da;
            color: #721c24;
        }
        .guarantee-banner {
            margin: 2rem;
            padding: 1.5rem;
            border-radius: 0.5rem;
            text-align: center;
            font-size: 1.2rem;
            font-weight: 500;
        }
        .guarantee-banner.success {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
        }
        .guarantee-banner.failure {
            background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
            color: white;
        }
        .footer {
            background: #f8f9fa;
            padding: 1.5rem;
            text-align: center;
            color: #6c757d;
            font-size: 0.9rem;
        }
        .performance-chart {
            display: flex;
            justify-content: space-around;
            align-items: flex-end;
            height: 200px;
            margin: 2rem 0;
            padding: 1rem;
            background: #f8f9fa;
            border-radius: 0.5rem;
        }
        .bar {
            flex: 1;
            max-width: 100px;
            background: linear-gradient(to top, #667eea, #764ba2);
            border-radius: 0.5rem 0.5rem 0 0;
            position: relative;
            margin: 0 1rem;
        }
        .bar-label {
            position: absolute;
            bottom: -30px;
            left: 50%;
            transform: translateX(-50%);
            white-space: nowrap;
            font-size: 0.9rem;
            color: #6c757d;
        }
        .bar-value {
            position: absolute;
            top: -25px;
            left: 50%;
            transform: translateX(-50%);
            font-weight: bold;
            color: #333;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎴 MTG OCR Test Report</h1>
            <div class="timestamp">Generated on ${new Date(this.timestamp).toLocaleString()}</div>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <div class="value">${this.results.summary.totalTests}</div>
                <div class="label">Total Tests</div>
            </div>
            <div class="summary-card">
                <div class="value success">${this.results.summary.passed}</div>
                <div class="label">Passed</div>
            </div>
            <div class="summary-card">
                <div class="value failure">${this.results.summary.failed}</div>
                <div class="label">Failed</div>
            </div>
            <div class="summary-card">
                <div class="value ${this.results.summary.successRate == 100 ? 'success' : 'failure'}">${this.results.summary.successRate}%</div>
                <div class="label">Success Rate</div>
            </div>
        </div>
        
        <div class="guarantee-banner ${this.results.summary.guarantee60_15 ? 'success' : 'failure'}">
            ${this.results.summary.guarantee60_15 
              ? '✅ 60+15 Card Guarantee VALIDATED' 
              : '❌ 60+15 Card Guarantee FAILED'}
        </div>
        
        <div class="section">
            <h2>🌐 Web Service Tests</h2>
            <div class="test-grid">
                ${this.generateTestCards(this.results.webService?.tests || [])}
            </div>
        </div>
        
        <div class="section">
            <h2>🤖 Discord Bot Tests</h2>
            <div class="test-grid">
                ${this.generateTestCards(this.results.discordBot?.tests || [])}
            </div>
        </div>
        
        <div class="section">
            <h2>📊 Performance Metrics</h2>
            <div class="performance-chart">
                ${this.generatePerformanceChart()}
            </div>
        </div>
        
        <div class="footer">
            <p>MTG Screen-to-Deck OCR Validation Suite</p>
            <p>Report generated automatically by test suite</p>
        </div>
    </div>
</body>
</html>`;
    
    return html;
  }

  generateTestCards(tests) {
    if (tests.length === 0) {
      return '<p style="color: #6c757d; text-align: center;">No tests found</p>';
    }
    
    return tests.map(test => `
        <div class="test-card ${test.passed ? 'passed' : 'failed'}">
            <div class="test-name">${test.name}</div>
            <div class="test-result">
                ${test.mainboard !== undefined ? `<span class="badge">${test.mainboard}+${test.sideboard}</span>` : ''}
                ${test.time !== undefined ? `<span class="badge">${test.time}ms</span>` : ''}
                <span class="badge ${test.passed ? 'success' : 'failure'}">
                    ${test.passed ? 'PASSED' : 'FAILED'}
                </span>
            </div>
        </div>
    `).join('');
  }

  generatePerformanceChart() {
    const webAvg = this.results.webService?.averageTime || 0;
    const botAvg = this.results.discordBot?.averageTime || 0;
    const maxTime = Math.max(webAvg, botAvg, 1);
    
    return `
        <div class="bar" style="height: ${(webAvg / maxTime) * 100}%">
            <div class="bar-value">${webAvg.toFixed(0)}ms</div>
            <div class="bar-label">Web Service</div>
        </div>
        <div class="bar" style="height: ${(botAvg / maxTime) * 100}%">
            <div class="bar-value">${botAvg.toFixed(0)}ms</div>
            <div class="bar-label">Discord Bot</div>
        </div>
    `;
  }

  saveReport() {
    const html = this.generateHTML();
    const reportPath = path.join(__dirname, 'test-report.html');
    fs.writeFileSync(reportPath, html);
    
    // Also save JSON report
    const jsonPath = path.join(__dirname, 'test-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(this.results, null, 2));
    
    console.log('\n📊 Reports generated:');
    console.log(`   HTML: ${reportPath}`);
    console.log(`   JSON: ${jsonPath}`);
    console.log('\n✨ Open test-report.html in a browser to view the detailed report');
  }

  run() {
    console.log('📝 MTG OCR Test Report Generator');
    console.log('=================================\n');
    
    this.runTests();
    this.saveReport();
    
    // Print summary to console
    console.log('\n📈 Test Summary:');
    console.log(`   Total Tests: ${this.results.summary.totalTests}`);
    console.log(`   Passed: ${this.results.summary.passed}`);
    console.log(`   Failed: ${this.results.summary.failed}`);
    console.log(`   Success Rate: ${this.results.summary.successRate}%`);
    console.log(`   60+15 Guarantee: ${this.results.summary.guarantee60_15 ? '✅ VALIDATED' : '❌ FAILED'}`);
  }
}

// Run the report generator
const generator = new TestReportGenerator();
generator.run();