#!/usr/bin/env node

/**
 * Validation Test Runner
 * ======================
 * Local test runner for OCR validation suite
 * 
 * Usage:
 *   npm run validate             # Run all tests
 *   npm run validate:mtga        # Run MTGA tests only
 *   npm run validate:mtgo        # Run MTGO tests only
 *   npm run validate:performance # Run performance tests only
 *   npm run validate:report      # Generate HTML report from last run
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Configuration
const CONFIG = {
  testDir: path.join(__dirname, '..', 'tests'),
  resultsDir: path.join(__dirname, '..', 'test-results'),
  imageDir: path.join(__dirname, '..', 'test-images'),
  validatedDir: path.join(__dirname, '..', 'validated_decklists'),
  
  testSuites: {
    all: 'automated-validation-suite.test.ts',
    mtga: '--testNamePattern="MTGA Deck Validation"',
    mtgo: '--testNamePattern="MTGO Deck Validation"',
    performance: '--testNamePattern="Performance Validation"'
  },
  
  jestConfig: {
    testTimeout: 60000,
    maxWorkers: 4,
    verbose: true,
    coverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    testEnvironment: 'node'
  }
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const prefix = `[${timestamp}]`;
  
  switch (type) {
    case 'success':
      console.log(chalk.green(`${prefix} ✅ ${message}`));
      break;
    case 'error':
      console.error(chalk.red(`${prefix} ❌ ${message}`));
      break;
    case 'warning':
      console.warn(chalk.yellow(`${prefix} ⚠️  ${message}`));
      break;
    case 'info':
      console.log(chalk.blue(`${prefix} ℹ️  ${message}`));
      break;
    default:
      console.log(`${prefix} ${message}`);
  }
}

function ensureDirectories() {
  const dirs = [
    CONFIG.resultsDir,
    CONFIG.imageDir,
    path.join(CONFIG.imageDir, 'mtga'),
    path.join(CONFIG.imageDir, 'mtgo'),
    CONFIG.validatedDir
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log(`Created directory: ${dir}`, 'info');
    }
  });
}

function checkEnvironment() {
  const issues = [];
  
  // Check Node version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
  if (majorVersion < 16) {
    issues.push(`Node.js version ${nodeVersion} is too old. Please use Node.js 16 or higher.`);
  }
  
  // Check for required environment variables
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'TO_BE_SET') {
    issues.push('OPENAI_API_KEY is not set or invalid');
  }
  
  // Check for Python
  const pythonCheck = spawn('python3', ['--version'], { shell: true });
  pythonCheck.on('error', () => {
    issues.push('Python 3 is not installed or not in PATH');
  });
  
  // Check for required npm packages
  const requiredPackages = ['jest', '@types/jest', 'sharp'];
  const packageJson = require(path.join(__dirname, '..', 'package.json'));
  
  requiredPackages.forEach(pkg => {
    if (!packageJson.dependencies?.[pkg] && !packageJson.devDependencies?.[pkg]) {
      issues.push(`Required package '${pkg}' is not installed`);
    }
  });
  
  return issues;
}

function downloadTestImages() {
  log('Checking for test images...', 'info');
  
  // List of expected test images
  const expectedImages = {
    mtga: [
      'MTGA deck list 4_1920x1080.jpeg',
      'MTGA deck list special_1334x886.jpeg',
      'MTGA deck list 2_1545x671.jpeg',
      'MTGA deck list 3_1835x829.jpeg',
      'MTGA deck list _1593x831.jpeg',
      'MTGA deck list_1535x728.jpeg'
    ],
    mtgo: [
      'MTGO deck list usual_1763x791.jpeg',
      'MTGO deck list usual 4_1254x432.jpeg',
      'MTGO deck list usual 2_1763x791.jpeg',
      'MTGO deck list usual 3_1763x791.jpeg',
      'MTGO deck list usual 5_1763x791.jpeg',
      'MTGO deck list usual 6_1763x791.jpeg',
      'MTGO deck list usual 7_1763x791.jpeg',
      'MTGO deck list usual 8_1763x791.jpeg'
    ]
  };
  
  let missingImages = [];
  
  for (const [format, images] of Object.entries(expectedImages)) {
    for (const image of images) {
      const imagePath = path.join(CONFIG.imageDir, format, image);
      if (!fs.existsSync(imagePath)) {
        missingImages.push(`${format}/${image}`);
      }
    }
  }
  
  if (missingImages.length > 0) {
    log(`Missing ${missingImages.length} test images:`, 'warning');
    missingImages.forEach(img => console.log(`  - ${img}`));
    log('Please ensure all test images are available in the test-images directory', 'warning');
    return false;
  }
  
  log('All test images found', 'success');
  return true;
}

function runTests(suite = 'all') {
  return new Promise((resolve, reject) => {
    log(`Starting ${suite} test suite...`, 'info');
    
    const args = [
      'test',
      '--',
      path.join(CONFIG.testDir, 'automated-validation-suite.test.ts'),
      '--coverage',
      '--coverageDirectory=' + CONFIG.jestConfig.coverageDirectory,
      '--testTimeout=' + CONFIG.jestConfig.testTimeout,
      '--maxWorkers=' + CONFIG.jestConfig.maxWorkers
    ];
    
    if (suite !== 'all' && CONFIG.testSuites[suite]) {
      args.push(CONFIG.testSuites[suite]);
    }
    
    const testProcess = spawn('npm', args, {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, NODE_ENV: 'test' }
    });
    
    testProcess.on('close', (code) => {
      if (code === 0) {
        log('Tests completed successfully', 'success');
        resolve();
      } else {
        log(`Tests failed with exit code ${code}`, 'error');
        reject(new Error(`Test suite failed with code ${code}`));
      }
    });
    
    testProcess.on('error', (err) => {
      log(`Failed to run tests: ${err.message}`, 'error');
      reject(err);
    });
  });
}

function generateReport() {
  log('Generating HTML report...', 'info');
  
  // Find the most recent JSON report
  const files = fs.readdirSync(CONFIG.resultsDir);
  const jsonFiles = files.filter(f => f.endsWith('.json')).sort().reverse();
  
  if (jsonFiles.length === 0) {
    log('No test results found. Run tests first.', 'warning');
    return;
  }
  
  const latestReport = path.join(CONFIG.resultsDir, jsonFiles[0]);
  const reportData = JSON.parse(fs.readFileSync(latestReport, 'utf8'));
  
  // Display summary
  console.log('\n' + chalk.cyan('='.repeat(80)));
  console.log(chalk.cyan.bold('TEST RESULTS SUMMARY'));
  console.log(chalk.cyan('='.repeat(80)));
  
  const { summary } = reportData;
  const passRate = (summary.passed / summary.totalTests * 100).toFixed(1);
  
  console.log(`Total Tests: ${chalk.white.bold(summary.totalTests)}`);
  console.log(`Passed: ${chalk.green.bold(summary.passed)} (${chalk.green(passRate + '%')})`);
  console.log(`Failed: ${chalk.red.bold(summary.failed)}`);
  console.log(`Overall Accuracy: ${chalk.yellow.bold(summary.overallAccuracy.toFixed(2) + '%')}`);
  console.log(`Avg Processing Time: ${chalk.blue.bold((summary.avgProcessingTime / 1000).toFixed(2) + 's')}`);
  
  // Display per-format results
  const mtgaResults = reportData.results.filter(r => r.format === 'MTGA');
  const mtgoResults = reportData.results.filter(r => r.format === 'MTGO');
  
  if (mtgaResults.length > 0) {
    console.log('\n' + chalk.magenta('MTGA Results:'));
    const mtgaPassed = mtgaResults.filter(r => r.success).length;
    console.log(`  ${mtgaPassed}/${mtgaResults.length} passed`);
  }
  
  if (mtgoResults.length > 0) {
    console.log('\n' + chalk.magenta('MTGO Results:'));
    const mtgoPassed = mtgoResults.filter(r => r.success).length;
    console.log(`  ${mtgoPassed}/${mtgoResults.length} passed`);
  }
  
  // Show failed tests
  const failedTests = reportData.results.filter(r => !r.success);
  if (failedTests.length > 0) {
    console.log('\n' + chalk.red.bold('Failed Tests:'));
    failedTests.forEach(test => {
      console.log(chalk.red(`  ❌ ${test.deckName}`));
      console.log(`     Mainboard: ${test.mainboardCards}/${test.expectedMainboard}`);
      console.log(`     Sideboard: ${test.sideboardCards}/${test.expectedSideboard}`);
      if (test.errors.length > 0) {
        test.errors.forEach(err => console.log(chalk.gray(`     ${err}`)));
      }
    });
  }
  
  console.log(chalk.cyan('='.repeat(80)) + '\n');
  
  const htmlPath = latestReport.replace('.json', '.html');
  if (fs.existsSync(htmlPath)) {
    log(`HTML report available at: ${htmlPath}`, 'success');
    
    // Try to open in browser
    const platform = process.platform;
    const openCommand = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
    spawn(openCommand, [htmlPath], { shell: true });
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'all';
  
  console.log(chalk.cyan.bold('\n🎯 MTG OCR Validation Test Runner\n'));
  
  // Check environment
  log('Checking environment...', 'info');
  const issues = checkEnvironment();
  if (issues.length > 0) {
    log('Environment issues detected:', 'error');
    issues.forEach(issue => console.log(chalk.red(`  - ${issue}`)));
    process.exit(1);
  }
  log('Environment check passed', 'success');
  
  // Ensure directories exist
  ensureDirectories();
  
  // Check for test images
  if (!downloadTestImages()) {
    log('Continuing without all test images...', 'warning');
  }
  
  // Handle commands
  switch (command) {
    case 'report':
      generateReport();
      break;
      
    case 'mtga':
    case 'mtgo':
    case 'performance':
      try {
        await runTests(command);
        generateReport();
      } catch (error) {
        log(`Test execution failed: ${error.message}`, 'error');
        process.exit(1);
      }
      break;
      
    case 'all':
    default:
      try {
        await runTests('all');
        generateReport();
      } catch (error) {
        log(`Test execution failed: ${error.message}`, 'error');
        process.exit(1);
      }
      break;
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  log(`Unhandled rejection: ${error}`, 'error');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log(`Uncaught exception: ${error}`, 'error');
  process.exit(1);
});

// Run main function
main().catch(error => {
  log(`Fatal error: ${error.message}`, 'error');
  process.exit(1);
});