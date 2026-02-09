import pool from '../config/database.js';

class TicketMessage {
  static async create(ticketId, userId, messageData) {
    const connection = await pool.getConnection();
    try {
      const query = `
        INSERT INTO ticket_messages (
          ticket_id, user_id, message, message_type, attachments, is_internal
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      const [result] = await connection.execute(query, [
        ticketId,
        userId,
        messageData.message,
        messageData.messageType || 'USER_REPLY',
        messageData.attachments ? JSON.stringify(messageData.attachments) : null,
        messageData.isInternal || false,
      ]);

      return result.insertId;
    } finally {
      connection.release();
    }
  }

  static async getTicketMessages(ticketId, includeInternal = false) {
    const connection = await pool.getConnection();
    try {
      let query = 'SELECT * FROM ticket_messages WHERE ticket_id = ?';
      const params = [ticketId];

      if (!includeInternal) {
        query += ' AND is_internal = FALSE';
      }

      query += ' ORDER BY created_at ASC';

      const [rows] = await connection.execute(query, params);
      return rows;
    } finally {
      connection.release();
    }
  }

  static async getMessageCount(ticketId) {
    const connection = await pool.getConnection();
    try {
      const query = 'SELECT COUNT(*) as count FROM ticket_messages WHERE ticket_id = ? AND is_internal = FALSE';
      const [rows] = await connection.execute(query, [ticketId]);
      return rows[0].count;
    } finally {
      connection.release();
    }
  }
}

export default TicketMessage;