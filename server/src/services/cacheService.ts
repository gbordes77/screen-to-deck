import Redis from 'ioredis';
import { createHash } from 'crypto';
import { ScryfallCard } from '../types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
  lastAccessed: number;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  totalEntries: number;
  memoryUsage: number;
  avgAccessTime: number;
  popularKeys: Array<{ key: string; hits: number }>;
}

export class CacheService {
  private redis: Redis | null = null;
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private metrics = {
    hits: 0,
    misses: 0,
    accessTimes: [] as number[],
  };
  private readonly ttl: number; // seconds
  private readonly maxMemoryEntries: number;
  private readonly useRedis: boolean;

  constructor(
    ttl: number = 7200, // 2 hours default
    maxMemoryEntries: number = 10000,
    redisUrl?: string
  ) {
    this.ttl = ttl;
    this.maxMemoryEntries = maxMemoryEntries;
    this.useRedis = !!redisUrl;

    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl, {
          retryStrategy: (times) => Math.min(times * 50, 2000),
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          lazyConnect: true,
        });

        this.redis.on('error', (err) => {
          console.error('Redis connection error:', err);
          // Fallback to memory cache on Redis errors
        });

        this.redis.on('connect', () => {
          console.log('✅ Redis cache connected');
        });
      } catch (error) {
        console.warn('Failed to initialize Redis, using memory cache:', error);
        this.redis = null;
        this.useRedis = false;
      }
    }
  }

  async connect(): Promise<void> {
    if (this.redis) {
      await this.redis.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.disconnect();
    }
  }

  /**
   * Generate a cache key from input parameters
   */
  private generateKey(namespace: string, ...params: any[]): string {
    const paramStr = JSON.stringify(params);
    const hash = createHash('sha256').update(paramStr).digest('hex').substring(0, 16);
    return `mtg:${namespace}:${hash}`;
  }

  /**
   * Get from cache with metrics tracking
   */
  async get<T>(namespace: string, params: any[]): Promise<T | null> {
    const startTime = Date.now();
    const key = this.generateKey(namespace, ...params);

    try {
      // Try Redis first if available
      if (this.redis && this.useRedis) {
        const redisData = await this.redis.get(key);
        if (redisData) {
          const entry = JSON.parse(redisData) as CacheEntry<T>;
          
          // Check if expired
          if (Date.now() - entry.timestamp > this.ttl * 1000) {
            await this.redis.del(key);
            this.metrics.misses++;
            return null;
          }

          // Update hit count and last accessed
          entry.hits++;
          entry.lastAccessed = Date.now();
          await this.redis.set(key, JSON.stringify(entry), 'EX', this.ttl);
          
          this.metrics.hits++;
          this.metrics.accessTimes.push(Date.now() - startTime);
          return entry.data;
        }
      }

      // Fallback to memory cache
      const memEntry = this.memoryCache.get(key);
      if (memEntry) {
        // Check if expired
        if (Date.now() - memEntry.timestamp > this.ttl * 1000) {
          this.memoryCache.delete(key);
          this.metrics.misses++;
          return null;
        }

        memEntry.hits++;
        memEntry.lastAccessed = Date.now();
        this.metrics.hits++;
        this.metrics.accessTimes.push(Date.now() - startTime);
        return memEntry.data;
      }

      this.metrics.misses++;
      this.metrics.accessTimes.push(Date.now() - startTime);
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      this.metrics.misses++;
      return null;
    }
  }

  /**
   * Set cache with TTL
   */
  async set<T>(namespace: string, params: any[], data: T): Promise<void> {
    const key = this.generateKey(namespace, ...params);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      hits: 0,
      lastAccessed: Date.now(),
    };

    try {
      // Store in Redis if available
      if (this.redis && this.useRedis) {
        await this.redis.set(key, JSON.stringify(entry), 'EX', this.ttl);
      }

      // Also store in memory cache for faster access
      this.memoryCache.set(key, entry);

      // Implement LRU eviction for memory cache
      if (this.memoryCache.size > this.maxMemoryEntries) {
        this.evictLRU();
      }
    } catch (error) {
      console.error('Cache set error:', error);
      // Still try to store in memory cache
      this.memoryCache.set(key, entry);
    }
  }

  /**
   * Batch get multiple items
   */
  async batchGet<T>(namespace: string, paramsList: any[][]): Promise<(T | null)[]> {
    const promises = paramsList.map(params => this.get<T>(namespace, params));
    return Promise.all(promises);
  }

  /**
   * Batch set multiple items
   */
  async batchSet<T>(namespace: string, items: Array<{ params: any[]; data: T }>): Promise<void> {
    const promises = items.map(item => this.set(namespace, item.params, item.data));
    await Promise.all(promises);
  }

  /**
   * Invalidate cache entries by pattern
   */
  async invalidate(pattern: string): Promise<number> {
    let count = 0;

    // Invalidate in Redis
    if (this.redis && this.useRedis) {
      const keys = await this.redis.keys(`mtg:${pattern}*`);
      if (keys.length > 0) {
        count += await this.redis.del(...keys);
      }
    }

    // Invalidate in memory cache
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    if (this.redis && this.useRedis) {
      const keys = await this.redis.keys('mtg:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    }
    this.memoryCache.clear();
    this.metrics = {
      hits: 0,
      misses: 0,
      accessTimes: [],
    };
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    const totalRequests = this.metrics.hits + this.metrics.misses;
    const hitRate = totalRequests > 0 ? this.metrics.hits / totalRequests : 0;
    const avgAccessTime = this.metrics.accessTimes.length > 0
      ? this.metrics.accessTimes.reduce((a, b) => a + b, 0) / this.metrics.accessTimes.length
      : 0;

    // Get popular keys from memory cache
    const popularKeys = Array.from(this.memoryCache.entries())
      .map(([key, entry]) => ({ key, hits: entry.hits }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 10);

    // Estimate memory usage
    const memoryUsage = JSON.stringify(Array.from(this.memoryCache.values())).length;

    return {
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      hitRate,
      totalEntries: this.memoryCache.size,
      memoryUsage,
      avgAccessTime,
      popularKeys,
    };
  }

  /**
   * Warm up cache with common cards
   */
  async warmUp(cards: ScryfallCard[]): Promise<void> {
    console.log(`🔥 Warming up cache with ${cards.length} cards...`);
    
    const batchItems = cards.map(card => ({
      params: [card.name],
      data: card,
    }));

    // Store as exact matches
    await this.batchSet('card:exact', batchItems);

    // Also store normalized versions for fuzzy matching
    const normalizedItems = cards.map(card => ({
      params: [this.normalizeCardName(card.name)],
      data: card,
    }));
    await this.batchSet('card:normalized', normalizedItems);

    console.log(`✅ Cache warmed up with ${cards.length} cards`);
  }

  /**
   * LRU eviction for memory cache
   */
  private evictLRU(): void {
    if (this.memoryCache.size <= this.maxMemoryEntries) {
      return;
    }

    // Find least recently used entries
    const entries = Array.from(this.memoryCache.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    // Remove 10% of least recently used
    const toRemove = Math.floor(this.maxMemoryEntries * 0.1);
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      this.memoryCache.delete(entries[i][0]);
    }
  }

  /**
   * Normalize card name for consistent caching
   */
  private normalizeCardName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[''`´]/g, "'")
      .replace(/[""]/g, '"')
      .replace(/[—–]/g, '-')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Export metrics to CSV for monitoring
   */
  async exportMetrics(filepath: string): Promise<void> {
    const metrics = this.getMetrics();
    const csv = [
      'timestamp,hits,misses,hit_rate,total_entries,avg_access_time_ms',
      `${Date.now()},${metrics.hits},${metrics.misses},${metrics.hitRate.toFixed(3)},${metrics.totalEntries},${metrics.avgAccessTime.toFixed(2)}`,
    ].join('\n');

    const fs = await import('fs/promises');
    await fs.appendFile(filepath, csv + '\n');
  }
}

// Singleton instance
let cacheInstance: CacheService | null = null;

export function getCacheService(): CacheService {
  if (!cacheInstance) {
    const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;
    cacheInstance = new CacheService(7200, 10000, redisUrl);
    cacheInstance.connect().catch(console.error);
  }
  return cacheInstance;
}

export default getCacheService;