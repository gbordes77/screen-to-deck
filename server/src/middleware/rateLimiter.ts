import { NextFunction, Request, Response } from 'express';
import { Redis } from 'ioredis';

// ==============================================
// INTERFACES & TYPES
// ==============================================

interface RateLimitConfig {
  windowMs: number;
  max: number | ((req: Request) => number);
  keyGenerator: (req: Request) => string;
  skip?: (req: Request) => boolean;
  onLimitReached?: (req: Request, res: Response) => void;
  store?: 'redis' | 'memory';
}

interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  current: number;
}

// ==============================================
// RATE LIMITER CLASS
// ==============================================

export class RateLimiter {
  private redis: Redis;
  private memoryStore: Map<string, { count: number; reset: number }> = new Map();

  constructor() {
    const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;
    
    if (redisUrl) {
      this.redis = new Redis(redisUrl, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      this.redis.on('error', (err) => {
        console.error('Redis rate limiter error:', err);
      });
    } else {
      console.warn('No Redis URL provided, using memory store for rate limiting');
    }
  }

  // ==============================================
  // MAIN RATE LIMIT MIDDLEWARE
  // ==============================================

  create(config: RateLimitConfig) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Skip if condition met
        if (config.skip?.(req)) {
          return next();
        }

        const key = config.keyGenerator(req);
        const limit = typeof config.max === 'function' ? config.max(req) : config.max;
        const windowMs = config.windowMs;
        
        const rateLimitInfo = await this.checkRateLimit(key, limit, windowMs, config.store);

        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': Math.max(0, rateLimitInfo.remaining).toString(),
          'X-RateLimit-Reset': rateLimitInfo.reset.toString(),
          'X-RateLimit-Used': rateLimitInfo.current.toString(),
        });

        // Check if limit exceeded
        if (rateLimitInfo.current > limit) {
          if (config.onLimitReached) {
            config.onLimitReached(req, res);
          }

          return res.status(429).json({
            error: 'Rate limit exceeded',
            message: `Too many requests. Limit: ${limit} per ${Math.floor(windowMs / 1000)} seconds`,
            limit,
            remaining: 0,
            reset: rateLimitInfo.reset,
            retryAfter: Math.ceil((rateLimitInfo.reset - Date.now()) / 1000),
          });
        }

        next();
      } catch (error) {
        console.error('Rate limiter error:', error);
        // Fail open - don't block requests if rate limiter fails
        next();
      }
    };
  }

  // ==============================================
  // RATE LIMIT CHECKING
  // ==============================================

  private async checkRateLimit(
    key: string,
    limit: number,
    windowMs: number,
    store: 'redis' | 'memory' = 'redis'
  ): Promise<RateLimitInfo> {
    if (store === 'redis' && this.redis) {
      return this.checkRateLimitRedis(key, limit, windowMs);
    } else {
      return this.checkRateLimitMemory(key, limit, windowMs);
    }
  }

  private async checkRateLimitRedis(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<RateLimitInfo> {
    const window = Math.floor(Date.now() / windowMs);
    const redisKey = `rate_limit:${key}:${window}`;
    
    try {
      const pipeline = this.redis.pipeline();
      pipeline.incr(redisKey);
      pipeline.expire(redisKey, Math.ceil(windowMs / 1000));
      
      const results = await pipeline.exec();
      const current = results?.[0]?.[1] as number || 0;
      
      const reset = (window + 1) * windowMs;
      const remaining = Math.max(0, limit - current);

      return {
        limit,
        remaining,
        reset,
        current,
      };
    } catch (error) {
      console.error('Redis rate limit check failed:', error);
      // Fallback to memory store
      return this.checkRateLimitMemory(key, limit, windowMs);
    }
  }

  private checkRateLimitMemory(
    key: string,
    limit: number,
    windowMs: number
  ): RateLimitInfo {
    const now = Date.now();
    const window = Math.floor(now / windowMs);
    const windowKey = `${key}:${window}`;
    
    const entry = this.memoryStore.get(windowKey);
    const current = entry ? entry.count + 1 : 1;
    const reset = (window + 1) * windowMs;
    
    this.memoryStore.set(windowKey, {
      count: current,
      reset,
    });

    // Clean up old entries (basic cleanup)
    if (Math.random() < 0.01) { // 1% chance to clean up
      this.cleanupMemoryStore();
    }

    const remaining = Math.max(0, limit - current);

    return {
      limit,
      remaining,
      reset,
      current,
    };
  }

  private cleanupMemoryStore(): void {
    const now = Date.now();
    for (const [key, value] of this.memoryStore.entries()) {
      if (value.reset < now) {
        this.memoryStore.delete(key);
      }
    }
  }

  // ==============================================
  // RESET METHODS
  // ==============================================

  async resetKey(key: string): Promise<void> {
    if (this.redis) {
      const pattern = `rate_limit:${key}:*`;
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } else {
      // Memory store cleanup
      for (const storeKey of this.memoryStore.keys()) {
        if (storeKey.startsWith(`${key}:`)) {
          this.memoryStore.delete(storeKey);
        }
      }
    }
  }

  async resetAllKeys(): Promise<void> {
    if (this.redis) {
      const keys = await this.redis.keys('rate_limit:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } else {
      this.memoryStore.clear();
    }
  }

  // ==============================================
  // HEALTH CHECK
  // ==============================================

  async healthCheck(): Promise<boolean> {
    if (this.redis) {
      try {
        await this.redis.ping();
        return true;
      } catch (error) {
        console.error('Redis health check failed:', error);
        return false;
      }
    }
    return true; // Memory store is always "healthy"
  }
}

// ==============================================
// PREDEFINED RATE LIMITERS
// ==============================================

const rateLimiter = new RateLimiter();

// Global API rate limiter
export const globalApiLimiter = rateLimiter.create({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req: Request) => {
    const organization = req.organization;
    if (!organization) return 100; // Default for unauthenticated requests
    
    // Plan-based limits
    const limits = {
      free: 100,
      pro: 1000,
      enterprise: 10000,
    };
    
    return limits[organization.plan] || 100;
  },
  keyGenerator: (req: Request) => {
    // Prefer organization ID, fallback to IP
    return req.organization?.id || req.ip;
  },
  skip: (req: Request) => {
    // Skip for health checks
    return req.path === '/health' || req.path === '/ping';
  },
});

// API key specific limiter (higher limits)
export const apiKeyLimiter = rateLimiter.create({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: (req: Request) => {
    const apiKey = req.apiKey;
    return apiKey?.rate_limit || 1000;
  },
  keyGenerator: (req: Request) => {
    return `api_key:${req.apiKey?.id || 'unknown'}`;
  },
  skip: (req: Request) => !req.apiKey,
});

// Scan endpoint specific limiter (resource intensive)
export const scanLimiter = rateLimiter.create({
  windowMs: 60 * 1000, // 1 minute
  max: (req: Request) => {
    const organization = req.organization;
    if (!organization) return 5;
    
    const limits = {
      free: 10,
      pro: 60,
      enterprise: 300,
    };
    
    return limits[organization.plan] || 10;
  },
  keyGenerator: (req: Request) => {
    return `scan:${req.organization?.id || req.ip}`;
  },
  onLimitReached: (req: Request, res: Response) => {
    console.log(`Scan rate limit exceeded for org: ${req.organization?.id || req.ip}`);
  },
});

// Auth endpoint limiter (prevent brute force)
export const authLimiter = rateLimiter.create({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Very strict for auth endpoints
  keyGenerator: (req: Request) => {
    return `auth:${req.ip}`;
  },
  skip: (req: Request) => {
    // Only apply to login/register endpoints
    return !req.path.includes('/auth/') || req.method !== 'POST';
  },
});

// Export rate limiter instance for custom usage
export { rateLimiter };
export default rateLimiter; 