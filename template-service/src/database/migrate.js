import mysql from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import env from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, 'migrations');

const ensureMigrationsTable = async (connection) => {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

const getAppliedMigrationSet = async (connection) => {
  const [rows] = await connection.query('SELECT filename FROM schema_migrations');
  return new Set(rows.map((row) => row.filename));
};

const getMigrationFiles = () => {
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  return fs
    .readdirSync(migrationsDir)
    .filter((file) => file.toLowerCase().endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));
};

const applyMigration = async (connection, filename) => {
  const filePath = path.join(migrationsDir, filename);
  const sql = fs.readFileSync(filePath, 'utf8');

  await connection.query(sql);
  await connection.execute(
    'INSERT INTO schema_migrations (filename) VALUES (?)',
    [filename]
  );
};

const runMigration = async () => {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      multipleStatements: true,
    });

    console.log('Connected to MySQL');

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${env.db.name}\``);
    await connection.query(`USE \`${env.db.name}\``);

    await ensureMigrationsTable(connection);

    const appliedMigrations = await getAppliedMigrationSet(connection);
    const migrationFiles = getMigrationFiles();

    for (const migrationFile of migrationFiles) {
      if (appliedMigrations.has(migrationFile)) {
        continue;
      }

      console.log(`Applying migration: ${migrationFile}`);
      await applyMigration(connection, migrationFile);
      console.log(`Applied migration: ${migrationFile}`);
    }

    console.log(`Migration completed for database '${env.db.name}'`);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

runMigration();
