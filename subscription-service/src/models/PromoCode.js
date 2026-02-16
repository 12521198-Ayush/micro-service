import pool from '../config/database.js';
import { cache } from '../config/redis.js';

class PromoCode {
  /**
   * Create new promo code
   */
  static async create(promoData) {
    const connection = await pool.getConnection();
    try {
      const query = `
        INSERT INTO promo_codes (
          code, description, discount_type, discount_value, max_discount_amount,
          applicable_plans, applicable_billing_cycles, valid_from, valid_until,
          max_uses, max_uses_per_user, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [result] = await connection.execute(query, [
        promoData.code.toUpperCase(),
        promoData.description || null,
        promoData.discount_type,
        promoData.discount_value,
        promoData.max_discount_amount || null,
        promoData.applicable_plans ? JSON.stringify(promoData.applicable_plans) : null,
        promoData.applicable_billing_cycles ? JSON.stringify(promoData.applicable_billing_cycles) : null,
        promoData.valid_from,
        promoData.valid_until,
        promoData.max_uses || null,
        promoData.max_uses_per_user || 1,
        promoData.is_active !== undefined ? promoData.is_active : true,
      ]);

      await cache.delete(`promo:${promoData.code.toUpperCase()}`);
      return result.insertId;
    } finally {
      connection.release();
    }
  }

  /**
   * Find promo code by code
   */
  static async findByCode(code) {
    const cacheKey = `promo:${code.toUpperCase()}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log(`✓ Cache hit: ${cacheKey}`);
      return cached;
    }

    const connection = await pool.getConnection();
    try {
      const query = 'SELECT * FROM promo_codes WHERE code = ? AND is_active = TRUE';
      const [rows] = await connection.execute(query, [code.toUpperCase()]);
      const promo = rows[0] || null;

      if (promo) {
        await cache.set(cacheKey, promo, 600); // 10 minutes
      }

      return promo;
    } finally {
      connection.release();
    }
  }

  /**
   * Validate promo code
   */
  static async validate(code, userId, planId, billingCycle) {
    const promo = await this.findByCode(code);

    if (!promo) {
      return { valid: false, message: 'Invalid promo code' };
    }

    // Check if active
    if (!promo.is_active) {
      return { valid: false, message: 'Promo code is no longer active' };
    }

    // Check validity dates
    const now = new Date();
    if (new Date(promo.valid_from) > now) {
      return { valid: false, message: 'Promo code is not yet valid' };
    }

    if (new Date(promo.valid_until) < now) {
      return { valid: false, message: 'Promo code has expired' };
    }

    // Check max uses
    if (promo.max_uses && promo.current_uses >= promo.max_uses) {
      return { valid: false, message: 'Promo code usage limit reached' };
    }

    // Check user usage
    const userUsageCount = await this.getUserUsageCount(promo.id, userId);
    if (promo.max_uses_per_user && userUsageCount >= promo.max_uses_per_user) {
      return { valid: false, message: 'You have already used this promo code' };
    }

    // Check applicable plans
    if (promo.applicable_plans) {
      const applicablePlans = JSON.parse(promo.applicable_plans);
      if (applicablePlans.length > 0 && !applicablePlans.includes(planId)) {
        return { valid: false, message: 'Promo code not applicable to this plan' };
      }
    }

    // Check applicable billing cycles
    if (promo.applicable_billing_cycles) {
      const applicableCycles = JSON.parse(promo.applicable_billing_cycles);
      if (applicableCycles.length > 0 && !applicableCycles.includes(billingCycle)) {
        return { valid: false, message: 'Promo code not applicable to this billing cycle' };
      }
    }

    return { valid: true, promo };
  }

  /**
   * Calculate discount
   */
  static calculateDiscount(promo, originalAmount) {
    let discount = 0;

    if (promo.discount_type === 'PERCENTAGE') {
      discount = (originalAmount * promo.discount_value) / 100;
      
      // Apply max discount cap if set
      if (promo.max_discount_amount && discount > promo.max_discount_amount) {
        discount = promo.max_discount_amount;
      }
    } else if (promo.discount_type === 'FIXED_AMOUNT') {
      discount = promo.discount_value;
      
      // Discount cannot exceed original amount
      if (discount > originalAmount) {
        discount = originalAmount;
      }
    }

    const finalAmount = Math.max(0, originalAmount - discount);

    return {
      original_amount: originalAmount,
      discount_amount: parseFloat(discount.toFixed(2)),
      final_amount: parseFloat(finalAmount.toFixed(2)),
    };
  }

  /**
   * Record promo code usage
   */
  static async recordUsage(promoId, userId, subscriptionId, transactionId, discountAmount) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Insert usage record
      const insertQuery = `
        INSERT INTO promo_code_usage (
          promo_code_id, user_id, subscription_id, transaction_id, discount_amount
        ) VALUES (?, ?, ?, ?, ?)
      `;
      await connection.execute(insertQuery, [
        promoId,
        userId,
        subscriptionId,
        transactionId,
        discountAmount,
      ]);

      // Increment usage count
      const updateQuery = `
        UPDATE promo_codes 
        SET current_uses = current_uses + 1 
        WHERE id = ?
      `;
      await connection.execute(updateQuery, [promoId]);

      await connection.commit();

      // Invalidate cache
      const promo = await this.findById(promoId);
      if (promo) {
        await cache.delete(`promo:${promo.code}`);
      }

      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get user usage count for promo code
   */
  static async getUserUsageCount(promoId, userId) {
    const connection = await pool.getConnection();
    try {
      const query = `
        SELECT COUNT(*) as count 
        FROM promo_code_usage 
        WHERE promo_code_id = ? AND user_id = ?
      `;
      const [rows] = await connection.execute(query, [promoId, userId]);
      return rows[0].count;
    } finally {
      connection.release();
    }
  }

  /**
   * Find promo code by ID
   */
  static async findById(promoId) {
    const connection = await pool.getConnection();
    try {
      const query = 'SELECT * FROM promo_codes WHERE id = ?';
      const [rows] = await connection.execute(query, [promoId]);
      return rows[0] || null;
    } finally {
      connection.release();
    }
  }

  /**
   * Get all active promo codes
   */
  static async getAllActive() {
    const connection = await pool.getConnection();
    try {
      const query = `
        SELECT * FROM promo_codes 
        WHERE is_active = TRUE 
          AND valid_from <= NOW() 
          AND valid_until >= NOW()
          AND (max_uses IS NULL OR current_uses < max_uses)
        ORDER BY created_at DESC
      `;
      const [rows] = await connection.execute(query);
      return rows;
    } finally {
      connection.release();
    }
  }

  /**
   * Deactivate promo code
   */
  static async deactivate(promoId) {
    const connection = await pool.getConnection();
    try {
      const query = 'UPDATE promo_codes SET is_active = FALSE WHERE id = ?';
      const [result] = await connection.execute(query, [promoId]);

      if (result.affectedRows > 0) {
        const promo = await this.findById(promoId);
        if (promo) {
          await cache.delete(`promo:${promo.code}`);
        }
      }

      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * Get promo code usage statistics
   */
  static async getUsageStats(promoId) {
    const connection = await pool.getConnection();
    try {
      const query = `
        SELECT 
          COUNT(*) as total_uses,
          SUM(discount_amount) as total_discount,
          COUNT(DISTINCT user_id) as unique_users
        FROM promo_code_usage
        WHERE promo_code_id = ?
      `;
      const [rows] = await connection.execute(query, [promoId]);
      return rows[0];
    } finally {
      connection.release();
    }
  }
}

export default PromoCode;