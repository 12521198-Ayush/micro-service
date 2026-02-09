import pool from '../config/database.js';
import { cache } from '../config/redis.js';

const CACHE_TTL = 300; // 5 minutes

class SupportTicket {
  /**
   * Generate unique ticket number
   */
  static generateTicketNumber() {
    const prefix = 'TKT';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Create new support ticket
   */
  static async create(userId, ticketData) {
    const connection = await pool.getConnection();
    try {
      const ticketNumber = this.generateTicketNumber();

      const query = `
        INSERT INTO support_tickets (
          ticket_number, user_id, subject, description, category,
          priority, status, tags, attachments, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, ?)
      `;

      const [result] = await connection.execute(query, [
        ticketNumber,
        userId,
        ticketData.subject,
        ticketData.description,
        ticketData.category || 'GENERAL',
        ticketData.priority || 'MEDIUM',
        ticketData.tags ? JSON.stringify(ticketData.tags) : null,
        ticketData.attachments ? JSON.stringify(ticketData.attachments) : null,
        ticketData.metadata ? JSON.stringify(ticketData.metadata) : null,
      ]);

      // Log activity
      await this.logActivity(result.insertId, userId, 'CREATED', null, null, 'Ticket created');

      // Invalidate cache
      await cache.deletePattern(`tickets:user:${userId}:*`);

      return {
        id: result.insertId,
        ticketNumber,
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Get ticket by ID
   */
  static async findById(ticketId, userId = null) {
    const cacheKey = `ticket:${ticketId}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log(`✓ Cache hit: ${cacheKey}`);
      return cached;
    }

    const connection = await pool.getConnection();
    try {
      let query = 'SELECT * FROM support_tickets WHERE id = ?';
      const params = [ticketId];

      // If userId provided, ensure user owns ticket or is admin
      if (userId) {
        query += ' AND (user_id = ? OR ? IN (SELECT user_id FROM support_agents WHERE is_active = TRUE))';
        params.push(userId, userId);
      }

      const [rows] = await connection.execute(query, params);
      const ticket = rows[0] || null;

      if (ticket) {
        await cache.set(cacheKey, ticket, CACHE_TTL);
      }

      return ticket;
    } finally {
      connection.release();
    }
  }

  /**
   * Get ticket by ticket number
   */
  static async findByTicketNumber(ticketNumber, userId = null) {
    const connection = await pool.getConnection();
    try {
      let query = 'SELECT * FROM support_tickets WHERE ticket_number = ?';
      const params = [ticketNumber];

      if (userId) {
        query += ' AND user_id = ?';
        params.push(userId);
      }

      const [rows] = await connection.execute(query, params);
      return rows[0] || null;
    } finally {
      connection.release();
    }
  }

  /**
   * Get user tickets with filters
   */
  static async getUserTickets(userId, filters = {}) {
    const connection = await pool.getConnection();
    try {
      let query = 'SELECT * FROM support_tickets WHERE user_id = ?';
      const params = [userId];

      // Apply filters
      if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }

      if (filters.category) {
        query += ' AND category = ?';
        params.push(filters.category);
      }

      if (filters.priority) {
        query += ' AND priority = ?';
        params.push(filters.priority);
      }

      // Sorting
      query += ' ORDER BY created_at DESC';

      // Pagination
      const limit = parseInt(filters.limit) || 20;
      const offset = parseInt(filters.offset) || 0;
      query += ` LIMIT ${limit} OFFSET ${offset}`;

      const [rows] = await connection.execute(query, params);
      return rows;
    } finally {
      connection.release();
    }
  }

  /**
   * Get all tickets with advanced filters (Admin)
   */
  static async getAllTickets(filters = {}) {
    const connection = await pool.getConnection();
    try {
      let query = 'SELECT * FROM support_tickets WHERE 1=1';
      const params = [];

      // Status filter
      if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }

      // Category filter
      if (filters.category) {
        query += ' AND category = ?';
        params.push(filters.category);
      }

      // Priority filter
      if (filters.priority) {
        query += ' AND priority = ?';
        params.push(filters.priority);
      }

      // Assigned to filter
      if (filters.assignedTo) {
        query += ' AND assigned_to = ?';
        params.push(filters.assignedTo);
      }

      // Unassigned filter
      if (filters.unassigned === 'true') {
        query += ' AND assigned_to IS NULL';
      }

      // Date range filter
      if (filters.startDate) {
        query += ' AND created_at >= ?';
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ' AND created_at <= ?';
        params.push(filters.endDate);
      }

      // Search filter
      if (filters.search) {
        query += ' AND (subject LIKE ? OR description LIKE ? OR ticket_number LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      // Sorting
      const sortBy = filters.sortBy || 'created_at';
      const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';
      query += ` ORDER BY ${sortBy} ${sortOrder}`;

      // Pagination
      const limit = parseInt(filters.limit) || 50;
      const offset = parseInt(filters.offset) || 0;
      query += ` LIMIT ${limit} OFFSET ${offset}`;

      const [rows] = await connection.execute(query, params);
      return rows;
    } finally {
      connection.release();
    }
  }

  /**
   * Get ticket count with filters
   */
  static async getTicketCount(filters = {}, userId = null) {
    const connection = await pool.getConnection();
    try {
      let query = 'SELECT COUNT(*) as count FROM support_tickets WHERE 1=1';
      const params = [];

      if (userId) {
        query += ' AND user_id = ?';
        params.push(userId);
      }

      if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }

      if (filters.category) {
        query += ' AND category = ?';
        params.push(filters.category);
      }

      const [rows] = await connection.execute(query, params);
      return rows[0].count;
    } finally {
      connection.release();
    }
  }

  /**
   * Update ticket
   */
  static async update(ticketId, userId, updateData) {
    const connection = await pool.getConnection();
    try {
      const updates = [];
      const values = [];

      // Track changes for activity log
      const ticket = await this.findById(ticketId);

      if (updateData.status !== undefined && updateData.status !== ticket.status) {
        updates.push('status = ?');
        values.push(updateData.status);
        await this.logActivity(ticketId, userId, 'STATUS_CHANGED', ticket.status, updateData.status);
      }

      if (updateData.priority !== undefined && updateData.priority !== ticket.priority) {
        updates.push('priority = ?');
        values.push(updateData.priority);
        await this.logActivity(ticketId, userId, 'PRIORITY_CHANGED', ticket.priority, updateData.priority);
      }

      if (updateData.assigned_to !== undefined) {
        updates.push('assigned_to = ?, assigned_at = NOW()');
        values.push(updateData.assigned_to);
        await this.logActivity(ticketId, userId, 'ASSIGNED', ticket.assigned_to, updateData.assigned_to);
      }

      if (updates.length === 0) return false;

      values.push(ticketId);
      const query = `UPDATE support_tickets SET ${updates.join(', ')} WHERE id = ?`;
      const [result] = await connection.execute(query, values);

      // Invalidate cache
      await cache.delete(`ticket:${ticketId}`);

      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * Resolve ticket
   */
  static async resolve(ticketId, resolvedBy) {
    const connection = await pool.getConnection();
    try {
      const ticket = await this.findById(ticketId);
      const resolutionTime = Math.floor((Date.now() - new Date(ticket.created_at).getTime()) / 60000);

      const query = `
        UPDATE support_tickets 
        SET status = 'RESOLVED', 
            resolved_by = ?, 
            resolved_at = NOW(),
            resolution_time = ?
        WHERE id = ?
      `;

      await connection.execute(query, [resolvedBy, resolutionTime, ticketId]);

      await this.logActivity(ticketId, resolvedBy, 'RESOLVED', ticket.status, 'RESOLVED', 'Ticket resolved');

      await cache.delete(`ticket:${ticketId}`);
      return true;
    } finally {
      connection.release();
    }
  }

  /**
   * Close ticket
   */
  static async close(ticketId, closedBy) {
    const connection = await pool.getConnection();
    try {
      const ticket = await this.findById(ticketId);

      const query = `
        UPDATE support_tickets 
        SET status = 'CLOSED', closed_by = ?, closed_at = NOW() 
        WHERE id = ?
      `;

      await connection.execute(query, [closedBy, ticketId]);
      await this.logActivity(ticketId, closedBy, 'CLOSED', ticket.status, 'CLOSED', 'Ticket closed');
      await cache.delete(`ticket:${ticketId}`);
      return true;
    } finally {
      connection.release();
    }
  }

  /**
   * Reopen ticket
   */
  static async reopen(ticketId, userId) {
    const connection = await pool.getConnection();
    try {
      const ticket = await this.findById(ticketId);

      const query = `UPDATE support_tickets SET status = 'REOPENED' WHERE id = ?`;
      await connection.execute(query, [ticketId]);

      await this.logActivity(ticketId, userId, 'REOPENED', ticket.status, 'REOPENED', 'Ticket reopened');
      await cache.delete(`ticket:${ticketId}`);
      return true;
    } finally {
      connection.release();
    }
  }

  /**
   * Log ticket activity
   */
  static async logActivity(ticketId, userId, action, oldValue = null, newValue = null, description = null) {
    const connection = await pool.getConnection();
    try {
      const query = `
        INSERT INTO ticket_activity_log (ticket_id, user_id, action, old_value, new_value, description)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      await connection.execute(query, [ticketId, userId, action, oldValue, newValue, description]);
    } finally {
      connection.release();
    }
  }

  /**
   * Get ticket statistics
   */
  static async getStatistics(filters = {}) {
    const connection = await pool.getConnection();
    try {
      let dateFilter = '';
      const params = [];

      if (filters.startDate && filters.endDate) {
        dateFilter = 'WHERE created_at BETWEEN ? AND ?';
        params.push(filters.startDate, filters.endDate);
      }

      const query = `
        SELECT 
          COUNT(*) as total_tickets,
          SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) as open_tickets,
          SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as in_progress_tickets,
          SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) as resolved_tickets,
          SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END) as closed_tickets,
          SUM(CASE WHEN priority = 'URGENT' THEN 1 ELSE 0 END) as urgent_tickets,
          SUM(CASE WHEN priority = 'HIGH' THEN 1 ELSE 0 END) as high_priority_tickets,
          AVG(resolution_time) as avg_resolution_time,
          SUM(CASE WHEN assigned_to IS NULL THEN 1 ELSE 0 END) as unassigned_tickets
        FROM support_tickets
        ${dateFilter}
      `;

      const [rows] = await connection.execute(query, params);
      return rows[0];
    } finally {
      connection.release();
    }
  }
}

export default SupportTicket;