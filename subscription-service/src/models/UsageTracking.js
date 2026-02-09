import pool from '../config/database.js';
import { cache } from '../config/redis.js';

class UsageTracking {
  /**
   * Get or create usage record for current month
   */
  static async getOrCreateMonthlyUsage(userId, subscriptionId) {
    const monthYear = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
    
    const cacheKey = `usage:${userId}:${monthYear}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log(`✓ Cache hit: ${cacheKey}`);
      return cached;
    }

    const connection = await pool.getConnection();
    try {
      // Try to get existing record
      let query = `
        SELECT * FROM usage_tracking 
        WHERE user_id = ? AND month_year = ?
      `;
      let [rows] = await connection.execute(query, [userId, monthYear]);

      if (rows.length > 0) {
        await cache.set(cacheKey, rows[0], 300); // 5 min cache
        return rows[0];
      }

      // Create new record
      query = `
        INSERT INTO usage_tracking (
          user_id, subscription_id, month_year, last_reset_date
        ) VALUES (?, ?, ?, NOW())
      `;
      
      const [result] = await connection.execute(query, [userId, subscriptionId, monthYear]);

      // Fetch the created record
      query = 'SELECT * FROM usage_tracking WHERE id = ?';
      [rows] = await connection.execute(query, [result.insertId]);

      await cache.set(cacheKey, rows[0], 300);
      return rows[0];
    } finally {
      connection.release();
    }
  }

  /**
   * Increment usage counter
   */
  static async incrementUsage(userId, usageType, count = 1) {
    const monthYear = new Date().toISOString().slice(0, 7);
    
    const connection = await pool.getConnection();
    try {
      // Get active subscription
      const subQuery = `
        SELECT id FROM user_subscriptions 
        WHERE user_id = ? AND status = 'ACTIVE'
        ORDER BY created_at DESC LIMIT 1
      `;
      const [subRows] = await connection.execute(subQuery, [userId]);
      
      if (subRows.length === 0) {
        throw new Error('No active subscription found');
      }

      const subscriptionId = subRows[0].id;

      // Ensure usage record exists
      await this.getOrCreateMonthlyUsage(userId, subscriptionId);

      // Increment the counter
      const fieldMap = {
        contacts: 'contacts_count',
        templates: 'templates_count',
        campaigns: 'campaigns_count',
        messages: 'messages_sent',
        team_members: 'team_members_count',
        whatsapp_numbers: 'whatsapp_numbers_count',
        marketing_messages: 'marketing_messages',
        utility_messages: 'utility_messages',
        auth_messages: 'auth_messages',
      };

      const field = fieldMap[usageType];
      if (!field) {
        throw new Error(`Invalid usage type: ${usageType}`);
      }

      const query = `
        UPDATE usage_tracking
        SET ${field} = ${field} + ?
        WHERE user_id = ? AND month_year = ?
      `;

      await connection.execute(query, [count, userId, monthYear]);

      // Invalidate cache
      await cache.delete(`usage:${userId}:${monthYear}`);

      return true;
    } finally {
      connection.release();
    }
  }

  /**
   * Check if user has exceeded limit
   */
  static async checkLimit(userId, limitType) {
    const monthYear = new Date().toISOString().slice(0, 7);
    
    const connection = await pool.getConnection();
    try {
      const query = `
        SELECT ut.*, us.plan_id, sp.max_contacts, sp.max_templates,
               sp.max_campaigns_per_month, sp.max_messages_per_month,
               sp.max_team_members, sp.max_whatsapp_numbers
        FROM usage_tracking ut
        JOIN user_subscriptions us ON ut.subscription_id = us.id
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE ut.user_id = ? AND ut.month_year = ? AND us.status = 'ACTIVE'
      `;

      const [rows] = await connection.execute(query, [userId, monthYear]);
      
      if (rows.length === 0) {
        return { canProceed: true, current: 0, limit: 0 };
      }

      const usage = rows[0];
      const limitMap = {
        contacts: { current: usage.contacts_count, limit: usage.max_contacts },
        templates: { current: usage.templates_count, limit: usage.max_templates },
        campaigns: { current: usage.campaigns_count, limit: usage.max_campaigns_per_month },
        messages: { current: usage.messages_sent, limit: usage.max_messages_per_month },
        team_members: { current: usage.team_members_count, limit: usage.max_team_members },
        whatsapp_numbers: { current: usage.whatsapp_numbers_count, limit: usage.max_whatsapp_numbers },
      };

      const data = limitMap[limitType];
      if (!data) {
        return { canProceed: true, current: 0, limit: 0 };
      }

      // -1 means unlimited
      const canProceed = data.limit === -1 || data.current < data.limit;

      return {
        canProceed,
        current: data.current,
        limit: data.limit,
        remaining: data.limit === -1 ? -1 : Math.max(0, data.limit - data.current),
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Get current month usage
   */
  static async getCurrentUsage(userId) {
    const monthYear = new Date().toISOString().slice(0, 7);
    
    const cacheKey = `usage:${userId}:${monthYear}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log(`✓ Cache hit: ${cacheKey}`);
      return cached;
    }

    const connection = await pool.getConnection();
    try {
      const query = `
        SELECT ut.*, sp.max_contacts, sp.max_templates,
               sp.max_campaigns_per_month, sp.max_messages_per_month,
               sp.max_team_members, sp.max_whatsapp_numbers
        FROM usage_tracking ut
        JOIN user_subscriptions us ON ut.subscription_id = us.id
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE ut.user_id = ? AND ut.month_year = ?
      `;

      const [rows] = await connection.execute(query, [userId, monthYear]);
      const usage = rows[0] || null;

      if (usage) {
        await cache.set(cacheKey, usage, 300);
      }

      return usage;
    } finally {
      connection.release();
    }
  }

  /**
   * Reset monthly counters (for new billing cycle)
   */
  static async resetMonthlyCounters(userId) {
    const monthYear = new Date().toISOString().slice(0, 7);
    
    const connection = await pool.getConnection();
    try {
      const query = `
        UPDATE usage_tracking
        SET campaigns_count = 0,
            messages_sent = 0,
            marketing_messages = 0,
            utility_messages = 0,
            auth_messages = 0,
            last_reset_date = NOW()
        WHERE user_id = ? AND month_year = ?
      `;

      const [result] = await connection.execute(query, [userId, monthYear]);

      // Invalidate cache
      await cache.delete(`usage:${userId}:${monthYear}`);

      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * Get usage history
   */
  static async getUsageHistory(userId, months = 6) {
    const connection = await pool.getConnection();
    try {
      const query = `
        SELECT * FROM usage_tracking
        WHERE user_id = ?
        ORDER BY month_year DESC
        LIMIT ?
      `;

      const [rows] = await connection.execute(query, [userId, months]);
      return rows;
    } finally {
      connection.release();
    }
  }

  /**
   * Update usage count (set to specific value)
   */
  static async updateUsageCount(userId, usageType, newCount) {
    const monthYear = new Date().toISOString().slice(0, 7);
    
    const connection = await pool.getConnection();
    try {
      const fieldMap = {
        contacts: 'contacts_count',
        templates: 'templates_count',
        campaigns: 'campaigns_count',
        messages: 'messages_sent',
        team_members: 'team_members_count',
        whatsapp_numbers: 'whatsapp_numbers_count',
      };

      const field = fieldMap[usageType];
      if (!field) {
        throw new Error(`Invalid usage type: ${usageType}`);
      }

      const query = `
        UPDATE usage_tracking
        SET ${field} = ?
        WHERE user_id = ? AND month_year = ?
      `;

      const [result] = await connection.execute(query, [newCount, userId, monthYear]);

      // Invalidate cache
      await cache.delete(`usage:${userId}:${monthYear}`);

      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * Decrement usage counter (e.g., when contact is deleted)
   */
  static async decrementUsage(userId, usageType, count = 1) {
    const monthYear = new Date().toISOString().slice(0, 7);
    
    const connection = await pool.getConnection();
    try {
      const fieldMap = {
        contacts: 'contacts_count',
        templates: 'templates_count',
        team_members: 'team_members_count',
        whatsapp_numbers: 'whatsapp_numbers_count',
      };

      const field = fieldMap[usageType];
      if (!field) {
        throw new Error(`Invalid usage type: ${usageType}`);
      }

      const query = `
        UPDATE usage_tracking
        SET ${field} = GREATEST(0, ${field} - ?)
        WHERE user_id = ? AND month_year = ?
      `;

      await connection.execute(query, [count, userId, monthYear]);

      // Invalidate cache
      await cache.delete(`usage:${userId}:${monthYear}`);

      return true;
    } finally {
      connection.release();
    }
  }
}

export default UsageTracking;