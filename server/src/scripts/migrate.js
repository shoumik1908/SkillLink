import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const migrationsDir = path.resolve(__dirname, '../../migrations');
  console.log(`🔍 Checking migrations directory: ${migrationsDir}`);

  if (!fs.existsSync(migrationsDir)) {
    console.error(`❌ Migrations directory does not exist: ${migrationsDir}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('ℹ️ No migration files found.');
    await pool.end();
    return;
  }

  const client = await pool.connect();
  try {
    // Create migrations tracker table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    for (const file of files) {
      const checkRes = await client.query('SELECT name FROM _migrations WHERE name = $1', [file]);
      if (checkRes.rowCount > 0) {
        console.log(`⏩ Skipping already applied migration: ${file}`);
        continue;
      }

      console.log(`🚀 Executing migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`✅ Migration applied successfully: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ Migration failed in ${file}:`, err);
        throw err;
      }
    }

    console.log('🎉 All migrations completed successfully.');
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch(err => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
