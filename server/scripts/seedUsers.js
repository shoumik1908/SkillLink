import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { pool } from '../src/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load server/.env regardless of current working directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function seedUsers() {
  // 1. Production safety guard: Refuse to run when NODE_ENV is production
  if (process.env.NODE_ENV === 'production') {
    console.error('⛔ REFUSAL: seedUsers script cannot be executed when NODE_ENV=production.');
    process.exit(1);
  }

  // 2. Read environment variables from server/.env
  const adminName = process.env.ADMIN_NAME;
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  const studentName = process.env.STUDENT_NAME;
  const studentEmail = process.env.STUDENT_EMAIL;
  const studentPassword = process.env.STUDENT_PASSWORD;

  // 3. Validate presence of all credentials (no hardcoding in source)
  const required = [
    { key: 'ADMIN_NAME', val: adminName },
    { key: 'ADMIN_EMAIL', val: adminEmail },
    { key: 'ADMIN_PASSWORD', val: adminPassword },
    { key: 'STUDENT_NAME', val: studentName },
    { key: 'STUDENT_EMAIL', val: studentEmail },
    { key: 'STUDENT_PASSWORD', val: studentPassword },
  ];

  const missing = required.filter(item => !item.val || !item.val.trim()).map(item => item.key);
  if (missing.length > 0) {
    console.error(`❌ Missing required credentials in server/.env: ${missing.join(', ')}`);
    console.error('Please configure all ADMIN_* and STUDENT_* keys in server/.env before running.');
    process.exit(1);
  }

  console.log('🌱 Starting SkillLink users seeding...');
  const client = await pool.connect();

  try {
    const BCRYPT_COST = 12;

    // 4. Hash passwords with bcryptjs cost 12
    console.log(`🔒 Hashing admin password with bcryptjs (cost: ${BCRYPT_COST})...`);
    const adminHash = await bcrypt.hash(adminPassword.trim(), BCRYPT_COST);

    console.log(`🔒 Hashing student password with bcryptjs (cost: ${BCRYPT_COST})...`);
    const studentHash = await bcrypt.hash(studentPassword.trim(), BCRYPT_COST);

    const upsertQuery = `
      INSERT INTO users (name, email, password_hash, role, email_verified, is_active)
      VALUES ($1, $2, $3, $4, true, true)
      ON CONFLICT (email)
      DO UPDATE SET
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        email_verified = true,
        is_active = true,
        deleted_at = NULL,
        updated_at = NOW()
      RETURNING id, name, email, role, email_verified as "emailVerified", is_active as "isActive", updated_at as "updatedAt"
    `;

    // 5. Upsert Admin User (role: 'admin')
    const adminRes = await client.query(upsertQuery, [
      adminName.trim(),
      adminEmail.trim().toLowerCase(),
      adminHash,
      'admin',
    ]);
    const adminUser = adminRes.rows[0];
    console.log(`👑 Upserted Admin: [${adminUser.id}] ${adminUser.name} <${adminUser.email}> (role: ${adminUser.role})`);

    // 6. Upsert Student User (role: 'user')
    const studentRes = await client.query(upsertQuery, [
      studentName.trim(),
      studentEmail.trim().toLowerCase(),
      studentHash,
      'user',
    ]);
    const studentUser = studentRes.rows[0];
    console.log(`🎓 Upserted Student: [${studentUser.id}] ${studentUser.name} <${studentUser.email}> (role: ${studentUser.role})`);

    console.log('✅ Users successfully seeded and verified in database.');
  } catch (err) {
    console.error('❌ Database error during seedUsers:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedUsers();
