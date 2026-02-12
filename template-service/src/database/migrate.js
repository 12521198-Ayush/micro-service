import mysql from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import env from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const doesIndexExist = async (connection, indexName) => {
  const [rows] = await connection.query(
    `
      SELECT COUNT(*) AS count
      FROM information_schema.statistics
      WHERE table_schema = ?
        AND table_name = 'whatsapp_templates'
        AND index_name = ?
    `,
    [env.db.name, indexName]
  );

  return Number(rows[0]?.count || 0) > 0;
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

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    await connection.query(schemaSql);
    await connection.query(
      'ALTER TABLE whatsapp_templates MODIFY COLUMN quality_score LONGTEXT NULL'
    );

    if (await doesIndexExist(connection, 'uk_meta_template_id')) {
      await connection.query(
        'ALTER TABLE whatsapp_templates DROP INDEX uk_meta_template_id'
      );
    }

    if (!(await doesIndexExist(connection, 'uk_user_meta_template_id'))) {
      await connection.query(
        'ALTER TABLE whatsapp_templates ADD UNIQUE KEY uk_user_meta_template_id (user_id, meta_template_id)'
      );
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
