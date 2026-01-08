import pool from '../config/database.js';
import { cache } from '../config/redis.js';

const CACHE_TTL = 3600; // 1 hour

class OrganizationDetails {
  static async create(userId, organizationData) {
    const connection = await pool.getConnection();
    try {
      const {
        organizationName,
        physicalAddress,
        city,
        state,
        zipCode,
        country,
      } = organizationData;

      const query = `
        INSERT INTO organization_details 
        (user_id, organization_name, physical_address, city, state, zip_code, country)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const [result] = await connection.execute(query, [
        userId,
        organizationName || null,
        physicalAddress || null,
        city || null,
        state || null,
        zipCode || null,
        country || null,
      ]);

      // Invalidate cache
      await cache.delete(`org:${userId}:details`);

      return result.insertId;
    } finally {
      connection.release();
    }
  }

  static async findByUserId(userId) {
    // Check cache first
    const cacheKey = `org:${userId}:details`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log(`Cache hit: ${cacheKey}`);
      return cached;
    }

    const connection = await pool.getConnection();
    try {
      const query = 'SELECT * FROM organization_details WHERE user_id = ?';
      const [rows] = await connection.execute(query, [userId]);
      const org = rows[0] || null;
      
      // Cache the result
      if (org) {
        await cache.set(cacheKey, org, CACHE_TTL);
      }
      
      return org;
    } finally {
      connection.release();
    }
  }

  static async update(userId, organizationData) {
    const connection = await pool.getConnection();
    try {
      const {
        organizationName,
        physicalAddress,
        city,
        state,
        zipCode,
        country,
      } = organizationData;

      const query = `
        UPDATE organization_details 
        SET organization_name = ?, 
            physical_address = ?, 
            city = ?, 
            state = ?, 
            zip_code = ?, 
            country = ?
        WHERE user_id = ?
      `;

      const [result] = await connection.execute(query, [
        organizationName || null,
        physicalAddress || null,
        city || null,
        state || null,
        zipCode || null,
        country || null,
        userId,
      ]);

      // Invalidate cache
      if (result.affectedRows > 0) {
        await cache.delete(`org:${userId}:details`);
      }

      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  static async delete(userId) {
    const connection = await pool.getConnection();
    try {
      const query = 'DELETE FROM organization_details WHERE user_id = ?';
      const [result] = await connection.execute(query, [userId]);
      
      // Invalidate cache
      if (result.affectedRows > 0) {
        await cache.delete(`org:${userId}:details`);
      }
      
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }
}

export default OrganizationDetails;
