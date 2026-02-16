import pool from '../config/database.js';

// Helper function to convert ISO datetime to MySQL format
const formatDateTimeForMySQL = (isoString) => {
  if (!isoString) return null;
  const date = new Date(isoString);
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

class Campaign {
  static async create(campaignData) {
    const { userId, name, description, templateId, template_name, groupId, group_name, scheduledAt, status = 'draft', metadata } = campaignData;
    
    const formattedScheduledAt = formatDateTimeForMySQL(scheduledAt);
    
    const [result] = await pool.execute(
      `INSERT INTO campaigns (user_id, name, description, template_id, template_name, group_id, group_name, scheduled_at, status, metadata, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [userId, name, description, templateId, template_name || null, groupId, group_name || null, formattedScheduledAt, status, metadata || null]
    );
    
    return { id: result.insertId, ...campaignData };
  }

  static async findById(id, userId) {
    const [rows] = await pool.execute(
      'SELECT * FROM campaigns WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return rows[0] || null;
  }

  static async findByUserId(userId, filters = {}) {
    let query = 'SELECT * FROM campaigns WHERE user_id = ?';
    const params = [userId];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      const limitVal = parseInt(filters.limit) || 10;
      const offsetVal = parseInt(filters.offset) || 0;
      query += ` LIMIT ${limitVal} OFFSET ${offsetVal}`;
    }

    const [rows] = await pool.execute(query, params);
    return rows;
  }

  static async update(id, userId, updateData) {
    const fields = [];
    const values = [];

    Object.keys(updateData).forEach(key => {
      fields.push(`${key} = ?`);
      values.push(updateData[key]);
    });

    if (fields.length === 0) return null;

    fields.push('updated_at = NOW()');
    values.push(id, userId);

    const [result] = await pool.execute(
      `UPDATE campaigns SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );

    return result.affectedRows > 0;
  }

  static async delete(id, userId) {
    const [result] = await pool.execute(
      'DELETE FROM campaigns WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return result.affectedRows > 0;
  }

  static async count(userId, status = null) {
    let query = 'SELECT COUNT(*) as total FROM campaigns WHERE user_id = ?';
    const params = [userId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    const [rows] = await pool.execute(query, params);
    return rows[0].total;
  }

  static async getAnalytics(campaignId) {
    const [rows] = await pool.execute(
      `SELECT 
        COALESCE(c.total_recipients, 0) as total_recipients,
        COALESCE(c.sent_count, 0) as sent_count,
        COALESCE(c.delivered_count, 0) as delivered_count,
        COALESCE(c.read_count, 0) as read_count,
        COALESCE(c.failed_count, 0) as failed_count,
        COUNT(cl.id) as total_logs,
        SUM(CASE WHEN cl.status = 'sent' THEN 1 ELSE 0 END) as logs_sent,
        SUM(CASE WHEN cl.status = 'delivered' THEN 1 ELSE 0 END) as logs_delivered,
        SUM(CASE WHEN cl.status = 'read' THEN 1 ELSE 0 END) as logs_read,
        SUM(CASE WHEN cl.status = 'failed' THEN 1 ELSE 0 END) as logs_failed,
        SUM(CASE WHEN cl.status = 'pending' THEN 1 ELSE 0 END) as logs_pending
      FROM campaigns c
      LEFT JOIN campaign_logs cl ON cl.campaign_id = c.id
      WHERE c.id = ?
      GROUP BY c.id`,
      [campaignId]
    );
    
    if (!rows[0]) return {
      total_recipients: 0, sent_count: 0, delivered_count: 0,
      read_count: 0, failed_count: 0
    };

    const r = rows[0];
    return {
      total_recipients: r.total_recipients || r.total_logs || 0,
      sent_count: r.sent_count || Number(r.logs_sent) || 0,
      delivered_count: r.delivered_count || Number(r.logs_delivered) || 0,
      read_count: r.read_count || Number(r.logs_read) || 0,
      failed_count: r.failed_count || Number(r.logs_failed) || 0,
      pending_count: Number(r.logs_pending) || 0
    };
  }

  static async getMessages(campaignId, filters = {}) {
    let query = 'SELECT * FROM campaign_logs WHERE campaign_id = ?';
    const params = [campaignId];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      const limitVal = parseInt(filters.limit) || 50;
      const offsetVal = parseInt(filters.offset) || 0;
      query += ` LIMIT ${limitVal} OFFSET ${offsetVal}`;
    }

    const [rows] = await pool.execute(query, params);
    return rows;
  }

  static async getMessagesCount(campaignId, status = null) {
    let query = 'SELECT COUNT(*) as total FROM campaign_logs WHERE campaign_id = ?';
    const params = [campaignId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    const [rows] = await pool.execute(query, params);
    return rows[0].total;
  }

  static async createLog(logData) {
    const { campaignId, contactId, contactName, phoneNumber, status = 'pending' } = logData;
    const [result] = await pool.execute(
      `INSERT INTO campaign_logs (campaign_id, contact_id, contact_name, phone_number, status, created_at) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [campaignId, contactId, contactName, phoneNumber, status]
    );
    return { id: result.insertId, ...logData };
  }

  static async updateLog(logId, updateData) {
    const fields = [];
    const values = [];
    Object.keys(updateData).forEach(key => {
      fields.push(`${key} = ?`);
      values.push(updateData[key]);
    });
    if (fields.length === 0) return null;
    values.push(logId);
    const [result] = await pool.execute(
      `UPDATE campaign_logs SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  }
}

export default Campaign;
