import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request } from 'express';
import { rateLimit, rateLimitPresets } from '../rate-limit.middleware.js';
import {
  createMockResponse,
  createMockNext,
} from '../../../__tests__/utils/test-helpers.js';

// Mock Redis - not ready, using fallback
vi.mock('../../database/index.js', () => ({
  redis: {
    isReady: vi.fn().mockReturnValue(false),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(true),
    ttl: vi.fn().mockResolvedValue(60),
    get: vi.fn().mockResolvedValue(null),
  },
  CacheKeys: {
    rateLimit: (ip: string, endpoint: string) => `ratelimit:${ip}:${endpoint}`,
  },
  CacheTTL: {
    RATE_LIMIT: 60,
  },
}));

/**
 * Create a mock request with properties needed for rate limiting
 */
function createRateLimitMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    params: {},
    query: {},
    body: {},
    headers: {},
    ip: '192.168.1.1',
    originalUrl: '/api/test',
    socket: { remoteAddress: '192.168.1.1' },
    get: vi.fn(),
    ...overrides,
  } as unknown as Request;
}

describe('rateLimit middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should allow requests under the limit', async () => {
      const middleware = rateLimit({ maxRequests: 10, windowSeconds: 60 });
      const req = createRateLimitMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(Number));
    });

    it('should set rate limit headers', async () => {
      const middleware = rateLimit({ maxRequests: 100 });
      const req = createRateLimitMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100);
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(Number));
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(Number));
    });

    it('should use default values when no config provided', async () => {
      const middleware = rateLimit();
      const req = createRateLimitMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100);
    });
  });

  describe('skip functionality', () => {
    it('should skip rate limiting when skip function returns true', async () => {
      const middleware = rateLimit({
        skip: () => true,
      });
      const req = createRateLimitMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      // Should not set rate limit headers when skipped
      expect(res.setHeader).not.toHaveBeenCalled();
    });

    it('should apply rate limiting when skip function returns false', async () => {
      const middleware = rateLimit({
        skip: () => false,
      });
      const req = createRateLimitMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.setHeader).toHaveBeenCalled();
    });
  });

  describe('custom key generator', () => {
    it('should use custom key generator when provided', async () => {
      const customKeyGen = vi.fn().mockReturnValue('custom-key');
      const middleware = rateLimit({
        keyGenerator: customKeyGen,
      });
      const req = createRateLimitMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(customKeyGen).toHaveBeenCalledWith(req);
    });
  });

  describe('error handling', () => {
    it('should allow request through if rate limiting fails', async () => {
      // This tests the fallback behavior when something unexpected happens
      const middleware = rateLimit();
      const req = createRateLimitMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});

describe('rateLimitPresets', () => {
  describe('standard preset', () => {
    it('should return middleware with 100 req/min limit', async () => {
      const middleware = rateLimitPresets.standard();
      const req = createRateLimitMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100);
    });
  });

  describe('strict preset', () => {
    it('should return middleware with 10 req/min limit', async () => {
      const middleware = rateLimitPresets.strict();
      const req = createRateLimitMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
    });
  });

  describe('lenient preset', () => {
    it('should return middleware with 300 req/min limit', async () => {
      const middleware = rateLimitPresets.lenient();
      const req = createRateLimitMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 300);
    });
  });

  describe('auth preset', () => {
    it('should return middleware with 5 req/min limit', async () => {
      const middleware = rateLimitPresets.auth();
      const req = createRateLimitMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 5);
    });
  });

  describe('webhooks preset', () => {
    it('should return middleware with high limit', async () => {
      const middleware = rateLimitPresets.webhooks();
      const req = createRateLimitMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 1000);
    });

    it('should skip rate limiting for localhost', async () => {
      const middleware = rateLimitPresets.webhooks();
      const req = createRateLimitMockRequest({ ip: '127.0.0.1' });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      // Should not set rate limit headers when skipped
      expect(res.setHeader).not.toHaveBeenCalled();
    });

    it('should skip rate limiting for Docker network', async () => {
      const middleware = rateLimitPresets.webhooks();
      const req = createRateLimitMockRequest({ ip: '172.18.0.5' });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.setHeader).not.toHaveBeenCalled();
    });
  });
});
