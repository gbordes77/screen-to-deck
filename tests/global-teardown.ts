/**
 * Global Test Teardown
 * ====================
 * Runs once after all test suites
 */

import fs from 'fs';
import path from 'path';

export default async function globalTeardown() {
  console.log('\n' + '=' .repeat(80));
  console.log('\n🧹 Running global test teardown...\n');
  
  // Clean up temporary files
  const tempDirs = ['temp', 'uploads'];
  
  for (const dir of tempDirs) {
    const fullPath = path.join(process.cwd(), dir);
    if (fs.existsSync(fullPath)) {
      const files = fs.readdirSync(fullPath);
      for (const file of files) {
        if (file.startsWith('test-') || file.endsWith('_sr_optimized.png') || file.endsWith('_zone.png')) {
          const filePath = path.join(fullPath, file);
          fs.unlinkSync(filePath);
        }
      }
      console.log(`🗑️  Cleaned up ${files.length} files in ${dir}/`);
    }
  }
  
  // Generate summary report
  const testRunId = process.env.TEST_RUN_ID;
  const resultsDir = path.join(process.cwd(), 'test-results');
  
  if (fs.existsSync(resultsDir)) {
    const files = fs.readdirSync(resultsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json') && f.includes(testRunId || ''));
    
    if (jsonFiles.length > 0) {
      console.log(`\n📊 Test run ${testRunId} generated ${jsonFiles.length} report(s)`);
      
      // Find and display the latest report
      const latestReport = jsonFiles.sort().reverse()[0];
      const reportPath = path.join(resultsDir, latestReport);
      
      try {
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        if (report.summary) {
          console.log('\n📈 Test Summary:');
          console.log(`   Total Tests: ${report.summary.totalTests}`);
          console.log(`   Passed: ${report.summary.passed}`);
          console.log(`   Failed: ${report.summary.failed}`);
          console.log(`   Accuracy: ${report.summary.overallAccuracy?.toFixed(2)}%`);
        }
      } catch (error) {
        // Silent fail - report might not exist or be malformed
      }
    }
  }
  
  console.log('\n✅ Global teardown complete\n');
}