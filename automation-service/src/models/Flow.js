import pool from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

class Flow {
  /**
   * Create a new flow
   */
  static async create(data) {
    const uuid = uuidv4();
    const [result] = await pool.execute(
      `INSERT INTO flows (uuid, organization_id, user_id, name, description, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuid, data.organization_id, data.user_id, data.name, data.description || null, 'inactive']
    );
    return this.findById(result.insertId);
  }

  /**
   * Find flow by ID
   */
  static async findById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM flows WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Find flow by UUID
   */
  static async findByUuid(uuid) {
    const [rows] = await pool.execute(
      'SELECT * FROM flows WHERE uuid = ? AND deleted_at IS NULL',
      [uuid]
    );
    return rows[0] || null;
  }

  /**
   * List flows by user with pagination and search
   */
  static async listByUser(userId, { search = '', page = 1, limit = 10 } = {}) {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE f.user_id = ? AND f.deleted_at IS NULL';
    const params = [userId];

    if (search) {
      whereClause += ' AND f.name LIKE ?';
      params.push(`%${search}%`);
    }

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM flows f ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Get flows with log count - use query() for LIMIT/OFFSET compatibility
    const [rows] = await pool.query(
      `SELECT f.*, COUNT(fl.id) as flow_logs_count
       FROM flows f
       LEFT JOIN flow_logs fl ON f.id = fl.flow_id
       ${whereClause}
       GROUP BY f.id
       ORDER BY f.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    return {
      data: rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Update a flow
   */
  static async update(uuid, data) {
    const fields = [];
    const values = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.metadata !== undefined) { fields.push('metadata = ?'); values.push(data.metadata); }
    if (data.trigger !== undefined) { fields.push('`trigger` = ?'); values.push(data.trigger); }
    if (data.keywords !== undefined) { fields.push('keywords = ?'); values.push(data.keywords); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }

    if (fields.length === 0) return this.findByUuid(uuid);

    values.push(uuid);
    await pool.execute(
      `UPDATE flows SET ${fields.join(', ')} WHERE uuid = ? AND deleted_at IS NULL`,
      values
    );

    return this.findByUuid(uuid);
  }

  /**
   * Soft delete a flow
   */
  static async delete(uuid) {
    await pool.execute(
      'UPDATE flows SET deleted_at = NOW() WHERE uuid = ? AND deleted_at IS NULL',
      [uuid]
    );
    return true;
  }

  /**
   * Duplicate a flow
   */
  static async duplicate(uuid) {
    const original = await this.findByUuid(uuid);
    if (!original) return null;

    const baseName = original.name.replace(/\(\d+\)$/, '').trim();

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as count FROM flows WHERE (name LIKE ? OR name = ?) AND organization_id = ? AND deleted_at IS NULL`,
      [`${baseName} (%)`, baseName, original.organization_id]
    );
    const count = countResult[0].count;
    const newName = count ? `${baseName} (${count})` : `${baseName} (1)`;

    const newUuid = uuidv4();
    await pool.execute(
      `INSERT INTO flows (uuid, organization_id, user_id, name, description, \`trigger\`, keywords, metadata, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'inactive')`,
      [newUuid, original.organization_id, original.user_id, newName, original.description, original.trigger, original.keywords, original.metadata]
    );

    return this.findByUuid(newUuid);
  }

  /**
   * Get analytics for a user
   */
  static async getAnalytics(userId) {
    const [totalResult] = await pool.execute(
      'SELECT COUNT(*) as count FROM flows WHERE user_id = ? AND deleted_at IS NULL',
      [userId]
    );
    const [activeResult] = await pool.execute(
      'SELECT COUNT(*) as count FROM flows WHERE user_id = ? AND status = "active" AND deleted_at IS NULL',
      [userId]
    );
    const [inactiveResult] = await pool.execute(
      'SELECT COUNT(*) as count FROM flows WHERE user_id = ? AND status = "inactive" AND deleted_at IS NULL',
      [userId]
    );
    const [runsResult] = await pool.execute(
      `SELECT COUNT(fl.id) as count FROM flow_logs fl
       INNER JOIN flows f ON f.id = fl.flow_id
       WHERE f.user_id = ? AND f.deleted_at IS NULL`,
      [userId]
    );

    return {
      totalFlows: totalResult[0].count,
      activeFlows: activeResult[0].count,
      inactiveFlows: inactiveResult[0].count,
      totalRuns: runsResult[0].count
    };
  }

  /**
   * Find active flows by trigger type for a user
   */
  static async findActiveByTrigger(userId, triggerType) {
    const [rows] = await pool.execute(
      'SELECT * FROM flows WHERE user_id = ? AND `trigger` = ? AND status = "active" AND deleted_at IS NULL',
      [userId, triggerType]
    );
    return rows;
  }

  /**
   * Find active keyword flows matching a message (exact phrase match)
   */
  static async findByKeywordExact(userId, message) {
    const [rows] = await pool.execute(
      `SELECT * FROM flows WHERE \`trigger\` = 'keywords' AND user_id = ? AND status = 'active' AND deleted_at IS NULL AND FIND_IN_SET(?, LOWER(REPLACE(keywords, ', ', ',')))`,
      [userId, message.toLowerCase().trim()]
    );
    return rows[0] || null;
  }

  /**
   * Find active keyword flows matching individual words
   */
  static async findByKeywordPartial(userId, message) {
    const words = message.toLowerCase().trim().split(' ').filter(w => w.length > 0);
    if (words.length === 0) return null;

    const conditions = words.map(() => "FIND_IN_SET(?, LOWER(REPLACE(keywords, ', ', ',')))");
    const [rows] = await pool.execute(
      `SELECT * FROM flows WHERE \`trigger\` = 'keywords' AND user_id = ? AND status = 'active' AND deleted_at IS NULL AND (${conditions.join(' OR ')})`,
      [userId, ...words]
    );
    return rows[0] || null;
  }
}

export default Flow;
