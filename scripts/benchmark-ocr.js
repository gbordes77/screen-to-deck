#!/usr/bin/env node

/**
 * OCR Performance Benchmark
 * =========================
 * Measures and tracks OCR performance metrics over time
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Import OCR service
const OptimizedOCRService = require('../server/dist/services/optimizedOcrService').default;

const BENCHMARK_CONFIG = {
  iterations: 3,
  warmupRuns: 1,
  testImages: {
    'high_res': {
      path: 'test-images/mtga/MTGA deck list 4_1920x1080.jpeg',
      description: 'High resolution MTGA deck (1920x1080)'
    },
    'medium_res': {
      path: 'test-images/mtga/MTGA deck list special_1334x886.jpeg',
      description: 'Medium resolution MTGA deck (1334x886)'
    },
    'low_res': {
      path: 'test-images/mtga/MTGA deck list 2_1545x671.jpeg',
      description: 'Low resolution MTGA deck (1545x671)'
    },
    'mtgo_standard': {
      path: 'test-images/mtgo/MTGO deck list usual_1763x791.jpeg',
      description: 'Standard MTGO deck (1763x791)'
    },
    'mtgo_low': {
      path: 'test-images/mtgo/MTGO deck list usual 4_1254x432.jpeg',
      description: 'Low resolution MTGO deck (1254x432)'
    }
  },
  metrics: [
    'total_time',
    'preprocessing_time',
    'ocr_time',
    'validation_time',
    'super_resolution_time',
    'memory_used',
    'cpu_usage'
  ]
};

class OCRBenchmark {
  constructor() {
    this.results = [];
    this.ocrService = OptimizedOCRService;
  }

  async warmup() {
    console.log('🔥 Warming up...');
    const testImage = Object.values(BENCHMARK_CONFIG.testImages)[0];
    const imagePath = path.join(process.cwd(), testImage.path);
    
    if (fs.existsSync(imagePath)) {
      for (let i = 0; i < BENCHMARK_CONFIG.warmupRuns; i++) {
        await this.ocrService.processImage(imagePath);
      }
    }
    console.log('✅ Warmup complete\n');
  }

  async measurePerformance(imagePath, description) {
    const startMemory = process.memoryUsage();
    const startCpu = process.cpuUsage();
    const startTime = performance.now();
    
    const result = await this.ocrService.processImage(imagePath);
    
    const endTime = performance.now();
    const endCpu = process.cpuUsage(startCpu);
    const endMemory = process.memoryUsage();
    
    const metrics = {
      total_time: endTime - startTime,
      preprocessing_time: result.metrics?.preprocessingTime || 0,
      ocr_time: result.metrics?.ocrTime || 0,
      validation_time: (endTime - startTime) - (result.metrics?.preprocessingTime || 0) - (result.metrics?.ocrTime || 0),
      super_resolution_applied: result.metrics?.superResolutionApplied || false,
      super_resolution_time: result.metrics?.superResolutionApplied ? (result.metrics?.preprocessingTime || 0) : 0,
      memory_used: (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024, // MB
      cpu_usage: (endCpu.user + endCpu.system) / 1000, // ms
      cards_extracted: result.cards?.length || 0,
      success: result.success
    };
    
    return metrics;
  }

  async runBenchmark() {
    console.log('🚀 Starting OCR Performance Benchmark\n');
    console.log('=' .repeat(80));
    
    await this.warmup();
    
    for (const [key, config] of Object.entries(BENCHMARK_CONFIG.testImages)) {
      const imagePath = path.join(process.cwd(), config.path);
      
      if (!fs.existsSync(imagePath)) {
        console.log(`⚠️  Skipping ${key}: Image not found`);
        continue;
      }
      
      console.log(`📸 Testing: ${config.description}`);
      console.log('-'.repeat(60));
      
      const iterations = [];
      
      for (let i = 0; i < BENCHMARK_CONFIG.iterations; i++) {
        process.stdout.write(`  Run ${i + 1}/${BENCHMARK_CONFIG.iterations}... `);
        
        try {
          const metrics = await this.measurePerformance(imagePath, config.description);
          iterations.push(metrics);
          console.log(`✅ ${metrics.total_time.toFixed(2)}ms`);
        } catch (error) {
          console.log(`❌ Failed: ${error.message}`);
        }
      }
      
      if (iterations.length > 0) {
        const avgMetrics = this.calculateAverages(iterations);
        this.results.push({
          image: key,
          description: config.description,
          ...avgMetrics
        });
        
        this.printMetrics(avgMetrics);
      }
      
      console.log('');
    }
    
    this.printSummary();
    this.saveResults();
  }

  calculateAverages(iterations) {
    const avg = {};
    const keys = Object.keys(iterations[0]);
    
    for (const key of keys) {
      if (typeof iterations[0][key] === 'number') {
        const values = iterations.map(i => i[key]);
        avg[key] = {
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          std: this.calculateStdDev(values)
        };
      } else {
        avg[key] = iterations[0][key];
      }
    }
    
    return avg;
  }

  calculateStdDev(values) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquareDiff);
  }

  printMetrics(metrics) {
    console.log('\n  📊 Average Metrics:');
    console.log(`     Total Time: ${metrics.total_time.avg.toFixed(2)}ms (±${metrics.total_time.std.toFixed(2)}ms)`);
    console.log(`     Preprocessing: ${metrics.preprocessing_time.avg.toFixed(2)}ms`);
    console.log(`     OCR Time: ${metrics.ocr_time.avg.toFixed(2)}ms`);
    console.log(`     Memory Used: ${metrics.memory_used.avg.toFixed(2)}MB`);
    console.log(`     CPU Time: ${metrics.cpu_usage.avg.toFixed(2)}ms`);
    
    if (metrics.super_resolution_applied) {
      console.log(`     Super-Resolution: Applied (${metrics.super_resolution_time.avg.toFixed(2)}ms)`);
    }
  }

  printSummary() {
    console.log('=' .repeat(80));
    console.log('📈 BENCHMARK SUMMARY');
    console.log('=' .repeat(80));
    
    if (this.results.length === 0) {
      console.log('No benchmark results available');
      return;
    }
    
    // Sort by total time
    const sorted = [...this.results].sort((a, b) => a.total_time.avg - b.total_time.avg);
    
    console.log('\n🏆 Performance Ranking:');
    sorted.forEach((result, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
      console.log(`${medal} ${result.image}: ${result.total_time.avg.toFixed(2)}ms - ${result.description}`);
    });
    
    // Calculate overall statistics
    const allTimes = this.results.map(r => r.total_time.avg);
    const avgTime = allTimes.reduce((a, b) => a + b, 0) / allTimes.length;
    const minTime = Math.min(...allTimes);
    const maxTime = Math.max(...allTimes);
    
    console.log('\n📊 Overall Statistics:');
    console.log(`   Average Processing Time: ${avgTime.toFixed(2)}ms`);
    console.log(`   Fastest: ${minTime.toFixed(2)}ms`);
    console.log(`   Slowest: ${maxTime.toFixed(2)}ms`);
    console.log(`   Range: ${(maxTime - minTime).toFixed(2)}ms`);
    
    // Super-resolution statistics
    const srApplied = this.results.filter(r => r.super_resolution_applied).length;
    console.log(`\n🔍 Super-Resolution:`);
    console.log(`   Applied to ${srApplied}/${this.results.length} images`);
    
    if (srApplied > 0) {
      const srTimes = this.results
        .filter(r => r.super_resolution_applied)
        .map(r => r.super_resolution_time.avg);
      const avgSrTime = srTimes.reduce((a, b) => a + b, 0) / srTimes.length;
      console.log(`   Average SR Time: ${avgSrTime.toFixed(2)}ms`);
    }
  }

  saveResults() {
    const timestamp = new Date().toISOString();
    const resultsDir = path.join(process.cwd(), 'test-results');
    
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    const output = {
      timestamp,
      config: BENCHMARK_CONFIG,
      results: this.results,
      summary: {
        totalImages: this.results.length,
        averageTime: this.results.reduce((sum, r) => sum + r.total_time.avg, 0) / this.results.length,
        superResolutionUsed: this.results.filter(r => r.super_resolution_applied).length
      }
    };
    
    const filename = `benchmark-${Date.now()}.json`;
    const filepath = path.join(resultsDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(output, null, 2));
    console.log(`\n💾 Results saved to: ${filepath}`);
    
    // Also save as latest for easy access
    const latestPath = path.join(resultsDir, 'benchmark-latest.json');
    fs.writeFileSync(latestPath, JSON.stringify(output, null, 2));
  }

  async compareWithBaseline() {
    const baselinePath = path.join(process.cwd(), 'test-results', 'benchmark-baseline.json');
    
    if (!fs.existsSync(baselinePath)) {
      console.log('\n⚠️  No baseline found. Current results will be saved as baseline.');
      const latestPath = path.join(process.cwd(), 'test-results', 'benchmark-latest.json');
      if (fs.existsSync(latestPath)) {
        fs.copyFileSync(latestPath, baselinePath);
      }
      return;
    }
    
    const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    const current = this.results;
    
    console.log('\n📊 Comparison with Baseline:');
    console.log('=' .repeat(60));
    
    for (const currentResult of current) {
      const baselineResult = baseline.results.find(b => b.image === currentResult.image);
      
      if (baselineResult) {
        const timeDiff = currentResult.total_time.avg - baselineResult.total_time.avg;
        const percentChange = (timeDiff / baselineResult.total_time.avg) * 100;
        
        const indicator = timeDiff < 0 ? '✅' : timeDiff > 0 ? '⚠️ ' : '➖';
        const changeStr = timeDiff < 0 ? 
          `${Math.abs(percentChange).toFixed(1)}% faster` : 
          timeDiff > 0 ? 
          `${percentChange.toFixed(1)}% slower` : 
          'No change';
        
        console.log(`${indicator} ${currentResult.image}: ${changeStr}`);
        console.log(`   Current: ${currentResult.total_time.avg.toFixed(2)}ms`);
        console.log(`   Baseline: ${baselineResult.total_time.avg.toFixed(2)}ms`);
      }
    }
  }
}

// Main execution
async function main() {
  const benchmark = new OCRBenchmark();
  
  try {
    await benchmark.runBenchmark();
    await benchmark.compareWithBaseline();
    
    console.log('\n✅ Benchmark completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Benchmark failed:', error);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log(`
OCR Performance Benchmark

Usage:
  node scripts/benchmark-ocr.js [options]

Options:
  --help          Show this help message
  --baseline      Set current results as baseline
  --compare       Compare with baseline only

Examples:
  npm run test:benchmark
  node scripts/benchmark-ocr.js --baseline
  `);
  process.exit(0);
}

if (args.includes('--baseline')) {
  const latestPath = path.join(process.cwd(), 'test-results', 'benchmark-latest.json');
  const baselinePath = path.join(process.cwd(), 'test-results', 'benchmark-baseline.json');
  
  if (fs.existsSync(latestPath)) {
    fs.copyFileSync(latestPath, baselinePath);
    console.log('✅ Baseline updated with latest results');
  } else {
    console.log('❌ No latest results found. Run benchmark first.');
  }
  process.exit(0);
}

// Run benchmark
main();