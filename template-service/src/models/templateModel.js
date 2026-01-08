import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

/**
 * Template Model - Database operations for custom templates
 */

class TemplateModel {
  /**
   * Get database connection pool
   */
  static async getConnection() {
    try {
      const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: 'template_service',
        port: process.env.DB_PORT || 3306,
      });
      return connection;
    } catch (error) {
      console.error('Database connection error:', error);
      throw error;
    }
  }

  /**
   * Create a new custom template in database
   * @param {Object} templateData - Template data to save
   * @param {number} userId - User ID from JWT token
   * @returns {Promise<Object>} Created template with ID
   */
  static async createTemplate(templateData, userId) {
    let connection;
    try {
      connection = await this.getConnection();

      const uuid = uuidv4();
      const {
        metaTemplateId,
        name,
        category,
        language,
        components,
        parameterFormat,
        status = 'Pending'
      } = templateData;

      // Prepare metadata JSON
      const metadata = JSON.stringify({
        components,
        parameter_format: parameterFormat,
        created_via: 'api'
      });

      const query = `
        INSERT INTO custom_template (
          user_id,
          uuid,
          meta_id,
          name,
          category,
          language,
          metadata,
          status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        userId,
        uuid,
        metaTemplateId,
        name,
        category,
        language,
        metadata,
        status
      ];

      const [result] = await connection.execute(query, values);

      return {
        id: result.insertId,
        uuid,
        metaTemplateId,
        name,
        category,
        language,
        status,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    } finally {
      if (connection) await connection.end();
    }
  }

  /**
   * Get template by UUID
   * @param {string} uuid - Template UUID
   * @param {number} userId - User ID for authorization
   * @returns {Promise<Object>} Template data
   */
  static async getTemplateByUuid(uuid, userId) {
    let connection;
    try {
      connection = await this.getConnection();

      const query = `
        SELECT * FROM custom_template
        WHERE uuid = ? AND user_id = ?
      `;

      const [rows] = await connection.execute(query, [uuid, userId]);

      if (rows.length === 0) {
        return null;
      }

      return this.formatTemplate(rows[0]);
    } catch (error) {
      console.error('Error fetching template:', error);
      throw error;
    } finally {
      if (connection) await connection.end();
    }
  }

  /**
   * Get template by Meta ID
   * @param {string} metaId - Meta template ID
   * @returns {Promise<Object>} Template data
   */
  static async getTemplateByMetaId(metaId) {
    let connection;
    try {
      connection = await this.getConnection();

      const query = `
        SELECT * FROM custom_template
        WHERE meta_id = ?
      `;

      const [rows] = await connection.execute(query, [metaId]);

      if (rows.length === 0) {
        return null;
      }

      return this.formatTemplate(rows[0]);
    } catch (error) {
      console.error('Error fetching template by meta_id:', error);
      throw error;
    } finally {
      if (connection) await connection.end();
    }
  }

  /**
   * Get all templates for a user
   * @param {number} userId - User ID
   * @param {Object} options - Filter options (status, limit, offset)
   * @returns {Promise<Array>} Array of templates
   */
  static async getUserTemplates(userId, options = {}) {
    let connection;
    try {
      connection = await this.getConnection();

      const { status, limit = 10, offset = 0 } = options;

      let query = 'SELECT * FROM custom_template WHERE user_id = ?';
      const params = [userId];

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [rows] = await connection.execute(query, params);

      return rows.map(row => this.formatTemplate(row));
    } catch (error) {
      console.error('Error fetching user templates:', error);
      throw error;
    } finally {
      if (connection) await connection.end();
    }
  }

  /**
   * Update template status
   * @param {string} uuid - Template UUID
   * @param {string} newStatus - New status (Pending, approve, rejected)
   * @param {number} userId - User ID for authorization
   * @returns {Promise<Object>} Updated template
   */
  static async updateTemplateStatus(uuid, newStatus, userId) {
    let connection;
    try {
      connection = await this.getConnection();

      const query = `
        UPDATE custom_template
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE uuid = ? AND user_id = ?
      `;

      const [result] = await connection.execute(query, [newStatus, uuid, userId]);

      if (result.affectedRows === 0) {
        return null;
      }

      return this.getTemplateByUuid(uuid, userId);
    } catch (error) {
      console.error('Error updating template status:', error);
      throw error;
    } finally {
      if (connection) await connection.end();
    }
  }

  /**
   * Update template with Meta approval status
   * @param {string} uuid - Template UUID
   * @param {string} metaStatus - Meta API status (APPROVED, REJECTED, etc.)
   * @returns {Promise<Object>} Updated template
   */
  static async updateMetaStatus(uuid, metaStatus) {
    let connection;
    try {
      connection = await this.getConnection();

      // Map Meta status to our status
      const statusMap = {
        'APPROVED': 'approve',
        'REJECTED': 'rejected',
        'PENDING': 'Pending'
      };

      const newStatus = statusMap[metaStatus] || 'Pending';

      const query = `
        UPDATE custom_template
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE uuid = ?
      `;

      await connection.execute(query, [newStatus, uuid]);

      return this.getTemplateByMetaId(uuid);
    } catch (error) {
      console.error('Error updating meta status:', error);
      throw error;
    } finally {
      if (connection) await connection.end();
    }
  }

  /**
   * Update template
   * @param {string} uuid - Template UUID
   * @param {Object} updateData - Data to update
   * @param {number} userId - User ID for authorization
   * @returns {Promise<Object>} Updated template
   */
  static async updateTemplate(uuid, updateData, userId) {
    let connection;
    try {
      connection = await this.getConnection();

      const { category, metadata, status } = updateData;

      // Prepare metadata JSON
      const metadataJson = JSON.stringify({
        components: metadata,
        updated_via: 'api'
      });

      const query = `
        UPDATE custom_template
        SET category = ?, metadata = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE uuid = ? AND user_id = ?
      `;

      const [result] = await connection.execute(query, [
        category,
        metadataJson,
        status,
        uuid,
        userId
      ]);

      if (result.affectedRows === 0) {
        return null;
      }

      return this.getTemplateByUuid(uuid, userId);
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    } finally {
      if (connection) await connection.end();
    }
  }

  /**
   * Delete template
   * @param {string} uuid - Template UUID
   * @param {number} userId - User ID for authorization
   * @returns {Promise<boolean>} Success status
   */
  static async deleteTemplate(uuid, userId) {
    let connection;
    try {
      connection = await this.getConnection();

      const query = `
        DELETE FROM custom_template
        WHERE uuid = ? AND user_id = ?
      `;

      const [result] = await connection.execute(query, [uuid, userId]);

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    } finally {
      if (connection) await connection.end();
    }
  }

  /**
   * Get template count for user
   * @param {number} userId - User ID
   * @param {string} status - Filter by status (optional)
   * @returns {Promise<number>} Count of templates
   */
  static async getTemplateCount(userId, status = null) {
    let connection;
    try {
      connection = await this.getConnection();

      let query = 'SELECT COUNT(*) as count FROM custom_template WHERE user_id = ?';
      const params = [userId];

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      const [rows] = await connection.execute(query, params);

      return rows[0].count;
    } catch (error) {
      console.error('Error getting template count:', error);
      throw error;
    } finally {
      if (connection) await connection.end();
    }
  }

  /**
   * Format template data from database
   * @param {Object} dbTemplate - Raw database template object
   * @returns {Object} Formatted template
   */
  static formatTemplate(dbTemplate) {
    return {
      id: dbTemplate.id,
      uuid: dbTemplate.uuid,
      metaTemplateId: dbTemplate.meta_id,
      name: dbTemplate.name,
      category: dbTemplate.category,
      language: dbTemplate.language,
      status: dbTemplate.status,
      metadata: typeof dbTemplate.metadata === 'string'
        ? JSON.parse(dbTemplate.metadata)
        : dbTemplate.metadata,
      createdAt: dbTemplate.created_at,
      updatedAt: dbTemplate.updated_at,
      userId: dbTemplate.user_id
    };
  }

  /**
   * Get templates by status
   * @param {string} status - Template status
   * @param {Object} options - Filter options (limit, offset)
   * @returns {Promise<Array>} Array of templates
   */
  static async getTemplatesByStatus(status, options = {}) {
    let connection;
    try {
      connection = await this.getConnection();

      const { limit = 10, offset = 0 } = options;

      const query = `
        SELECT * FROM custom_template
        WHERE status = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `;

      const [rows] = await connection.execute(query, [status, limit, offset]);

      return rows.map(row => this.formatTemplate(row));
    } catch (error) {
      console.error('Error fetching templates by status:', error);
      throw error;
    } finally {
      if (connection) await connection.end();
    }
  }

  /**
   * Get all templates with optional filters
   * @param {Object} filters - Optional filters (status, name)
   * @returns {Promise<Array>} Array of all templates
   */
  static async getAllTemplates(filters = {}) {
    let connection;
    try {
      connection = await this.getConnection();

      const { status, name } = filters;
      
      let query = 'SELECT * FROM custom_template WHERE 1=1';
      const params = [];

      // Add status filter if provided
      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      // Add name filter if provided (partial match)
      if (name) {
        query += ' AND name LIKE ?';
        params.push(`%${name}%`);
      }

      query += ' ORDER BY created_at DESC';

      const [rows] = await connection.execute(query, params);

      return rows.map(row => this.formatTemplate(row));
    } catch (error) {
      console.error('Error fetching all templates:', error);
      throw error;
    } finally {
      if (connection) await connection.end();
    }
  }
}

export default TemplateModel;
