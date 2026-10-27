import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { pool } from '../db.js';

dotenv.config();

async function seed() {
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@uni.edu').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPassword123!';

  console.log(`🌱 Seeding initial accounts...`);

  const client = await pool.connect();
  try {
    // 1. Seed Admin Account
    console.log(`👤 Seeding admin account: ${adminEmail}...`);
    const adminHash = await bcrypt.hash(adminPassword, 12);
    const existingAdmin = await client.query('SELECT id FROM users WHERE email = $1', [adminEmail]);

    if (existingAdmin.rowCount > 0) {
      await client.query(
        `UPDATE users
         SET password_hash = $1, role = 'admin', is_active = true, email_verified = true, updated_at = NOW()
         WHERE email = $2`,
        [adminHash, adminEmail]
      );
      console.log('✅ Admin user updated successfully.');
    } else {
      await client.query(
        `INSERT INTO users (name, email, password_hash, role, email_verified, is_active)
         VALUES ($1, $2, $3, 'admin', true, true)`,
        ['System Admin', adminEmail, adminHash]
      );
      console.log('✅ Admin user created successfully.');
    }

    // 2. Seed Student Demo Account
    const studentEmail = 'student@uni.edu';
    const studentPassword = 'Student123!';
    console.log(`🎓 Seeding student demo account: ${studentEmail}...`);
    const studentHash = await bcrypt.hash(studentPassword, 12);
    const existingStudent = await client.query('SELECT id FROM users WHERE email = $1', [studentEmail]);

    if (existingStudent.rowCount > 0) {
      await client.query(
        `UPDATE users
         SET password_hash = $1, role = 'user', is_active = true, email_verified = true, updated_at = NOW()
         WHERE email = $2`,
        [studentHash, studentEmail]
      );
      console.log('✅ Student demo user updated successfully.');
    } else {
      await client.query(
        `INSERT INTO users (name, email, password_hash, role, email_verified, is_active)
         VALUES ($1, $2, $3, 'user', true, true)`,
        ['Alex Student', studentEmail, studentHash]
      );
      console.log('✅ Student demo user created successfully.');
    }

    console.log('🎉 Seeding completed successfully.');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
