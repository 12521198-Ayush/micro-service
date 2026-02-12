import pool from '../config/database.js';

class FlowUserData {
  /**
   * Create or get existing flow user data for a contact
   */
  static async create(data) {
    const [result] = await pool.execute(
      'INSERT INTO flow_user_data (contact_id, flow_id, current_step) VALUES (?, ?, ?)',
      [data.contact_id, data.flow_id, data.current_step || '1']
    );
    return this.findById(result.insertId);
  }

  /**
   * Find by ID
   */
  static async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM flow_user_data WHERE id = ?', [id]);
    return rows[0] || null;
  }

  /**
   * Find by contact ID
   */
  static async findByContactId(contactId) {
    const [rows] = await pool.execute(
      'SELECT * FROM flow_user_data WHERE contact_id = ?',
      [contactId]
    );
    return rows[0] || null;
  }

  /**
   * Find by contact and flow
   */
  static async findByContactAndFlow(contactId, flowId) {
    const [rows] = await pool.execute(
      'SELECT * FROM flow_user_data WHERE contact_id = ? AND flow_id = ?',
      [contactId, flowId]
    );
    return rows[0] || null;
  }

  /**
   * Update current step
   */
  static async updateStep(contactId, currentStep) {
    await pool.execute(
      'UPDATE flow_user_data SET current_step = ? WHERE contact_id = ?',
      [String(currentStep), contactId]
    );
    return this.findByContactId(contactId);
  }

  /**
   * Delete by contact ID (flow completed or failed)
   */
  static async deleteByContactId(contactId) {
    await pool.execute('DELETE FROM flow_user_data WHERE contact_id = ?', [contactId]);
    return true;
  }

  /**
   * Delete by contact and flow
   */
  static async deleteByContactAndFlow(contactId, flowId) {
    await pool.execute(
      'DELETE FROM flow_user_data WHERE contact_id = ? AND flow_id = ?',
      [contactId, flowId]
    );
    return true;
  }
}

export default FlowUserData;
