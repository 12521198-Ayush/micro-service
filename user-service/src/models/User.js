import pool from '../config/database.js';
import { cache } from '../config/redis.js';

const CACHE_TTL = 3600; // 1 hour

class User {
  static async create(email, passwordHash, name) {
    const connection = await pool.getConnection();
    try {
      const query = 'INSERT INTO users (email, password, name) VALUES (?, ?, ?)';
      const [result] = await connection.execute(query, [email, passwordHash, name]);
      
      // Invalidate cache
      await cache.delete(`user_email:${email}`);
      
      return result.insertId;
    } finally {
      connection.release();
    }
  }

  static async findByEmail(email) {
    // Check cache first
    const cacheKey = `user_email:${email}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log(`Cache hit: ${cacheKey}`);
      return cached;
    }

    const connection = await pool.getConnection();
    try {
      const query = 'SELECT id, email, password, name, meta_business_account_id, user_balance, marketing_message_price, utility_message_price, auth_message_price FROM users WHERE email = ?';
      const [rows] = await connection.execute(query, [email]);
      const user = rows[0] || null;
      
      // Cache the result
      if (user) {
        await cache.set(cacheKey, user, CACHE_TTL);
      }
      
      return user;
    } finally {
      connection.release();
    }
  }

  static async findById(id) {
    // Check cache first
    const cacheKey = `user_id:${id}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log(`Cache hit: ${cacheKey}`);
      return cached;
    }

    const connection = await pool.getConnection();
    try {
      const query = 'SELECT id, email, name, meta_business_account_id, user_balance, marketing_message_price, utility_message_price, auth_message_price FROM users WHERE id = ?';
      const [rows] = await connection.execute(query, [id]);
      const user = rows[0] || null;
      
      // Cache the result
      if (user) {
        await cache.set(cacheKey, user, CACHE_TTL);
      }
      
      return user;
    } finally {
      connection.release();
    }
  }

  static async updatePassword(id, newPasswordHash) {
    const connection = await pool.getConnection();
    try {
      const query = 'UPDATE users SET password = ? WHERE id = ?';
      const [result] = await connection.execute(query, [newPasswordHash, id]);
      
      // Invalidate user cache
      if (result.affectedRows > 0) {
        await cache.delete(`user_id:${id}`);
      }
      
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  static async updateProfile(id, name, email) {
    const connection = await pool.getConnection();
    try {
      const query = 'UPDATE users SET name = ?, email = ? WHERE id = ?';
      const [result] = await connection.execute(query, [name, email, id]);
      
      // Invalidate user cache
      if (result.affectedRows > 0) {
        await cache.delete(`user_id:${id}`);
        await cache.delete(`user_email:${email}`);
      }
      
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  static async delete(id) {
    const connection = await pool.getConnection();
    try {
      // Get user before deletion to invalidate email cache
      const user = await this.findById(id);
      
      const query = 'DELETE FROM users WHERE id = ?';
      const [result] = await connection.execute(query, [id]);
      
      // Invalidate user cache
      if (result.affectedRows > 0) {
        await cache.delete(`user_id:${id}`);
        if (user && user.email) {
          await cache.delete(`user_email:${user.email}`);
        }
      }
      
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  static async createPasswordResetToken(email, token, expiresAt) {
    const connection = await pool.getConnection();
    try {
      const query = 'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?';
      const [result] = await connection.execute(query, [token, expiresAt, email]);
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  static async findByResetToken(token) {
    const connection = await pool.getConnection();
    try {
      const query = 'SELECT id, email, name, reset_token_expires FROM users WHERE reset_token = ? AND reset_token_expires > NOW()';
      const [rows] = await connection.execute(query, [token]);
      return rows[0] || null;
    } finally {
      connection.release();
    }
  }

  static async clearResetToken(id) {
    const connection = await pool.getConnection();
    try {
      const query = 'UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = ?';
      const [result] = await connection.execute(query, [id]);
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  static async getResetAttempts(email) {
    const connection = await pool.getConnection();
    try {
      const query = 'SELECT reset_attempts, reset_attempts_reset_at FROM users WHERE email = ?';
      const [rows] = await connection.execute(query, [email]);
      return rows[0] || null;
    } finally {
      connection.release();
    }
  }

  static async incrementResetAttempts(email) {
    const connection = await pool.getConnection();
    try {
      const query = `
        UPDATE users 
        SET reset_attempts = reset_attempts + 1,
            reset_attempts_reset_at = CASE 
              WHEN reset_attempts_reset_at IS NULL THEN NOW()
              WHEN reset_attempts_reset_at < DATE_SUB(NOW(), INTERVAL 1 DAY) THEN NOW()
              ELSE reset_attempts_reset_at
            END
        WHERE email = ?
      `;
      const [result] = await connection.execute(query, [email]);
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  static async resetAttemptCounter(email) {
    const connection = await pool.getConnection();
    try {
      const query = 'UPDATE users SET reset_attempts = 0, reset_attempts_reset_at = NULL WHERE email = ?';
      const [result] = await connection.execute(query, [email]);
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  static async updateMetaBusinessAccountId(userId, metaBusinessAccountId) {
    const connection = await pool.getConnection();
    try {
      const query = 'UPDATE users SET meta_business_account_id = ? WHERE id = ?';
      const [result] = await connection.execute(query, [metaBusinessAccountId, userId]);
      
      // Invalidate user cache
      if (result.affectedRows > 0) {
        await cache.delete(`user_id:${userId}`);
        // Get user email to invalidate email cache
        const user = await this.findById(userId);
        if (user && user.email) {
          await cache.delete(`user_email:${user.email}`);
        }
      }
      
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  static async getBalance(userId) {
    const connection = await pool.getConnection();
    try {
      const query = 'SELECT user_balance FROM users WHERE id = ?';
      const [rows] = await connection.execute(query, [userId]);
      return rows[0]?.user_balance || 0;
    } finally {
      connection.release();
    }
  }

  static async updateBalance(userId, newBalance) {
    const connection = await pool.getConnection();
    try {
      const query = 'UPDATE users SET user_balance = ? WHERE id = ?';
      const [result] = await connection.execute(query, [newBalance, userId]);
      
      // Invalidate user cache
      if (result.affectedRows > 0) {
        await cache.delete(`user_id:${userId}`);
      }
      
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  static async updateMessagePrices(userId, prices) {
    const connection = await pool.getConnection();
    try {
      const updates = [];
      const values = [];
      
      if (prices.marketingMessagePrice !== undefined) {
        updates.push('marketing_message_price = ?');
        values.push(prices.marketingMessagePrice);
      }
      if (prices.utilityMessagePrice !== undefined) {
        updates.push('utility_message_price = ?');
        values.push(prices.utilityMessagePrice);
      }
      if (prices.authMessagePrice !== undefined) {
        updates.push('auth_message_price = ?');
        values.push(prices.authMessagePrice);
      }
      
      if (updates.length === 0) return false;
      
      values.push(userId);
      const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
      const [result] = await connection.execute(query, values);
      
      // Invalidate user cache
      if (result.affectedRows > 0) {
        await cache.delete(`user_id:${userId}`);
      }
      
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }
}

export default User;
