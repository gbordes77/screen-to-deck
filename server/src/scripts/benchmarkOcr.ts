#!/usr/bin/env node
/**
 * OCR Performance Benchmark Script
 * Compares original vs optimized OCR pipeline
 */

import fs from 'fs';
import path from 'path';
import { EnhancedOCRService } from '../services/enhancedOcrService';
import { OptimizedOCRService } from '../services/optimizedOcrService';

interface BenchmarkResult {
  service: string;
  imagePath: string;
  resolution: string;
  processingTime: number;
  cardsFound: number;
  mainboardCount: number;
  sideboardCount: number;
  superResolutionUsed: boolean;
  parallelProcessing: boolean;
  cacheHits: number;
  success: boolean;
  errors?: string[];
}

class OCRBenchmark {
  private enhancedService: EnhancedOCRService;
  private optimizedService: OptimizedOCRService;
  private results: BenchmarkResult[] = [];

  constructor() {
    this.enhancedService = new EnhancedOCRService();
    this.optimizedService = new OptimizedOCRService();
  }

  /**
   * Run benchmark on a single image
   */
  async benchmarkImage(imagePath: string): Promise<void> {
    console.log('\n' + '='.repeat(80));
    console.log(`📸 Benchmarking: ${path.basename(imagePath)}`);
    console.log('='.repeat(80));

    // Get image info
    const imageInfo = await this.getImageInfo(imagePath);
    console.log(`📊 Image Resolution: ${imageInfo.resolution}`);

    // Test 1: Enhanced OCR Service (baseline)
    console.log('\n🔄 Testing Enhanced OCR Service (baseline)...');
    const enhancedResult = await this.testService(
      'Enhanced',
      imagePath,
      imageInfo.resolution,
      () => this.enhancedService.processImage(imagePath)
    );
    this.results.push(enhancedResult);

    // Test 2: Optimized OCR Service
    console.log('\n🚀 Testing Optimized OCR Service...');
    const optimizedResult = await this.testService(
      'Optimized',
      imagePath,
      imageInfo.resolution,
      () => this.optimizedService.processImage(imagePath)
    );
    this.results.push(optimizedResult);

    // Compare results
    this.compareResults(enhancedResult, optimizedResult);
  }

  /**
   * Test a specific OCR service
   */
  private async testService(
    serviceName: string,
    imagePath: string,
    resolution: string,
    processFunc: () => Promise<any>
  ): Promise<BenchmarkResult> {
    const startTime = Date.now();
    
    try {
      const result = await processFunc();
      const processingTime = Date.now() - startTime;
      
      const mainboardCards = result.cards?.filter((c: any) => c.section !== 'sideboard') || [];
      const sideboardCards = result.cards?.filter((c: any) => c.section === 'sideboard') || [];
      
      const mainboardCount = mainboardCards.reduce((sum: number, c: any) => sum + (c.quantity || 1), 0);
      const sideboardCount = sideboardCards.reduce((sum: number, c: any) => sum + (c.quantity || 1), 0);
      
      return {
        service: serviceName,
        imagePath,
        resolution,
        processingTime,
        cardsFound: result.cards?.length || 0,
        mainboardCount,
        sideboardCount,
        superResolutionUsed: result.metrics?.superResolutionApplied || false,
        parallelProcessing: result.metrics?.parallelProcessing || false,
        cacheHits: result.metrics?.cacheHits || 0,
        success: result.success || false,
        errors: result.errors
      };
    } catch (error) {
      return {
        service: serviceName,
        imagePath,
        resolution,
        processingTime: Date.now() - startTime,
        cardsFound: 0,
        mainboardCount: 0,
        sideboardCount: 0,
        superResolutionUsed: false,
        parallelProcessing: false,
        cacheHits: 0,
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Get image information
   */
  private async getImageInfo(imagePath: string): Promise<{ resolution: string }> {
    try {
      // Try to use sharp to get metadata
      const sharp = require('sharp');
      const metadata = await sharp(imagePath).metadata();
      return {
        resolution: `${metadata.width}x${metadata.height}`
      };
    } catch {
      return { resolution: 'Unknown' };
    }
  }

  /**
   * Compare two benchmark results
   */
  private compareResults(baseline: BenchmarkResult, optimized: BenchmarkResult): void {
    console.log('\n' + '📊 COMPARISON RESULTS '.padEnd(80, '='));
    
    const speedup = baseline.processingTime / optimized.processingTime;
    const accuracyBaseline = baseline.mainboardCount === 60 && baseline.sideboardCount === 15;
    const accuracyOptimized = optimized.mainboardCount === 60 && optimized.sideboardCount === 15;
    
    console.log('\n⏱️  Performance:');
    console.log(`  • Baseline:  ${baseline.processingTime}ms`);
    console.log(`  • Optimized: ${optimized.processingTime}ms`);
    console.log(`  • Speedup:   ${speedup.toFixed(2)}x ${speedup > 1 ? '🚀' : ''}`);
    
    console.log('\n🎯 Accuracy:');
    console.log(`  • Baseline:  ${baseline.mainboardCount}/60 main, ${baseline.sideboardCount}/15 side ${accuracyBaseline ? '✅' : '❌'}`);
    console.log(`  • Optimized: ${optimized.mainboardCount}/60 main, ${optimized.sideboardCount}/15 side ${accuracyOptimized ? '✅' : '❌'}`);
    
    console.log('\n🔧 Features Used:');
    console.log(`  • Super-Resolution: ${optimized.superResolutionUsed ? '✅' : '❌'}`);
    console.log(`  • Parallel Processing: ${optimized.parallelProcessing ? '✅' : '❌'}`);
    console.log(`  • Cache Hits: ${optimized.cacheHits}`);
    
    if (speedup > 1.5 && accuracyOptimized) {
      console.log('\n🎉 OPTIMIZATION SUCCESS! Faster and accurate!');
    } else if (speedup > 1) {
      console.log('\n✅ Optimization improved performance');
    }
  }

  /**
   * Generate final report
   */
  generateReport(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📈 FINAL BENCHMARK REPORT');
    console.log('='.repeat(80));
    
    // Group results by service
    const enhancedResults = this.results.filter(r => r.service === 'Enhanced');
    const optimizedResults = this.results.filter(r => r.service === 'Optimized');
    
    // Calculate averages
    const avgEnhancedTime = enhancedResults.reduce((sum, r) => sum + r.processingTime, 0) / enhancedResults.length;
    const avgOptimizedTime = optimizedResults.reduce((sum, r) => sum + r.processingTime, 0) / optimizedResults.length;
    const overallSpeedup = avgEnhancedTime / avgOptimizedTime;
    
    console.log('\n📊 Overall Performance:');
    console.log(`  • Average Enhanced Time: ${avgEnhancedTime.toFixed(0)}ms`);
    console.log(`  • Average Optimized Time: ${avgOptimizedTime.toFixed(0)}ms`);
    console.log(`  • Overall Speedup: ${overallSpeedup.toFixed(2)}x`);
    
    console.log('\n🎯 Accuracy Summary:');
    for (const result of optimizedResults) {
      const perfect = result.mainboardCount === 60 && result.sideboardCount === 15;
      console.log(`  • ${path.basename(result.imagePath)}: ${result.mainboardCount}/60 + ${result.sideboardCount}/15 ${perfect ? '✅' : '❌'}`);
    }
    
    console.log('\n💡 Optimization Features Usage:');
    const srUsage = optimizedResults.filter(r => r.superResolutionUsed).length;
    const parallelUsage = optimizedResults.filter(r => r.parallelProcessing).length;
    console.log(`  • Super-Resolution Used: ${srUsage}/${optimizedResults.length} images`);
    console.log(`  • Parallel Processing Used: ${parallelUsage}/${optimizedResults.length} images`);
    
    // Specific improvements for low-res images
    console.log('\n🔍 Low-Resolution Image Improvements:');
    for (const result of optimizedResults) {
      if (result.superResolutionUsed) {
        const baseline = enhancedResults.find(r => r.imagePath === result.imagePath);
        if (baseline) {
          const improvement = baseline.mainboardCount < result.mainboardCount || 
                            baseline.sideboardCount < result.sideboardCount;
          console.log(`  • ${path.basename(result.imagePath)} (${result.resolution}): ${improvement ? '✅ Improved extraction' : '➖ Same results'}`);
        }
      }
    }
    
    // Save detailed results to file
    const reportPath = path.join(__dirname, '../../benchmark-results.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 Detailed results saved to: ${reportPath}`);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 OCR Performance Benchmark Tool');
  console.log('Comparing Enhanced vs Optimized OCR Services\n');
  
  const benchmark = new OCRBenchmark();
  
  // Define test images
  const testImages = [
    '/Volumes/DataDisk/_Projects/screen to deck/image.webp',        // 677x309 - Very low res
    '/Volumes/DataDisk/_Projects/screen to deck/image2.webp',       // 1575x749 - Medium res
    '/Volumes/DataDisk/_Projects/screen to deck/MTGO deck list.webp' // 1309x551 - MTGO format
  ];
  
  // Add any additional test images from arguments
  if (process.argv.length > 2) {
    testImages.push(...process.argv.slice(2));
  }
  
  // Filter to existing files
  const validImages = testImages.filter(img => {
    if (fs.existsSync(img)) {
      return true;
    } else {
      console.warn(`⚠️ Image not found: ${img}`);
      return false;
    }
  });
  
  if (validImages.length === 0) {
    console.error('❌ No valid test images found!');
    process.exit(1);
  }
  
  console.log(`📸 Testing ${validImages.length} images...\n`);
  
  // Run benchmarks
  for (const imagePath of validImages) {
    await benchmark.benchmarkImage(imagePath);
  }
  
  // Generate report
  benchmark.generateReport();
  
  console.log('\n✅ Benchmark complete!');
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { OCRBenchmark };