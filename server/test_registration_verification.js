import { query } from './src/db.js';

const BASE_URL = 'http://localhost:5000/api/auth';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

let ipSubnet = 10;
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const clientIp = options.ip || `172.16.${ipSubnet}.${Math.floor(Math.random() * 250) + 1}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-Forwarded-For': clientIp,
    ...(options.headers || {}),
  };
  const res = await fetch(url, {
    ...options,
    headers,
    redirect: 'manual', // Do not auto-follow redirects so we can inspect Location headers
  });

  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => null);
  }

  const cookieHeader = res.headers.get('set-cookie');
  const location = res.headers.get('location');

  return { status: res.status, data, headers: res.headers, location, cookieHeader };
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING SKILLLINK AUTH & REGISTRATION TEST SUITE');
  console.log('======================================================\n');

  const testEmail = `student_${Date.now()}@muj.manipal.edu`;
  const validPassword = 'SecureStudentPass123!';

  // Clean up any test users from prior runs
  await query("DELETE FROM users WHERE email LIKE '%@muj.manipal.edu' AND email LIKE 'student_%'");

  // --------------------------------------------------------------------------
  console.log('1. DOMAIN RESTRICTION & VALIDATION TESTS');
  // --------------------------------------------------------------------------
  {
    // 1a. user@gmail.com
    const resGmail = await request('/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Gmail User',
        email: 'user@gmail.com',
        password: validPassword,
        confirmPassword: validPassword,
      }),
    });
    assert(resGmail.status === 400, 'Registration with user@gmail.com is rejected (400)');
    assert(
      resGmail.data?.message?.includes('@muj.manipal.edu'),
      'Rejection message explicitly specifies @muj.manipal.edu domain'
    );

    // 1b. Lookalike domain: x@muj.manipal.edu.evil.com
    const resLookalike = await request('/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Evil User',
        email: 'x@muj.manipal.edu.evil.com',
        password: validPassword,
        confirmPassword: validPassword,
      }),
    });
    assert(resLookalike.status === 400, 'Registration with x@muj.manipal.edu.evil.com is rejected (400)');

    // 1c. Subdomain: x@sub.muj.manipal.edu
    const resSub = await request('/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Subdomain User',
        email: 'x@sub.muj.manipal.edu',
        password: validPassword,
        confirmPassword: validPassword,
      }),
    });
    assert(resSub.status === 400, 'Registration with x@sub.muj.manipal.edu subdomain is rejected (400)');
  }

  // --------------------------------------------------------------------------
  console.log('\n2. PASSWORD SECURITY & HONEYPOT TESTS');
  // --------------------------------------------------------------------------
  {
    // 2a. Password equal to name
    const resPassName = await request('/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'AlexTaylor',
        email: `alextaylor_${Date.now()}@muj.manipal.edu`,
        password: 'AlexTaylor',
        confirmPassword: 'AlexTaylor',
      }),
    });
    assert(resPassName.status === 400, 'Password equal to name is rejected (400)');

    // 2b. Password in common dictionary
    const resCommon = await request('/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Student Common',
        email: `student_common_${Date.now()}@muj.manipal.edu`,
        password: 'password123',
        confirmPassword: 'password123',
      }),
    });
    assert(resCommon.status === 400, 'Common password (password123) is rejected (400)');

    // 2c. Honeypot filled
    const resBot = await request('/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Spam Bot',
        email: `bot_${Date.now()}@muj.manipal.edu`,
        password: validPassword,
        confirmPassword: validPassword,
        hp: 'http://spamsite.ru',
      }),
    });
    assert(resBot.status === 400, 'Honeypot-filled submission is rejected (400)');
  }

  // --------------------------------------------------------------------------
  console.log('\n3. VALID REGISTRATION & ROLE ENFORCEMENT');
  // --------------------------------------------------------------------------
  {
    // Attempt privilege escalation by passing role: 'admin' and email_verified: true
    const resValid = await request('/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Aarav Student',
        email: testEmail,
        password: validPassword,
        confirmPassword: validPassword,
        role: 'admin', // Attack vector
        email_verified: true, // Attack vector
        is_active: true,
      }),
    });

    assert(resValid.status === 201, 'Valid MUJ registration returns 201');
    assert(
      resValid.data?.message?.includes('verification link has been sent'),
      'Registration response gives verification notice without exposing private fields'
    );

    // Verify DB state
    const dbUserRes = await query(
      'SELECT id, role, email_verified, is_active FROM users WHERE email = $1',
      [testEmail]
    );
    assert(dbUserRes.rowCount === 1, 'User record created in database');
    const dbUser = dbUserRes.rows[0];
    assert(dbUser?.role === 'user', "Public registration enforced role: 'user' (ignored role: 'admin')");
    assert(dbUser?.email_verified === false, 'New user has email_verified = false');

    // Attempt login while unverified
    const resUnverifiedLogin = await request('/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: validPassword,
      }),
    });
    assert(resUnverifiedLogin.status === 403, 'Login before email verification is rejected (403)');
    assert(
      resUnverifiedLogin.data?.needsVerification === true,
      'Login response indicates email verification is required'
    );
  }

  // --------------------------------------------------------------------------
  console.log('\n4. USER ENUMERATION & DUPLICATE EMAIL PROTECTION');
  // --------------------------------------------------------------------------
  {
    // Re-registering existing email gives IDENTICAL success message
    const resDup = await request('/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Aarav Duplicate',
        email: testEmail,
        password: validPassword,
        confirmPassword: validPassword,
      }),
    });

    assert(
      resDup.data?.message === 'If this email is eligible, a verification link has been sent. Please check your inbox.',
      'Duplicate email registration returns exact same generic response as new signup'
    );

    // Login with wrong password vs unknown email
    const resWrongPass = await request('/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword999!',
      }),
    });

    const resUnknownEmail = await request('/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'totallyunknown@muj.manipal.edu',
        password: 'SomePassword123!',
      }),
    });

    assert(resWrongPass.status === 401, 'Wrong password gives 401');
    assert(resUnknownEmail.status === 401, 'Unknown email gives 401');
    assert(
      resWrongPass.data?.message === resUnknownEmail.data?.message &&
      resWrongPass.data?.message === 'Invalid credentials',
      'Wrong password and unknown email return identical "Invalid credentials" error message'
    );
  }

  // --------------------------------------------------------------------------
  console.log('\n5. EMAIL VERIFICATION WORKFLOW & SINGLE-USE');
  // --------------------------------------------------------------------------
  let userRecord;
  let activeToken;
  {
    // Retrieve token for test user from DB
    const userRes = await query('SELECT id FROM users WHERE email = $1', [testEmail]);
    userRecord = userRes.rows[0];

    // Find the latest verification token hash
    const verifRes = await query(
      'SELECT id, token_hash, expires_at FROM email_verifications WHERE user_id = $1 AND used_at IS NULL ORDER BY created_at DESC LIMIT 1',
      [userRecord.id]
    );
    assert(verifRes.rowCount === 1, 'Verification token hash found in email_verifications table');

    // Create a known raw token for deterministic testing
    const crypto = await import('crypto');
    activeToken = 'test_token_' + crypto.randomBytes(16).toString('hex');
    const knownHash = crypto.createHash('sha256').update(activeToken).digest('hex');

    await query(
      `INSERT INTO email_verifications (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '24 hours')`,
      [userRecord.id, knownHash]
    );

    // Call GET /api/auth/verify-email?token=activeToken
    const resVerify = await request(`/verify-email?token=${activeToken}`);
    assert(resVerify.status === 302, 'Verification endpoint responds with redirect (302)');
    assert(
      resVerify.location?.includes('/login?verified=1'),
      'Redirects to /login?verified=1 upon successful verification'
    );

    // Check DB user status
    const verifiedUserRes = await query('SELECT email_verified FROM users WHERE id = $1', [userRecord.id]);
    assert(verifiedUserRes.rows[0].email_verified === true, 'User email_verified is now true in DB');

    // Reusing the token must fail
    const resReuse = await request(`/verify-email?token=${activeToken}`);
    assert(resReuse.status === 302, 'Reusing token returns redirect');
    assert(
      resReuse.location?.includes('error='),
      'Reusing token redirects to error state (token already used)'
    );

    // Now login succeeds!
    const resLoginAfter = await request('/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: validPassword,
      }),
    });
    assert(resLoginAfter.status === 200, 'Login succeeds after email verification (200)');
    assert(!!resLoginAfter.cookieHeader, 'JWT token cookie is set');
  }

  // --------------------------------------------------------------------------
  console.log('\n6. PASSWORD RESET & SESSION REVOCATION (token_version)');
  // --------------------------------------------------------------------------
  {
    // Step a: Login and obtain cookie
    const loginRes = await request('/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: validPassword,
      }),
    });
    const sessionCookie = loginRes.cookieHeader?.split(';')[0];
    assert(!!sessionCookie, 'Obtained active session cookie');

    // Step b: Verify /api/auth/me works with this cookie
    const meResBefore = await request('/me', {
      method: 'GET',
      headers: { Cookie: sessionCookie },
    });
    assert(meResBefore.status === 200, 'Session cookie successfully authenticates on /api/auth/me');

    // Step c: Request password reset
    const forgotRes = await request('/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: testEmail }),
    });
    assert(forgotRes.status === 200, 'Forgot password returns 200 generic response');

    // Create a known reset token in password_resets for testing
    const crypto = await import('crypto');
    const resetRawToken = 'reset_tok_' + crypto.randomBytes(16).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetRawToken).digest('hex');

    await query(
      `INSERT INTO password_resets (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 minutes')`,
      [userRecord.id, resetTokenHash]
    );

    const newPassword = 'NewSecretPassword999!';

    // Step d: Execute password reset
    const resetRes = await request('/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: resetRawToken,
        newPassword,
        confirmPassword: newPassword,
      }),
    });
    assert(resetRes.status === 200, 'Password reset succeeds (200)');

    // Step e: Reusing the same reset token must be rejected
    const resetReuseRes = await request('/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: resetRawToken,
        newPassword: 'AnotherPassword123!',
        confirmPassword: 'AnotherPassword123!',
      }),
    });
    assert(resetReuseRes.status === 400, 'Reusing password reset token is rejected (400)');

    // Step f: OLD SESSION MUST BE INVALIDATED via token_version check in authenticate
    const meResAfter = await request('/me', {
      method: 'GET',
      headers: { Cookie: sessionCookie },
    });
    assert(
      meResAfter.status === 401,
      'Old session cookie is invalidated after password reset (token_version bump causes 401)'
    );

    // Step g: Old password no longer works
    const oldPassLogin = await request('/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: validPassword,
      }),
    });
    assert(oldPassLogin.status === 401, 'Old password fails to login');

    // Step h: New password logs in successfully
    const newPassLogin = await request('/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: newPassword,
      }),
    });
    assert(newPassLogin.status === 200, 'New password successfully logs in');
  }

  // --------------------------------------------------------------------------
  console.log('\n7. SEEDED ACCOUNTS PRESERVATION');
  // --------------------------------------------------------------------------
  {
    // Admin login
    const adminLogin = await request('/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@uni.edu',
        password: 'AdminPassword123!',
      }),
    });
    assert(adminLogin.status === 200, 'Seeded admin (admin@uni.edu) can still log in');
    assert(adminLogin.data?.user?.role === 'admin', 'Seeded admin retains role: admin');

    // Student login
    const studentLogin = await request('/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'student@uni.edu',
        password: 'Student123!',
      }),
    });
    assert(studentLogin.status === 200, 'Seeded student (student@uni.edu) can still log in');
    assert(studentLogin.data?.user?.role === 'user', 'Seeded student retains role: user');
  }

  // --------------------------------------------------------------------------
  console.log('\n8. ABUSE PROTECTION: ACCOUNT LOCKOUT & RATE LIMITING');
  // --------------------------------------------------------------------------
  {
    // 8a. Repeated login failure lockout (email-based)
    const attackEmail = `lockout_test_${Date.now()}@muj.manipal.edu`;

    const bcrypt = (await import('bcryptjs')).default;
    const dummyHash = await bcrypt.hash('InitialPass123!', 12);
    await query(
      `INSERT INTO users (name, email, password_hash, role, email_verified, is_active)
       VALUES ('Lockout Target', $1, $2, 'user', true, true)`,
      [attackEmail, dummyHash]
    );

    for (let i = 1; i <= 5; i++) {
      await request('/login', {
        method: 'POST',
        body: JSON.stringify({ email: attackEmail, password: 'WrongPassword!' }),
      });
    }

    const lockRes = await request('/login', {
      method: 'POST',
      body: JSON.stringify({ email: attackEmail, password: 'InitialPass123!' }),
    });
    assert(lockRes.status === 429, 'Account locked after 5 failed attempts (returns 429)');
    assert(
      lockRes.data?.message?.includes('temporarily locked'),
      'Lockout error informs user of 15-minute temporary lockout'
    );

    // 8b. Registration Rate Limiting (IP-based, max 5 per hour)
    const spammerIp = '198.51.100.99';
    let spammerBlocked = false;

    for (let i = 1; i <= 6; i++) {
      const resSpam = await request('/register', {
        method: 'POST',
        ip: spammerIp,
        body: JSON.stringify({
          name: `Spammer ${i}`,
          email: `spam_${i}_${Date.now()}@muj.manipal.edu`,
          password: validPassword,
          confirmPassword: validPassword,
        }),
      });

      if (resSpam.status === 429) {
        spammerBlocked = true;
        break;
      }
    }

    assert(spammerBlocked, 'IP-based rate limiter triggered on repeated registration attempts (429)');
  }

  // --------------------------------------------------------------------------
  console.log('\n======================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  // Clean up
  await query("DELETE FROM users WHERE email LIKE '%@muj.manipal.edu' AND email LIKE 'student_%'");
  await query("DELETE FROM users WHERE email LIKE 'lockout_test_%'");
  await query("DELETE FROM users WHERE email LIKE 'spam_%'");

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Test suite encountered an uncaught error:', err);
  process.exit(1);
});
