import pool from '../config/database.js';

class Message {
  static async create(messageData) {
    const { userId, phoneNumber, templateId, messageType, content, status = 'pending' } = messageData;
    
    const [result] = await pool.execute(
      `INSERT INTO messages (user_id, phone_number, template_id, message_type, content, status, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [userId, phoneNumber, templateId, messageType, JSON.stringify(content), status]
    );
    
    return { id: result.insertId, ...messageData };
  }

  static async findById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM messages WHERE id = ?',
      [id]
    );
    if (rows[0] && rows[0].content) {
      rows[0].content = JSON.parse(rows[0].content);
    }
    return rows[0] || null;
  }

  static async findByUserId(userId, filters = {}) {
    let query = 'SELECT * FROM messages WHERE user_id = ?';
    const params = [userId];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(filters.limit), parseInt(filters.offset || 0));
    }

    const [rows] = await pool.execute(query, params);
    return rows.map(row => {
      if (row.content) {
        row.content = JSON.parse(row.content);
      }
      return row;
    });
  }

  static async updateStatus(id, status, metaMessageId = null, errorMessage = null) {
    const fields = ['status = ?'];
    const values = [status];

    if (metaMessageId) {
      fields.push('meta_message_id = ?');
      values.push(metaMessageId);
    }

    if (errorMessage) {
      fields.push('error_message = ?');
      values.push(errorMessage);
    }

    if (status === 'sent') {
      fields.push('sent_at = NOW()');
    } else if (status === 'delivered') {
      fields.push('delivered_at = NOW()');
    } else if (status === 'read') {
      fields.push('read_at = NOW()');
    }

    values.push(id);

    const [result] = await pool.execute(
      `UPDATE messages SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );

    return result.affectedRows > 0;
  }

  static async count(userId, status = null) {
    let query = 'SELECT COUNT(*) as total FROM messages WHERE user_id = ?';
    const params = [userId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    const [rows] = await pool.execute(query, params);
    return rows[0].total;
  }
}

export default Message;
