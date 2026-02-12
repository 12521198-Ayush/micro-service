import { createClient } from 'redis';
import env from './env.js';
import logger from './logger.js';

let redisClient = null;
let redisConnected = false;

const shouldSkipRedis = env.nodeEnv === 'test';

const createRedisClient = () => {
  if (shouldSkipRedis) {
    return null;
  }

  return createClient({
    url: env.redis.url,
    password: env.redis.password,
  });
};

export const connectRedis = async () => {
  if (shouldSkipRedis) {
    logger.info('Skipping Redis connection in test environment');
    return;
  }

  if (redisConnected) {
    return;
  }

  if (!redisClient) {
    redisClient = createRedisClient();

    redisClient.on('error', (error) => {
      logger.warn('Redis client error', { message: error.message });
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
      redisConnected = true;
    });

    redisClient.on('end', () => {
      redisConnected = false;
      logger.info('Redis client disconnected');
    });
  }

  try {
    await redisClient.connect();
  } catch (error) {
    redisConnected = false;
    logger.warn('Redis connection failed, continuing without cache', {
      message: error.message,
    });
  }
};

export const closeRedis = async () => {
  if (!redisClient || !redisClient.isOpen) {
    return;
  }

  await redisClient.quit();
};

const isCacheAvailable = () => redisClient && redisClient.isOpen;

export const cache = {
  async get(key) {
    if (!isCacheAvailable()) {
      return null;
    }

    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.warn('Cache get failed', { key, message: error.message });
      return null;
    }
  },

  async set(key, value, ttlSeconds = 300) {
    if (!isCacheAvailable()) {
      return false;
    }

    try {
      await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.warn('Cache set failed', { key, message: error.message });
      return false;
    }
  },

  async delete(key) {
    if (!isCacheAvailable()) {
      return false;
    }

    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      logger.warn('Cache delete failed', { key, message: error.message });
      return false;
    }
  },

  async deletePattern(pattern) {
    if (!isCacheAvailable()) {
      return false;
    }

    try {
      const keys = [];

      for await (const key of redisClient.scanIterator({ MATCH: pattern, COUNT: 100 })) {
        keys.push(key);
      }

      if (keys.length > 0) {
        await redisClient.del(keys);
      }

      return true;
    } catch (error) {
      logger.warn('Cache deletePattern failed', {
        pattern,
        message: error.message,
      });
      return false;
    }
  },
};

export const isRedisReady = () => redisConnected;

export default {
  connectRedis,
  closeRedis,
  cache,
  isRedisReady,
};
