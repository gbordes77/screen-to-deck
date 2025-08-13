#!/usr/bin/env ts-node
/**
 * Test script to validate OCR optimizations on problematic MTGA decks
 */

import { OptimizedOCRService } from './src/services/optimizedOcrService';
import { EnhancedOCRService } from './src/services/enhancedOcrService';
import fs from 'fs';
import path from 'path';

// Test images with known resolutions
const TEST_IMAGES = [
  { 
    path: '/Volumes/DataDisk/_Projects/screen to deck/image.webp',
    name: 'Ultra Low Res MTGA',
    resolution: '677x309',
    expectedIssue: 'Too low resolution for accurate OCR'
  },
  {
    path: '/Volumes/DataDisk/_Projects/screen to deck/image2.webp',
    name: 'Medium Res MTGA',
    resolution: '1575x749',
    expectedIssue: 'Borderline resolution, may miss some cards'
  },
  {
    path: '/Volumes/DataDisk/_Projects/screen to deck/MTGO deck list.webp',
    name: 'MTGO Format',
    resolution: '1309x551',
    expectedIssue: 'MTGO format with land counting issues'
  }
];

interface TestResult {
  image: string;
  service: string;
  time: number;
  mainboardCount: number;
  sideboardCount: number;
  totalCards: number;
  success: boolean;
  superResolutionUsed?: boolean;
  parallelProcessing?: boolean;
  cacheHits?: number;
  errors?: string[];
}

async function testImage(imagePath: string, service: any, serviceName: string): Promise<TestResult> {
  const start = Date.now();
  
  try {
    const result = await service.processImage(imagePath);
    const elapsed = Date.now() - start;
    
    const mainboard = result.cards?.filter((c: any) => c.section !== 'sideboard') || [];
    const sideboard = result.cards?.filter((c: any) => c.section === 'sideboard') || [];
    
    const mainboardCount = mainboard.reduce((sum: number, c: any) => sum + (c.quantity || 1), 0);
    const sideboardCount = sideboard.reduce((sum: number, c: any) => sum + (c.quantity || 1), 0);
    
    return {
      image: path.basename(imagePath),
      service: serviceName,
      time: elapsed,
      mainboardCount,
      sideboardCount,
      totalCards: result.cards?.length || 0,
      success: result.success && mainboardCount === 60 && sideboardCount === 15,
      superResolutionUsed: result.metrics?.superResolutionApplied,
      parallelProcessing: result.metrics?.parallelProcessing,
      cacheHits: result.metrics?.cacheHits,
      errors: result.errors
    };
  } catch (error) {
    return {
      image: path.basename(imagePath),
      service: serviceName,
      time: Date.now() - start,
      mainboardCount: 0,
      sideboardCount: 0,
      totalCards: 0,
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

async function main() {
  console.log('\n🚀 OCR OPTIMIZATION VALIDATION TEST');
  console.log('=' .repeat(80));
  console.log('Testing problematic MTGA/MTGO decks with low resolution\n');
  
  const optimizedService = new OptimizedOCRService();
  const enhancedService = new EnhancedOCRService();
  
  const results: TestResult[] = [];
  
  // Test each image with both services
  for (const testImage of TEST_IMAGES) {
    if (!fs.existsSync(testImage.path)) {
      console.log(`⚠️ Skipping ${testImage.name}: File not found`);
      continue;
    }
    
    console.log(`\n📸 Testing: ${testImage.name} (${testImage.resolution})`);
    console.log(`   Issue: ${testImage.expectedIssue}`);
    console.log('-'.repeat(60));
    
    // Test with Enhanced Service (baseline)
    console.log('  Testing Enhanced Service...');
    const enhancedResult = await testImage(testImage.path, enhancedService, 'Enhanced');
    results.push(enhancedResult);
    console.log(`  ✓ Enhanced: ${enhancedResult.time}ms, ${enhancedResult.mainboardCount}/60 + ${enhancedResult.sideboardCount}/15`);
    
    // Test with Optimized Service
    console.log('  Testing Optimized Service...');
    const optimizedResult = await testImage(testImage.path, optimizedService, 'Optimized');
    results.push(optimizedResult);
    console.log(`  ✓ Optimized: ${optimizedResult.time}ms, ${optimizedResult.mainboardCount}/60 + ${optimizedResult.sideboardCount}/15`);
    
    // Compare results
    const speedup = enhancedResult.time / optimizedResult.time;
    const accuracyImproved = !enhancedResult.success && optimizedResult.success;
    
    console.log('\n  📊 Comparison:');
    console.log(`     Speedup: ${speedup.toFixed(2)}x ${speedup > 1 ? '✅' : '❌'}`);
    console.log(`     Accuracy: ${accuracyImproved ? '✅ IMPROVED' : enhancedResult.success === optimizedResult.success ? '➖ Same' : '❌ Degraded'}`);
    
    if (optimizedResult.superResolutionUsed) {
      console.log(`     Features: 🔍 Super-Resolution Applied`);
    }
    if (optimizedResult.parallelProcessing) {
      console.log(`               ⚡ Parallel Processing Used`);
    }
  }
  
  // Generate summary report
  console.log('\n' + '='.repeat(80));
  console.log('📈 SUMMARY REPORT');
  console.log('='.repeat(80));
  
  // Group by service
  const enhancedResults = results.filter(r => r.service === 'Enhanced');
  const optimizedResults = results.filter(r => r.service === 'Optimized');
  
  // Calculate success rates
  const enhancedSuccess = enhancedResults.filter(r => r.success).length;
  const optimizedSuccess = optimizedResults.filter(r => r.success).length;
  
  console.log('\n🎯 Success Rate (60+15 cards extracted):');
  console.log(`  Enhanced:  ${enhancedSuccess}/${enhancedResults.length} (${(enhancedSuccess/enhancedResults.length*100).toFixed(0)}%)`);
  console.log(`  Optimized: ${optimizedSuccess}/${optimizedResults.length} (${(optimizedSuccess/optimizedResults.length*100).toFixed(0)}%)`);
  
  // Calculate average times
  const avgEnhancedTime = enhancedResults.reduce((sum, r) => sum + r.time, 0) / enhancedResults.length;
  const avgOptimizedTime = optimizedResults.reduce((sum, r) => sum + r.time, 0) / optimizedResults.length;
  
  console.log('\n⏱️ Average Processing Time:');
  console.log(`  Enhanced:  ${avgEnhancedTime.toFixed(0)}ms`);
  console.log(`  Optimized: ${avgOptimizedTime.toFixed(0)}ms`);
  console.log(`  Speedup:   ${(avgEnhancedTime/avgOptimizedTime).toFixed(2)}x`);
  
  // Show specific improvements for low-res images
  console.log('\n🔍 Low-Resolution Improvements:');
  for (const optResult of optimizedResults) {
    if (optResult.superResolutionUsed) {
      const enhResult = enhancedResults.find(r => r.image === optResult.image);
      if (enhResult) {
        const cardImprovement = (optResult.mainboardCount + optResult.sideboardCount) - 
                               (enhResult.mainboardCount + enhResult.sideboardCount);
        console.log(`  ${optResult.image}:`);
        console.log(`    Cards found: ${enhResult.mainboardCount + enhResult.sideboardCount} → ${optResult.mainboardCount + optResult.sideboardCount} (+${cardImprovement})`);
        console.log(`    Perfect extraction: ${optResult.success ? '✅' : '❌'}`);
      }
    }
  }
  
  // Save detailed results
  const reportPath = path.join(__dirname, 'optimization-test-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Detailed results saved to: ${reportPath}`);
  
  // Final verdict
  console.log('\n' + '='.repeat(80));
  if (optimizedSuccess > enhancedSuccess) {
    console.log('🎉 OPTIMIZATION SUCCESS! Better accuracy with super-resolution!');
  } else if (optimizedSuccess === enhancedSuccess && avgOptimizedTime < avgEnhancedTime) {
    console.log('✅ OPTIMIZATION SUCCESS! Same accuracy but faster!');
  } else {
    console.log('⚠️ Optimization needs tuning for better results.');
  }
  console.log('='.repeat(80) + '\n');
}

// Run the test
main().catch(console.error);