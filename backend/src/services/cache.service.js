const { redisClient } = require('../config/redis');

/**
 * Cache Service — Cache-Aside Layer for High-Concurrency Operations
 *
 * Implements write-through cache invalidation, key prefixing, and JSON serialization.
 */
class CacheService {
  constructor() {
    this.defaultTTL = 300; // 5 minutes default TTL
    this.prefix = 'arena:';
  }

  formatKey(key) {
    return `${this.prefix}${key}`;
  }

  /**
   * Get cached object by key
   */
  async get(key) {
    try {
      const data = await redisClient.get(this.formatKey(key));
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.warn(`[CacheService] Error reading key ${key}:`, err.message);
      return null;
    }
  }

  /**
   * Set cached object with TTL in seconds
   */
  async set(key, value, ttlSeconds = this.defaultTTL) {
    try {
      const serialized = JSON.stringify(value);
      await redisClient.set(this.formatKey(key), serialized, 'EX', ttlSeconds);
      return true;
    } catch (err) {
      console.warn(`[CacheService] Error setting key ${key}:`, err.message);
      return false;
    }
  }

  /**
   * Delete single key
   */
  async del(key) {
    try {
      await redisClient.del(this.formatKey(key));
      return true;
    } catch (err) {
      console.warn(`[CacheService] Error deleting key ${key}:`, err.message);
      return false;
    }
  }

  /**
   * Invalidate all competition cache variants for a competition (by id or slug)
   */
  async invalidateCompetition(slugOrId) {
    try {
      await Promise.all([
        this.del(`competition:details:${slugOrId}`),
        this.del(`competition:spots:${slugOrId}`),
      ]);
      console.log(`[CacheService] Invalidated cache for competition: ${slugOrId}`);
    } catch (err) {
      console.warn(`[CacheService] Error invalidating competition ${slugOrId}:`, err.message);
    }
  }
}

module.exports = new CacheService();
