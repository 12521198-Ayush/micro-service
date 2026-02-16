import pool from '../config/database.js';
import { cache } from '../config/redis.js';

const CACHE_TTL = 300; // 5 minutes for active subscriptions

class UserSubscription {
  /**
   * Create new subscription
   */
  static async create(userId, subscriptionData) {
    const connection = await pool.getConnection();
    try {
      const query = `
        INSERT INTO user_subscriptions (
          user_id, plan_id, billing_cycle, amount_paid, currency,
          start_date, end_date, next_billing_date, status, auto_renew,
          is_trial, trial_end_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [result] = await connection.execute(query, [
        userId,
        subscriptionData.plan_id,
        subscriptionData.billing_cycle,
        subscriptionData.amount_paid,
        subscriptionData.currency || 'INR',
        subscriptionData.start_date,
        subscriptionData.end_date || null,
        subscriptionData.next_billing_date || null,
        subscriptionData.status || 'ACTIVE',
        subscriptionData.auto_renew !== undefined ? subscriptionData.auto_renew : true,
        subscriptionData.is_trial || false,
        subscriptionData.trial_end_date || null,
      ]);

      // Invalidate cache
      await cache.deletePattern(`subscription:user:${userId}:*`);

      return result.insertId;
    } finally {
      connection.release();
    }
  }

  /**
   * Get active subscription for user
   */
  static async getActiveSubscription(userId) {
    const cacheKey = `subscription:user:${userId}:active`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log(`✓ Cache hit: ${cacheKey}`);
      return cached;
    }

    const connection = await pool.getConnection();
    try {
      const query = `
        SELECT us.*, sp.plan_name, sp.plan_code, sp.plan_type,
               sp.max_contacts, sp.max_templates, sp.max_campaigns_per_month,
               sp.max_messages_per_month, sp.max_team_members, sp.max_whatsapp_numbers,
               sp.has_advanced_analytics, sp.has_automation, sp.has_api_access,
               sp.has_priority_support, sp.has_white_label, sp.has_custom_reports,
               sp.has_webhooks, sp.has_bulk_messaging
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.user_id = ? 
          AND us.status = 'ACTIVE'
          AND (us.end_date IS NULL OR us.end_date > NOW())
        ORDER BY us.created_at DESC
        LIMIT 1
      `;

      const [rows] = await connection.execute(query, [userId]);
      const subscription = rows[0] || null;

      if (subscription) {
        await cache.set(cacheKey, subscription, CACHE_TTL);
      }

      return subscription;
    } finally {
      connection.release();
    }
  }

  /**
   * Get subscription by ID
   */
  static async findById(subscriptionId) {
    const cacheKey = `subscription:${subscriptionId}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log(`✓ Cache hit: ${cacheKey}`);
      return cached;
    }

    const connection = await pool.getConnection();
    try {
      const query = `
        SELECT us.*, sp.plan_name, sp.plan_code, sp.plan_type
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.id = ?
      `;

      const [rows] = await connection.execute(query, [subscriptionId]);
      const subscription = rows[0] || null;

      if (subscription) {
        await cache.set(cacheKey, subscription, CACHE_TTL);
      }

      return subscription;
    } finally {
      connection.release();
    }
  }

  /**
   * Get all subscriptions for user
   */
  static async getUserSubscriptions(userId, limit = 10, offset = 0) {
    const connection = await pool.getConnection();
    try {
      const query = `
        SELECT us.*, sp.plan_name, sp.plan_code, sp.plan_type
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.user_id = ?
        ORDER BY us.created_at DESC
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `;

      const [rows] = await connection.execute(query, [userId]);
      return rows;
    } finally {
      connection.release();
    }
  }

  /**
   * Update subscription
   */
  static async update(subscriptionId, updateData) {
    const connection = await pool.getConnection();
    try {
      const updates = [];
      const values = [];

      Object.keys(updateData).forEach((key) => {
        if (updateData[key] !== undefined) {
          updates.push(`${key} = ?`);
          values.push(updateData[key]);
        }
      });

      if (updates.length === 0) return false;

      values.push(subscriptionId);
      const query = `UPDATE user_subscriptions SET ${updates.join(', ')} WHERE id = ?`;
      const [result] = await connection.execute(query, values);

      // Invalidate cache
      if (result.affectedRows > 0) {
        const subscription = await this.findById(subscriptionId);
        if (subscription) {
          await cache.deletePattern(`subscription:user:${subscription.user_id}:*`);
          await cache.delete(`subscription:${subscriptionId}`);
        }
      }

      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * Cancel subscription
   */
  static async cancel(subscriptionId, reason, cancelledBy) {
    const connection = await pool.getConnection();
    try {
      const query = `
        UPDATE user_subscriptions 
        SET status = 'CANCELLED',
            cancelled_at = NOW(),
            cancellation_reason = ?,
            cancelled_by = ?,
            auto_renew = FALSE
        WHERE id = ?
      `;

      const [result] = await connection.execute(query, [reason, cancelledBy, subscriptionId]);

      // Invalidate cache
      if (result.affectedRows > 0) {
        const subscription = await this.findById(subscriptionId);
        if (subscription) {
          await cache.deletePattern(`subscription:user:${subscription.user_id}:*`);
          await cache.delete(`subscription:${subscriptionId}`);
        }
      }

      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * Check if subscription is expired
   */
  static async checkExpiration(subscriptionId) {
    const subscription = await this.findById(subscriptionId);
    if (!subscription) return false;

    if (subscription.end_date && new Date(subscription.end_date) < new Date()) {
      await this.update(subscriptionId, { status: 'EXPIRED' });
      return true;
    }

    return false;
  }

  /**
   * Get subscriptions expiring soon (for renewal reminders)
   */
  static async getExpiringSubscriptions(days = 7) {
    const connection = await pool.getConnection();
    try {
      const query = `
        SELECT us.*, sp.plan_name
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.status = 'ACTIVE'
          AND us.auto_renew = TRUE
          AND us.end_date IS NOT NULL
          AND us.end_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL ? DAY)
        ORDER BY us.end_date ASC
      `;

      const [rows] = await connection.execute(query, [days]);
      return rows;
    } finally {
      connection.release();
    }
  }

  /**
   * Renew subscription
   */
  static async renew(subscriptionId, newEndDate, nextBillingDate, amountPaid) {
    const connection = await pool.getConnection();
    try {
      const query = `
        UPDATE user_subscriptions
        SET end_date = ?,
            next_billing_date = ?,
            amount_paid = ?,
            status = 'ACTIVE',
            updated_at = NOW()
        WHERE id = ?
      `;

      const [result] = await connection.execute(query, [
        newEndDate,
        nextBillingDate,
        amountPaid,
        subscriptionId,
      ]);

      // Invalidate cache
      if (result.affectedRows > 0) {
        const subscription = await this.findById(subscriptionId);
        if (subscription) {
          await cache.deletePattern(`subscription:user:${subscription.user_id}:*`);
          await cache.delete(`subscription:${subscriptionId}`);
        }
      }

      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * Get subscription count by status
   */
  static async getCountByStatus(userId) {
    const connection = await pool.getConnection();
    try {
      const query = `
        SELECT status, COUNT(*) as count
        FROM user_subscriptions
        WHERE user_id = ?
        GROUP BY status
      `;

      const [rows] = await connection.execute(query, [userId]);
      return rows;
    } finally {
      connection.release();
    }
  }
}

export default UserSubscription;