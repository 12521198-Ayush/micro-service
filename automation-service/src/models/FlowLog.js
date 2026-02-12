import pool from '../config/database.js';

class FlowLog {
  /**
   * Create a flow log entry
   */
  static async create(data) {
    const [result] = await pool.execute(
      'INSERT INTO flow_logs (flow_id, chat_id, contact_id, action_type, status, metadata) VALUES (?, ?, ?, ?, ?, ?)',
      [data.flow_id, data.chat_id || null, data.contact_id || null, data.action_type || null, data.status || 'completed', data.metadata || null]
    );
    return { id: result.insertId, ...data };
  }

  /**
   * Count logs by flow ID
   */
  static async countByFlowId(flowId) {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as count FROM flow_logs WHERE flow_id = ?',
      [flowId]
    );
    return rows[0].count;
  }

  /**
   * Get logs by flow ID
   */
  static async findByFlowId(flowId, { page = 1, limit = 50 } = {}) {
    const offset = (page - 1) * limit;
    const [rows] = await pool.execute(
      'SELECT * FROM flow_logs WHERE flow_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [flowId, limit, offset]
    );
    return rows;
  }
}

export default FlowLog;
