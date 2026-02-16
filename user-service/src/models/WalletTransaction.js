import pool from '../config/database.js';
import { cache } from '../config/redis.js';

class WalletTransaction {
  static async create(userId, transactionType, amount, balanceBefore, balanceAfter, description) {
    const connection = await pool.getConnection();
    try {
      const query = `
        INSERT INTO wallet_transactions 
        (user_id, transaction_type, amount, balance_before, balance_after, description) 
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      const [result] = await connection.execute(query, [
        userId,
        transactionType,
        amount,
        balanceBefore,
        balanceAfter,
        description
      ]);
      
      return result.insertId;
    } finally {
      connection.release();
    }
  }

  static async findByUserId(userId, limit = 50, offset = 0) {
    const connection = await pool.getConnection();
    try {
      // Using query() instead of execute() because MySQL prepared statements
      // have issues with LIMIT/OFFSET placeholders
      const query = `
        SELECT id, transaction_type, amount, balance_before, balance_after, description, created_at 
        FROM wallet_transactions 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `;
      const [rows] = await connection.execute(query, [userId]);
      return rows;
    } finally {
      connection.release();
    }
  }

  static async getTransactionCount(userId) {
    const connection = await pool.getConnection();
    try {
      const query = 'SELECT COUNT(*) as count FROM wallet_transactions WHERE user_id = ?';
      const [rows] = await connection.execute(query, [userId]);
      return rows[0].count;
    } finally {
      connection.release();
    }
  }

  static async findById(id) {
    const connection = await pool.getConnection();
    try {
      const query = `
        SELECT id, user_id, transaction_type, amount, balance_before, balance_after, description, created_at 
        FROM wallet_transactions 
        WHERE id = ?
      `;
      const [rows] = await connection.execute(query, [id]);
      return rows[0] || null;
    } finally {
      connection.release();
    }
  }

  static async getTotalCredits(userId) {
    const connection = await pool.getConnection();
    try {
      const query = `
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM wallet_transactions 
        WHERE user_id = ? AND transaction_type = 'credit'
      `;
      const [rows] = await connection.execute(query, [userId]);
      return parseFloat(rows[0].total);
    } finally {
      connection.release();
    }
  }

  static async getTotalDebits(userId) {
    const connection = await pool.getConnection();
    try {
      const query = `
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM wallet_transactions 
        WHERE user_id = ? AND transaction_type = 'debit'
      `;
      const [rows] = await connection.execute(query, [userId]);
      return parseFloat(rows[0].total);
    } finally {
      connection.release();
    }
  }
}

export default WalletTransaction;
