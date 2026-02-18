/**
 * MySQL Database Pool Wrapper for Kafka Service
 * Provides a pg-compatible interface over mysql2 so existing
 * query call-sites need minimal changes.
 */
const mysql = require('mysql2/promise');

class MySQLPool {
  constructor(config) {
    this.pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      connectionLimit: config.connectionLimit || config.max || 20,
      waitForConnections: true,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000
    });
  }

  /**
   * Convert PostgreSQL $N placeholders to MySQL ? placeholders.
   * Handles param reuse (e.g. $1 referenced multiple times).
   * If the query already uses ? placeholders, passes through unchanged.
   */
  _convertQuery(sql, params) {
    if (!params || params.length === 0) return { sql, params: params || [] };

    const mysqlParams = [];
    const mysqlSql = sql.replace(/\$(\d+)/g, (_match, num) => {
      mysqlParams.push(params[parseInt(num) - 1]);
      return '?';
    });

    // No $N patterns found → query already uses ? placeholders
    if (mysqlParams.length === 0) {
      return { sql, params };
    }

    return { sql: mysqlSql, params: mysqlParams };
  }

  /**
   * Run a query against the pool (no transaction).
   * Returns { rows, rowCount } to match pg interface.
   */
  async query(sql, params) {
    const converted = this._convertQuery(sql, params);
    const [rows] = await this.pool.query(converted.sql, converted.params);
    return {
      rows,
      rowCount: Array.isArray(rows) ? rows.length : rows.affectedRows
    };
  }

  /**
   * Get a connection from the pool (for transactions).
   * Returns a client object with query() and release() that
   * mirrors the pg client interface.
   */
  async connect() {
    const conn = await this.pool.getConnection();
    const self = this;

    return {
      query: async (sql, params) => {
        const trimmed = sql.trim().toUpperCase();

        if (trimmed === 'BEGIN') {
          await conn.beginTransaction();
          return { rows: [] };
        }
        if (trimmed === 'COMMIT') {
          await conn.commit();
          return { rows: [] };
        }
        if (trimmed === 'ROLLBACK') {
          await conn.rollback();
          return { rows: [] };
        }

        const converted = self._convertQuery(sql, params);
        const [rows] = await conn.query(converted.sql, converted.params);
        return {
          rows,
          rowCount: Array.isArray(rows) ? rows.length : rows.affectedRows
        };
      },
      release: () => conn.release()
    };
  }

  /**
   * Close all connections in the pool.
   */
  async end() {
    await this.pool.end();
  }
}

module.exports = { MySQLPool };
