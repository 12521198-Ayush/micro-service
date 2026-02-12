import pool from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

class FlowMedia {
  /**
   * Create a flow media entry
   */
  static async create(data) {
    const uuid = uuidv4();
    const [result] = await pool.execute(
      'INSERT INTO flow_media (uuid, flow_id, step_id, path, location, metadata) VALUES (?, ?, ?, ?, ?, ?)',
      [uuid, data.flow_id, data.step_id, data.path || null, data.location || 'local', data.metadata || null]
    );
    return this.findById(result.insertId);
  }

  /**
   * Find by ID
   */
  static async findById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM flow_media WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Find by UUID
   */
  static async findByUuid(uuid) {
    const [rows] = await pool.execute(
      'SELECT * FROM flow_media WHERE uuid = ? AND deleted_at IS NULL',
      [uuid]
    );
    return rows[0] || null;
  }

  /**
   * Find by flow and step
   */
  static async findByFlowAndStep(flowId, stepId) {
    const [rows] = await pool.execute(
      'SELECT * FROM flow_media WHERE flow_id = ? AND step_id = ? AND deleted_at IS NULL',
      [flowId, stepId]
    );
    return rows[0] || null;
  }

  /**
   * Delete by flow ID
   */
  static async deleteByFlowId(flowId) {
    await pool.execute(
      'UPDATE flow_media SET deleted_at = NOW() WHERE flow_id = ?',
      [flowId]
    );
    return true;
  }
}

export default FlowMedia;
