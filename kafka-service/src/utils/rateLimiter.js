const { createClient } = require('redis');
const config = require('../config');
const logger = require('./logger');

class RateLimiter {
  constructor() {
    this.redis = null;
    this.localCache = new Map();
  }

  async connect() {
    try {
      this.redis = createClient({ url: config.redis.url });
      await this.redis.connect();
      logger.info('RateLimiter connected to Redis');
    } catch (error) {
      logger.warn('Redis not available, using local cache for rate limiting');
      this.redis = null;
    }
  }

  // Check if message can be sent (phone number level)
  async canSendMessage(phoneNumberId) {
    const key = `rate:phone:${phoneNumberId}`;
    const limit = config.rateLimit.messagesPerSecond;
    const window = 1000; // 1 second

    return this.checkRateLimit(key, limit, window);
  }

  // Check pair rate limit (same recipient)
  async canSendToRecipient(phoneNumberId, recipientPhone) {
    const key = `rate:pair:${phoneNumberId}:${recipientPhone}`;
    const limit = config.rateLimit.pairRateLimit.messagesPerPeriod;
    const window = config.rateLimit.pairRateLimit.periodSeconds * 1000;

    return this.checkRateLimit(key, limit, window);
  }

  async checkRateLimit(key, limit, windowMs) {
    const now = Date.now();

    if (this.redis) {
      try {
        const multi = this.redis.multi();
        multi.zRemRangeByScore(key, 0, now - windowMs);
        multi.zCard(key);
        multi.zAdd(key, { score: now, value: now.toString() });
        multi.expire(key, Math.ceil(windowMs / 1000) + 1);
        
        const results = await multi.exec();
        const count = results[1];

        return {
          allowed: count < limit,
          remaining: Math.max(0, limit - count - 1),
          resetAt: now + windowMs
        };
      } catch (error) {
        logger.error('Redis rate limit error:', error);
        return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
      }
    } else {
      // Local cache fallback
      const cached = this.localCache.get(key) || { timestamps: [] };
      cached.timestamps = cached.timestamps.filter(ts => ts > now - windowMs);
      
      const count = cached.timestamps.length;
      if (count < limit) {
        cached.timestamps.push(now);
        this.localCache.set(key, cached);
        return { allowed: true, remaining: limit - count - 1, resetAt: now + windowMs };
      }

      return { allowed: false, remaining: 0, resetAt: cached.timestamps[0] + windowMs };
    }
  }

  // Wait for rate limit to reset
  async waitForRateLimit(phoneNumberId, recipientPhone) {
    const delay = config.rateLimit.pairRateLimit.periodSeconds * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // Record successful send
  async recordSend(phoneNumberId, recipientPhone, messageId) {
    const key = `sent:${phoneNumberId}:${recipientPhone}:${messageId}`;
    if (this.redis) {
      await this.redis.setEx(key, 3600, Date.now().toString()); // 1 hour TTL
    }
  }

  // Get retry delay with exponential backoff
  getRetryDelay(attemptNumber) {
    const { initialDelayMs, maxDelayMs, backoffMultiplier } = config.rateLimit.retry;
    const delay = Math.min(
      initialDelayMs * Math.pow(backoffMultiplier, attemptNumber),
      maxDelayMs
    );
    return delay;
  }

  // Check if error is retryable
  isRetryableError(errorCode) {
    return config.rateLimit.retry.retryableErrorCodes.includes(errorCode);
  }

  async disconnect() {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

module.exports = new RateLimiter();
