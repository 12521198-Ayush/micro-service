import mysql from 'mysql2/promise';
import env from './env.js';
import logger from './logger.js';

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  waitForConnections: true,
  connectionLimit: env.db.connectionLimit,
  queueLimit: 0,
  decimalNumbers: true,
  timezone: 'Z',
});

export const checkDatabaseHealth = async () => {
  const connection = await pool.getConnection();

  try {
    await connection.query('SELECT 1 AS ok');
    return true;
  } finally {
    connection.release();
  }
};

export const closeDatabasePool = async () => {
  try {
    await pool.end();
    logger.info('Database pool closed');
  } catch (error) {
    logger.error('Failed to close database pool', {
      message: error.message,
      stack: error.stack,
    });
  }
};

export default {
  pool,
  checkDatabaseHealth,
  closeDatabasePool,
};
