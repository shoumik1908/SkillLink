import bcrypt from 'bcryptjs';
import { pool } from '../src/db.js';

async function main() {
  const email = 'shoumik.2427030625@muj.manipal.edu';
  const password = 'shoumik@123';
  const name = 'Shoumik Kumar';

  const hash = await bcrypt.hash(password, 12);
  const client = await pool.connect();
  try {
    const res = await client.query(
      `INSERT INTO users (name, email, password_hash, role, email_verified, is_active)
       VALUES ($1, $2, $3, 'admin', true, true)
       ON CONFLICT (email)
       DO UPDATE SET
         name = EXCLUDED.name,
         password_hash = EXCLUDED.password_hash,
         role = 'admin',
         email_verified = true,
         is_active = true,
         deleted_at = NULL,
         updated_at = NOW()
       RETURNING id, name, email, role, email_verified, is_active`,
      [name, email, hash]
    );
    console.log('Successfully upserted user:', res.rows[0]);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
