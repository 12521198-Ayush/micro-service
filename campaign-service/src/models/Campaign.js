import pool from '../config/database.js';

// Helper function to convert ISO datetime to MySQL format
const formatDateTimeForMySQL = (isoString) => {
  if (!isoString) return null;
  const date = new Date(isoString);
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

class Campaign {
  static async create(campaignData) {
    const { userId, name, description, templateId, groupId, scheduledAt, status = 'draft' } = campaignData;
    
    const formattedScheduledAt = formatDateTimeForMySQL(scheduledAt);
    
    const [result] = await pool.execute(
      `INSERT INTO campaigns (user_id, name, description, template_id, group_id, scheduled_at, status, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [userId, name, description, templateId, groupId, formattedScheduledAt, status]
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
}

export default Campaign;
