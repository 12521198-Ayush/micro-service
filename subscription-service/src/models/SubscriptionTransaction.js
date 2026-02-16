import pool from '../config/database.js';
import { cache } from '../config/redis.js';

class SubscriptionTransaction {
  /**
   * Create new transaction
   */
  static async create(transactionData) {
    const connection = await pool.getConnection();
    try {
      const query = `
        INSERT INTO subscription_transactions (
          subscription_id, user_id, transaction_type, amount, currency,
          payment_method, payment_id, payment_status,
          gateway_order_id, gateway_payment_id, gateway_signature, gateway_response,
          invoice_number, invoice_url, description, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [result] = await connection.execute(query, [
        transactionData.subscription_id,
        transactionData.user_id,
        transactionData.transaction_type,
        transactionData.amount,
        transactionData.currency || 'INR',
        transactionData.payment_method || 'RAZORPAY',
        transactionData.payment_id || null,
        transactionData.payment_status || 'PENDING',
        transactionData.gateway_order_id || null,
        transactionData.gateway_payment_id || null,
        transactionData.gateway_signature || null,
        transactionData.gateway_response ? JSON.stringify(transactionData.gateway_response) : null,
        transactionData.invoice_number || null,
        transactionData.invoice_url || null,
        transactionData.description || null,
        transactionData.metadata ? JSON.stringify(transactionData.metadata) : null,
      ]);

      // Invalidate cache
      await cache.deletePattern(`transactions:user:${transactionData.user_id}:*`);

      return result.insertId;
    } finally {
      connection.release();
    }
  }

  /**
   * Get transaction by ID
   */
  static async findById(transactionId) {
    const connection = await pool.getConnection();
    try {
      const query = 'SELECT * FROM subscription_transactions WHERE id = ?';
      const [rows] = await connection.execute(query, [transactionId]);
      return rows[0] || null;
    } finally {
      connection.release();
    }
  }

  /**
   * Get user transactions
   */
  static async getUserTransactions(userId, limit = 50, offset = 0) {
    const cacheKey = `transactions:user:${userId}:${limit}:${offset}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log(`✓ Cache hit: ${cacheKey}`);
      return cached;
    }

    const connection = await pool.getConnection();
    try {
      const query = `
        SELECT st.*, sp.plan_name
        FROM subscription_transactions st
        JOIN user_subscriptions us ON st.subscription_id = us.id
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE st.user_id = ?
        ORDER BY st.created_at DESC
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `;

      const [rows] = await connection.execute(query, [userId]);
      
      await cache.set(cacheKey, rows, 300); // 5 minutes cache
      return rows;
    } finally {
      connection.release();
    }
  }

  /**
   * Get transaction count for user
   */
  static async getTransactionCount(userId) {
    const connection = await pool.getConnection();
    try {
      const query = 'SELECT COUNT(*) as count FROM subscription_transactions WHERE user_id = ?';
      const [rows] = await connection.execute(query, [userId]);
      return rows[0].count;
    } finally {
      connection.release();
    }
  }

  /**
   * Update transaction status
   */
  static async updateStatus(transactionId, status, gatewayData = {}) {
    const connection = await pool.getConnection();
    try {
      const query = `
        UPDATE subscription_transactions
        SET payment_status = ?,
            gateway_payment_id = ?,
            gateway_signature = ?,
            gateway_response = ?
        WHERE id = ?
      `;

      const [result] = await connection.execute(query, [
        status,
        gatewayData.payment_id || null,
        gatewayData.signature || null,
        gatewayData.response ? JSON.stringify(gatewayData.response) : null,
        transactionId,
      ]);

      // Invalidate cache
      if (result.affectedRows > 0) {
        const transaction = await this.findById(transactionId);
        if (transaction) {
          await cache.deletePattern(`transactions:user:${transaction.user_id}:*`);
        }
      }

      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * Get transactions by subscription
   */
  static async getBySubscription(subscriptionId) {
    const connection = await pool.getConnection();
    try {
      const query = `
        SELECT * FROM subscription_transactions
        WHERE subscription_id = ?
        ORDER BY created_at DESC
      `;

      const [rows] = await connection.execute(query, [subscriptionId]);
      return rows;
    } finally {
      connection.release();
    }
  }

  /**
   * Get successful transactions total amount
   */
  static async getTotalRevenue(userId = null) {
    const connection = await pool.getConnection();
    try {
      let query = `
        SELECT SUM(amount) as total_revenue
        FROM subscription_transactions
        WHERE payment_status = 'SUCCESS'
      `;
      
      const params = [];
      if (userId) {
        query += ' AND user_id = ?';
        params.push(userId);
      }

      const [rows] = await connection.execute(query, params);
      return parseFloat(rows[0].total_revenue || 0);
    } finally {
      connection.release();
    }
  }

  /**
   * Get transaction by gateway order ID
   */
  static async findByGatewayOrderId(orderId) {
    const connection = await pool.getConnection();
    try {
      const query = 'SELECT * FROM subscription_transactions WHERE gateway_order_id = ?';
      const [rows] = await connection.execute(query, [orderId]);
      return rows[0] || null;
    } finally {
      connection.release();
    }
  }

  /**
   * Get pending transactions
   */
  static async getPendingTransactions(userId = null) {
    const connection = await pool.getConnection();
    try {
      let query = `
        SELECT * FROM subscription_transactions
        WHERE payment_status = 'PENDING'
      `;
      
      const params = [];
      if (userId) {
        query += ' AND user_id = ?';
        params.push(userId);
      }

      query += ' ORDER BY created_at DESC';

      const [rows] = await connection.execute(query, params);
      return rows;
    } finally {
      connection.release();
    }
  }

  /**
   * Mark transaction as refunded
   */
  static async markAsRefunded(transactionId, refundData) {
    const connection = await pool.getConnection();
    try {
      const query = `
        UPDATE subscription_transactions
        SET payment_status = 'REFUNDED',
            metadata = ?
        WHERE id = ?
      `;

      const metadata = {
        refund_id: refundData.refund_id,
        refund_amount: refundData.refund_amount,
        refund_reason: refundData.refund_reason,
        refunded_at: new Date().toISOString(),
      };

      const [result] = await connection.execute(query, [
        JSON.stringify(metadata),
        transactionId,
      ]);

      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }
}

export default SubscriptionTransaction;