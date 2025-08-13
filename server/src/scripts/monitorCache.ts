#!/usr/bin/env node
/**
 * Cache Monitoring Dashboard
 * Real-time monitoring of cache performance and optimization metrics
 */

import { getCacheService } from '../services/cacheService';
import { getOptimizedScryfallService } from '../services/scryfallOptimized';
import { table } from 'table';
import chalk from 'chalk';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

// Load environment variables
dotenv.config();

interface MonitoringData {
  timestamp: Date;
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
    totalEntries: number;
    memoryUsageMB: number;
    avgAccessTimeMs: number;
  };
  optimization: {
    cacheHitRate: number;
    avgResponseTime: number;
    fuzzyMatchSuccess: number;
    batchEfficiency: number;
  };
  topCards: Array<{ name: string; hits: number }>;
}

class CacheMonitor {
  private cache = getCacheService();
  private scryfallService = getOptimizedScryfallService();
  private history: MonitoringData[] = [];
  private isRunning = false;

  async start(intervalMs = 5000) {
    console.clear();
    console.log(chalk.cyan.bold('🔍 MTG Cache Monitoring Dashboard'));
    console.log(chalk.gray('='.repeat(80)));
    
    await this.cache.connect();
    this.isRunning = true;

    // Initial display
    await this.collectAndDisplay();

    // Set up interval
    const interval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(interval);
        return;
      }
      await this.collectAndDisplay();
    }, intervalMs);

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log(chalk.yellow('\n\n📊 Shutting down monitor...'));
      this.isRunning = false;
      await this.exportReport();
      await this.cache.disconnect();
      process.exit(0);
    });
  }

  private async collectAndDisplay() {
    const data = await this.collectMetrics();
    this.history.push(data);
    
    // Keep only last 100 entries
    if (this.history.length > 100) {
      this.history.shift();
    }

    this.displayDashboard(data);
  }

  private async collectMetrics(): Promise<MonitoringData> {
    const cacheMetrics = await this.cache.getMetrics();
    const optimizationMetrics = this.scryfallService.getMetrics();

    return {
      timestamp: new Date(),
      cache: {
        hits: cacheMetrics.hits,
        misses: cacheMetrics.misses,
        hitRate: cacheMetrics.hitRate,
        totalEntries: cacheMetrics.totalEntries,
        memoryUsageMB: cacheMetrics.memoryUsage / 1024 / 1024,
        avgAccessTimeMs: cacheMetrics.avgAccessTime,
      },
      optimization: optimizationMetrics,
      topCards: cacheMetrics.popularKeys.slice(0, 10).map(k => ({
        name: k.key.split(':').pop() || k.key,
        hits: k.hits,
      })),
    };
  }

  private displayDashboard(data: MonitoringData) {
    console.clear();
    
    // Header
    console.log(chalk.cyan.bold('🔍 MTG Cache Monitoring Dashboard'));
    console.log(chalk.gray(`Last Update: ${data.timestamp.toLocaleTimeString()}`));
    console.log(chalk.gray('='.repeat(80)));

    // Cache Performance
    console.log(chalk.yellow.bold('\n📊 Cache Performance'));
    const cacheTable = [
      ['Metric', 'Value', 'Status'],
      ['Hit Rate', `${(data.cache.hitRate * 100).toFixed(1)}%`, this.getStatusColor(data.cache.hitRate, 0.8, 0.6)],
      ['Total Hits', data.cache.hits.toString(), chalk.green(data.cache.hits.toString())],
      ['Total Misses', data.cache.misses.toString(), chalk.red(data.cache.misses.toString())],
      ['Cache Entries', data.cache.totalEntries.toString(), chalk.blue(data.cache.totalEntries.toString())],
      ['Memory Usage', `${data.cache.memoryUsageMB.toFixed(2)} MB`, this.getMemoryStatus(data.cache.memoryUsageMB)],
      ['Avg Access Time', `${data.cache.avgAccessTimeMs.toFixed(2)} ms`, this.getSpeedStatus(data.cache.avgAccessTimeMs)],
    ];
    console.log(table(cacheTable, {
      border: {
        topBody: '─',
        topJoin: '┬',
        topLeft: '┌',
        topRight: '┐',
        bottomBody: '─',
        bottomJoin: '┴',
        bottomLeft: '└',
        bottomRight: '┘',
        bodyLeft: '│',
        bodyRight: '│',
        bodyJoin: '│',
        joinBody: '─',
        joinLeft: '├',
        joinRight: '┤',
        joinJoin: '┼'
      }
    }));

    // Optimization Metrics
    console.log(chalk.yellow.bold('\n⚡ Optimization Metrics'));
    const optTable = [
      ['Metric', 'Value', 'Efficiency'],
      ['Cache Hit Rate', `${(data.optimization.cacheHitRate * 100).toFixed(1)}%`, this.getEfficiencyBar(data.optimization.cacheHitRate)],
      ['Avg Response Time', `${data.optimization.avgResponseTime.toFixed(1)} ms`, this.getSpeedStatus(data.optimization.avgResponseTime)],
      ['Fuzzy Match Success', `${(data.optimization.fuzzyMatchSuccess * 100).toFixed(1)}%`, this.getEfficiencyBar(data.optimization.fuzzyMatchSuccess)],
      ['Batch Efficiency', `${(data.optimization.batchEfficiency * 100).toFixed(1)}%`, this.getEfficiencyBar(data.optimization.batchEfficiency)],
    ];
    console.log(table(optTable));

    // Top Cached Cards
    if (data.topCards.length > 0) {
      console.log(chalk.yellow.bold('\n🎯 Most Accessed Cards'));
      const topCardsTable = [
        ['Rank', 'Card Name', 'Cache Hits'],
        ...data.topCards.map((card, i) => [
          `#${i + 1}`,
          card.name,
          chalk.cyan(card.hits.toString()),
        ]),
      ];
      console.log(table(topCardsTable));
    }

    // Historical Trend
    if (this.history.length > 1) {
      console.log(chalk.yellow.bold('\n📈 Performance Trend (Last 10 Updates)'));
      this.displayTrend();
    }

    // Instructions
    console.log(chalk.gray('\nPress Ctrl+C to stop monitoring and export report'));
  }

  private displayTrend() {
    const recent = this.history.slice(-10);
    const hitRates = recent.map(d => d.cache.hitRate);
    const responseTimes = recent.map(d => d.optimization.avgResponseTime);
    
    // Simple ASCII chart for hit rate
    const maxRate = Math.max(...hitRates);
    const minRate = Math.min(...hitRates);
    const height = 5;
    
    console.log(chalk.gray('Hit Rate Trend:'));
    for (let h = height; h >= 0; h--) {
      const threshold = minRate + (maxRate - minRate) * (h / height);
      let line = '';
      for (const rate of hitRates) {
        if (rate >= threshold) {
          line += chalk.green('█');
        } else {
          line += ' ';
        }
        line += ' ';
      }
      console.log(`${(threshold * 100).toFixed(0).padStart(3)}% │${line}`);
    }
    console.log('     └' + '─'.repeat(hitRates.length * 2));
    
    // Average metrics
    const avgHitRate = hitRates.reduce((a, b) => a + b, 0) / hitRates.length;
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    
    console.log(chalk.gray(`\nAverages: Hit Rate: ${(avgHitRate * 100).toFixed(1)}% | Response Time: ${avgResponseTime.toFixed(1)}ms`));
  }

  private getStatusColor(value: number, good: number, warning: number): string {
    if (value >= good) return chalk.green(`✅ ${(value * 100).toFixed(1)}%`);
    if (value >= warning) return chalk.yellow(`⚠️  ${(value * 100).toFixed(1)}%`);
    return chalk.red(`❌ ${(value * 100).toFixed(1)}%`);
  }

  private getMemoryStatus(mb: number): string {
    if (mb < 10) return chalk.green(`✅ ${mb.toFixed(2)} MB`);
    if (mb < 50) return chalk.yellow(`⚠️  ${mb.toFixed(2)} MB`);
    return chalk.red(`❌ ${mb.toFixed(2)} MB`);
  }

  private getSpeedStatus(ms: number): string {
    if (ms < 5) return chalk.green(`⚡ ${ms.toFixed(2)} ms`);
    if (ms < 20) return chalk.yellow(`🚶 ${ms.toFixed(2)} ms`);
    return chalk.red(`🐌 ${ms.toFixed(2)} ms`);
  }

  private getEfficiencyBar(value: number): string {
    const width = 20;
    const filled = Math.round(value * width);
    const empty = width - filled;
    
    let bar = '';
    if (value >= 0.8) {
      bar = chalk.green('█'.repeat(filled));
    } else if (value >= 0.6) {
      bar = chalk.yellow('█'.repeat(filled));
    } else {
      bar = chalk.red('█'.repeat(filled));
    }
    bar += chalk.gray('░'.repeat(empty));
    
    return `[${bar}]`;
  }

  private async exportReport() {
    if (this.history.length === 0) return;
    
    const reportDir = path.join(process.cwd(), 'reports');
    await fs.mkdir(reportDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = path.join(reportDir, `cache-monitor-${timestamp}.json`);
    
    const report = {
      startTime: this.history[0].timestamp,
      endTime: this.history[this.history.length - 1].timestamp,
      totalSamples: this.history.length,
      summary: {
        averageHitRate: this.history.reduce((sum, d) => sum + d.cache.hitRate, 0) / this.history.length,
        averageResponseTime: this.history.reduce((sum, d) => sum + d.optimization.avgResponseTime, 0) / this.history.length,
        peakMemoryUsage: Math.max(...this.history.map(d => d.cache.memoryUsageMB)),
        totalCacheHits: this.history[this.history.length - 1].cache.hits,
        totalCacheMisses: this.history[this.history.length - 1].cache.misses,
      },
      history: this.history,
    };
    
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
    console.log(chalk.green(`\n✅ Report exported to ${reportFile}`));
  }
}

// Run the monitor
async function main() {
  const monitor = new CacheMonitor();
  const refreshInterval = parseInt(process.env.MONITOR_INTERVAL || '5000', 10);
  
  console.log(chalk.cyan('Starting cache monitor...'));
  console.log(chalk.gray(`Refresh interval: ${refreshInterval}ms`));
  
  await monitor.start(refreshInterval);
}

main().catch(error => {
  console.error(chalk.red('Monitor failed:'), error);
  process.exit(1);
});