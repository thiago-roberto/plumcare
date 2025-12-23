import Redis, { Redis as RedisClient } from 'ioredis';
import { config } from '../config/index.js';

/**
 * Redis service for caching and state management
 */
class RedisService {
  private client: RedisClient | null = null;
  private isConnected = false;

  /**
   * Initialize Redis connection
   */
  async connect(): Promise<void> {
    if (this.client && this.isConnected) {
      return;
    }

    try {
      this.client = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password || undefined,
        keyPrefix: config.redis.keyPrefix,
        retryStrategy: (times: number) => {
          if (times > 3) {
            console.error('Redis connection failed after 3 retries');
            return null;
          }
          return Math.min(times * 200, 2000);
        },
        lazyConnect: true,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        console.log('Redis connected');
      });

      this.client.on('error', (err: Error) => {
        console.error('Redis error:', err.message);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        this.isConnected = false;
        console.log('Redis connection closed');
      });

      await this.client.connect();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      this.client = null;
      this.isConnected = false;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
    }
  }

  /**
   * Check if Redis is connected
   */
  isReady(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Get a value from Redis
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Redis get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in Redis with optional TTL
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    if (!this.client) return false;
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      return true;
    } catch (error) {
      console.error(`Redis set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete a key from Redis
   */
  async delete(key: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error(`Redis delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    if (!this.client) return 0;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) return 0;
      return await this.client.del(...keys);
    } catch (error) {
      console.error(`Redis deletePattern error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Get all keys matching a pattern
   */
  async keys(pattern: string): Promise<string[]> {
    if (!this.client) return [];
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      console.error(`Redis keys error for pattern ${pattern}:`, error);
      return [];
    }
  }

  /**
   * Push to a list (left push)
   */
  async lpush<T>(key: string, ...values: T[]): Promise<number> {
    if (!this.client) return 0;
    try {
      const serialized = values.map((v) => JSON.stringify(v));
      return await this.client.lpush(key, ...serialized);
    } catch (error) {
      console.error(`Redis lpush error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Get a range from a list
   */
  async lrange<T>(key: string, start: number, stop: number): Promise<T[]> {
    if (!this.client) return [];
    try {
      const values = await this.client.lrange(key, start, stop);
      return values.map((v) => JSON.parse(v));
    } catch (error) {
      console.error(`Redis lrange error for key ${key}:`, error);
      return [];
    }
  }

  /**
   * Get list length
   */
  async llen(key: string): Promise<number> {
    if (!this.client) return 0;
    try {
      return await this.client.llen(key);
    } catch (error) {
      console.error(`Redis llen error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Trim a list to specified range
   */
  async ltrim(key: string, start: number, stop: number): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.ltrim(key, start, stop);
      return true;
    } catch (error) {
      console.error(`Redis ltrim error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set expiration on a key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.expire(key, seconds);
      return true;
    } catch (error) {
      console.error(`Redis expire error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Increment a counter
   */
  async incr(key: string): Promise<number> {
    if (!this.client) return 0;
    try {
      return await this.client.incr(key);
    } catch (error) {
      console.error(`Redis incr error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Set a value only if it doesn't exist (for rate limiting)
   */
  async setnx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    if (!this.client) return false;
    try {
      const result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    } catch (error) {
      console.error(`Redis setnx error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get TTL for a key
   */
  async ttl(key: string): Promise<number> {
    if (!this.client) return -2;
    try {
      return await this.client.ttl(key);
    } catch (error) {
      console.error(`Redis ttl error for key ${key}:`, error);
      return -2;
    }
  }
}

// Export singleton instance
export const redis = new RedisService();

// Export cache key helpers
export const CacheKeys = {
  syncState: (system: string) => `sync:${system}`,
  botExecutions: (botId: string) => `executions:${botId}`,
  webhookEvents: () => 'webhooks:events',
  rateLimit: (ip: string, endpoint: string) => `ratelimit:${ip}:${endpoint}`,
  connectionStatus: (system: string) => `connection:${system}`,
} as const;

// Export TTL constants (in seconds)
export const CacheTTL = {
  SYNC_STATE: 3600, // 1 hour
  BOT_EXECUTIONS: 3600, // 1 hour
  WEBHOOK_EVENTS: 3600, // 1 hour
  RATE_LIMIT: 60, // 1 minute
  CONNECTION_STATUS: 300, // 5 minutes
} as const;
