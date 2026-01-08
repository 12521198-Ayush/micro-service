import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  password: process.env.REDIS_PASSWORD || undefined,
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('Redis Client Connected'));
redisClient.on('ready', () => console.log('Redis Client Ready'));

// Connect to Redis
export const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.warn('Redis connection failed. Caching will be disabled:', err.message);
  }
};

// Cache operations
export const cache = {
  // Get value from cache
  async get(key) {
    try {
      if (!redisClient.isOpen) return null;
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  },

  // Set value in cache with TTL
  async set(key, value, ttl = 3600) {
    try {
      if (!redisClient.isOpen) return false;
      await redisClient.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  },

  // Delete key from cache
  async delete(key) {
    try {
      if (!redisClient.isOpen) return false;
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  },

  // Delete keys by pattern
  async deletePattern(pattern) {
    try {
      if (!redisClient.isOpen) return false;
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return true;
    } catch (error) {
      console.error(`Cache delete pattern error for ${pattern}:`, error);
      return false;
    }
  },

  // Clear all cache
  async flush() {
    try {
      if (!redisClient.isOpen) return false;
      await redisClient.flushDb();
      return true;
    } catch (error) {
      console.error('Cache flush error:', error);
      return false;
    }
  },

  // Check if key exists
  async exists(key) {
    try {
      if (!redisClient.isOpen) return false;
      const exists = await redisClient.exists(key);
      return exists === 1;
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  },
};

export default { redisClient, connectRedis, cache };
