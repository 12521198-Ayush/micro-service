import pool from '../config/database.js';
import { cache } from '../config/redis.js';

const CACHE_TTL = 600; // 10 minutes for plans (rarely change)

class SubscriptionPlan {
  /**
   * Get all active subscription plans
   */
  static async getAllPlans() {
    const cacheKey = 'plans:all:active';
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log(`✓ Cache hit: ${cacheKey}`);
      return cached;
    }

    const connection = await pool.getConnection();
    try {
      const query = `
        SELECT * FROM subscription_plans 
        WHERE is_active = TRUE AND is_visible = TRUE 
        ORDER BY display_order ASC
      `;
      const [rows] = await connection.execute(query);
      
      await cache.set(cacheKey, rows, CACHE_TTL);
      return rows;
    } finally {
      connection.release();
    }
  }

  /**
   * Get plan by ID
   */
  static async findById(planId) {
    const cacheKey = `plan:${planId}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log(`✓ Cache hit: ${cacheKey}`);
      return cached;
    }

    const connection = await pool.getConnection();
    try {
      const query = 'SELECT * FROM subscription_plans WHERE id = ? AND is_active = TRUE';
      const [rows] = await connection.execute(query, [planId]);
      const plan = rows[0] || null;
      
      if (plan) {
        await cache.set(cacheKey, plan, CACHE_TTL);
      }
      
      return plan;
    } finally {
      connection.release();
    }
  }

  /**
   * Get plan by code
   */
  static async findByCode(planCode) {
    const cacheKey = `plan:code:${planCode}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log(`✓ Cache hit: ${cacheKey}`);
      return cached;
    }

    const connection = await pool.getConnection();
    try {
      const query = 'SELECT * FROM subscription_plans WHERE plan_code = ? AND is_active = TRUE';
      const [rows] = await connection.execute(query, [planCode]);
      const plan = rows[0] || null;
      
      if (plan) {
        await cache.set(cacheKey, plan, CACHE_TTL);
      }
      
      return plan;
    } finally {
      connection.release();
    }
  }

  /**
   * Create new subscription plan (Admin only)
   */
  static async create(planData) {
    const connection = await pool.getConnection();
    try {
      const query = `
        INSERT INTO subscription_plans (
          plan_code, plan_name, plan_description, plan_type,
          monthly_price, yearly_price, lifetime_price,
          max_contacts, max_templates, max_campaigns_per_month, max_messages_per_month,
          max_team_members, max_whatsapp_numbers,
          has_advanced_analytics, has_automation, has_api_access, has_priority_support,
          has_white_label, has_custom_reports, has_webhooks, has_bulk_messaging,
          marketing_message_price, utility_message_price, auth_message_price,
          is_active, is_visible, display_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [result] = await connection.execute(query, [
        planData.plan_code,
        planData.plan_name,
        planData.plan_description,
        planData.plan_type,
        planData.monthly_price || 0,
        planData.yearly_price || 0,
        planData.lifetime_price || 0,
        planData.max_contacts || 0,
        planData.max_templates || 0,
        planData.max_campaigns_per_month || 0,
        planData.max_messages_per_month || 0,
        planData.max_team_members || 1,
        planData.max_whatsapp_numbers || 1,
        planData.has_advanced_analytics || false,
        planData.has_automation || false,
        planData.has_api_access || false,
        planData.has_priority_support || false,
        planData.has_white_label || false,
        planData.has_custom_reports || false,
        planData.has_webhooks || false,
        planData.has_bulk_messaging || false,
        planData.marketing_message_price || 0.35,
        planData.utility_message_price || 0.15,
        planData.auth_message_price || 0.15,
        planData.is_active !== undefined ? planData.is_active : true,
        planData.is_visible !== undefined ? planData.is_visible : true,
        planData.display_order || 0,
      ]);

      // Invalidate cache
      await cache.deletePattern('plans:*');

      return result.insertId;
    } finally {
      connection.release();
    }
  }

  /**
   * Update subscription plan
   */
  static async update(planId, planData) {
    const connection = await pool.getConnection();
    try {
      const updates = [];
      const values = [];

      Object.keys(planData).forEach((key) => {
        if (planData[key] !== undefined) {
          updates.push(`${key} = ?`);
          values.push(planData[key]);
        }
      });

      if (updates.length === 0) return false;

      values.push(planId);
      const query = `UPDATE subscription_plans SET ${updates.join(', ')} WHERE id = ?`;
      const [result] = await connection.execute(query, values);

      // Invalidate cache
      if (result.affectedRows > 0) {
        await cache.deletePattern('plans:*');
        await cache.delete(`plan:${planId}`);
      }

      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * Get plan pricing for specific billing cycle
   */
  static async getPricing(planId, billingCycle) {
    const plan = await this.findById(planId);
    if (!plan) return null;

    const priceMap = {
      MONTHLY: plan.monthly_price,
      YEARLY: plan.yearly_price,
      LIFETIME: plan.lifetime_price,
    };

    return {
      plan_id: plan.id,
      plan_name: plan.plan_name,
      billing_cycle: billingCycle,
      amount: priceMap[billingCycle] || 0,
      currency: 'INR',
    };
  }

  /**
   * Check if plan has specific feature
   */
  static async hasFeature(planId, featureName) {
    const plan = await this.findById(planId);
    if (!plan) return false;

    return plan[featureName] === true || plan[featureName] === 1;
  }

  /**
   * Get plan limits
   */
  static async getLimits(planId) {
    const plan = await this.findById(planId);
    if (!plan) return null;

    return {
      max_contacts: plan.max_contacts,
      max_templates: plan.max_templates,
      max_campaigns_per_month: plan.max_campaigns_per_month,
      max_messages_per_month: plan.max_messages_per_month,
      max_team_members: plan.max_team_members,
      max_whatsapp_numbers: plan.max_whatsapp_numbers,
    };
  }
}

export default SubscriptionPlan;