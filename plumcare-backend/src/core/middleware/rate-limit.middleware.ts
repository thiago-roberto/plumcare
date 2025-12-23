import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { redis, CacheKeys, CacheTTL } from '../database/index.js';

/**
 * Rate Limit Configuration
 */
export interface RateLimitConfig {
  /** Time window in seconds (default: 60) */
  windowSeconds?: number;
  /** Maximum requests per window (default: 100) */
  maxRequests?: number;
  /** Custom key generator (default: IP-based) */
  keyGenerator?: (req: Request) => string;
  /** Skip rate limiting for certain requests */
  skip?: (req: Request) => boolean;
  /** Custom error message */
  message?: string;
}

/**
 * In-memory rate limit store (fallback when Redis is unavailable)
 */
const inMemoryStore = new Map<string, { count: number; expiresAt: number }>();

/**
 * Clean expired entries from in-memory store
 */
function cleanExpiredEntries(): void {
  const now = Date.now();
  for (const [key, value] of inMemoryStore.entries()) {
    if (value.expiresAt <= now) {
      inMemoryStore.delete(key);
    }
  }
}

// Clean expired entries periodically (every 60 seconds)
setInterval(cleanExpiredEntries, 60000);

/**
 * Get request count from Redis or fallback
 */
async function getRequestCount(key: string): Promise<number> {
  if (redis.isReady()) {
    const count = await redis.get<number>(key);
    return count || 0;
  } else {
    const entry = inMemoryStore.get(key);
    if (!entry || entry.expiresAt <= Date.now()) {
      return 0;
    }
    return entry.count;
  }
}

/**
 * Increment request count in Redis or fallback
 */
async function incrementRequestCount(key: string, ttlSeconds: number): Promise<number> {
  if (redis.isReady()) {
    // Use Redis INCR and set expiry
    const count = await redis.incr(key);
    if (count === 1) {
      // First request in window, set expiry
      await redis.expire(key, ttlSeconds);
    }
    return count;
  } else {
    const now = Date.now();
    const entry = inMemoryStore.get(key);

    if (!entry || entry.expiresAt <= now) {
      // New window
      inMemoryStore.set(key, {
        count: 1,
        expiresAt: now + (ttlSeconds * 1000),
      });
      return 1;
    } else {
      // Increment existing
      entry.count++;
      return entry.count;
    }
  }
}

/**
 * Get time until rate limit resets
 */
async function getTTL(key: string, defaultTtl: number): Promise<number> {
  if (redis.isReady()) {
    const ttl = await redis.ttl(key);
    return ttl > 0 ? ttl : defaultTtl;
  } else {
    const entry = inMemoryStore.get(key);
    if (!entry) return defaultTtl;
    return Math.ceil((entry.expiresAt - Date.now()) / 1000);
  }
}

/**
 * Default key generator - uses IP address and route
 */
function defaultKeyGenerator(req: Request): string {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const route = req.originalUrl.split('?')[0]; // Remove query params
  return CacheKeys.rateLimit(ip, route);
}

/**
 * Rate limiting middleware factory
 *
 * Limits requests per IP per endpoint within a time window.
 * Uses Redis for distributed rate limiting with in-memory fallback.
 *
 * @example
 * // Apply to all routes (100 requests per minute)
 * app.use(rateLimit());
 *
 * @example
 * // Stricter limit for specific endpoint
 * router.post('/login', rateLimit({ windowSeconds: 60, maxRequests: 5 }), loginController);
 */
export function rateLimit(config: RateLimitConfig = {}): RequestHandler {
  const {
    windowSeconds = 60,
    maxRequests = 100,
    keyGenerator = defaultKeyGenerator,
    skip,
    message = 'Too many requests, please try again later',
  } = config;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if we should skip rate limiting
      if (skip && skip(req)) {
        next();
        return;
      }

      const key = keyGenerator(req);
      const currentCount = await incrementRequestCount(key, windowSeconds);
      const remaining = Math.max(0, maxRequests - currentCount);
      const ttl = await getTTL(key, windowSeconds);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + ttl);

      if (currentCount > maxRequests) {
        res.setHeader('Retry-After', ttl);
        res.status(429).json({
          success: false,
          error: message,
          retryAfter: ttl,
        });
        return;
      }

      next();
    } catch (error) {
      // If rate limiting fails, allow the request through
      console.error('Rate limit error:', error);
      next();
    }
  };
}

/**
 * Preset configurations for common use cases
 */
export const rateLimitPresets = {
  /** Standard API rate limit (100 req/min) */
  standard: () => rateLimit({ windowSeconds: 60, maxRequests: 100 }),

  /** Strict rate limit for sensitive endpoints (10 req/min) */
  strict: () => rateLimit({ windowSeconds: 60, maxRequests: 10, message: 'Rate limit exceeded for this sensitive endpoint' }),

  /** Lenient rate limit for public endpoints (300 req/min) */
  lenient: () => rateLimit({ windowSeconds: 60, maxRequests: 300 }),

  /** Auth endpoints (5 req/min) */
  auth: () => rateLimit({ windowSeconds: 60, maxRequests: 5, message: 'Too many authentication attempts' }),

  /** Webhook endpoints (no rate limit for internal webhooks) */
  webhooks: () => rateLimit({
    windowSeconds: 60,
    maxRequests: 1000,
    skip: (req) => {
      // Skip rate limiting for internal Docker network requests
      const ip = req.ip || req.socket.remoteAddress || '';
      return ip.startsWith('172.') || ip === '::1' || ip === '127.0.0.1';
    },
  }),
};
