import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { query } from '../db.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/mailer.js';
import {
  checkLoginLockout,
  recordFailedLogin,
  recordSuccessfulLogin,
  checkResendEmailLimit,
} from '../middleware/rateLimiter.js';

// Common passwords blacklist
const COMMON_PASSWORDS = new Set([
  'password',
  'password123',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty123',
  'admin123',
  'welcome123',
  'password1',
  'letmein123',
  'manipal123',
  'muj12345',
  'skilllink123',
  'iloveyou123',
]);

/**
 * Returns dynamic RegExp for allowed university email domain
 * Default: muj.manipal.edu
 * Exactly matches: ^[a-z0-9._%+-]+@muj\.manipal\.edu$ (rejects subdomains, lookalikes, etc.)
 */
export function getEmailDomainRegex() {
  const domain = (process.env.ALLOWED_EMAIL_DOMAIN || 'muj.manipal.edu').trim().toLowerCase();
  const escapedDomain = domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^[a-z0-9._%+-]+@${escapedDomain}$`, 'i');
}

/**
 * Validates password strength & common blacklist
 */
function validatePasswordStrength(password, name = '', email = '') {
  if (password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (password.length > 72) {
    return 'Password cannot exceed 72 characters.';
  }
  if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(password)) {
    return 'Password must contain at least one letter and one number.';
  }

  const lowerPass = password.toLowerCase();
  if (name && lowerPass === name.trim().toLowerCase()) {
    return 'Password cannot be your name.';
  }
  if (email && lowerPass === email.trim().toLowerCase()) {
    return 'Password cannot be your email address.';
  }
  if (COMMON_PASSWORDS.has(lowerPass)) {
    return 'This password is too common and easily guessed. Please choose a stronger password.';
  }

  return null;
}

const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(60, 'Name cannot exceed 60 characters'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Invalid email format'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password cannot exceed 72 characters'),
  confirmPassword: z
    .string({ required_error: 'Confirm password is required' }),
  // Honeypot fields to trap bots
  hp: z.string().optional(),
  _hp: z.string().optional(),
  website: z.string().optional(),
  honeypot: z.string().optional(),
});

const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Invalid email format'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password cannot be empty'),
});

const resetPasswordSchema = z.object({
  token: z.string({ required_error: 'Token is required' }).min(1, 'Token is required'),
  newPassword: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password cannot exceed 72 characters'),
  confirmPassword: z
    .string({ required_error: 'Confirm password is required' }),
});

const COOKIE_NAME = 'token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

export function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: process.env.COOKIE_SAME_SITE || 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  };
}

function generateToken(userId, role, tokenVersion = 0) {
  return jwt.sign({ userId, role, tokenVersion }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

/**
 * POST /api/auth/register
 */
export async function register(req, res, next) {
  try {
    // 1. Honeypot check: reject bots immediately if any honeypot field is filled
    if (req.body.hp || req.body._hp || req.body.website || req.body.honeypot) {
      console.warn('🤖 [SECURITY] Bot registration rejected via honeypot.');
      return res.status(400).json({ message: 'Invalid registration request' });
    }

    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: parseResult.error.errors[0]?.message || 'Validation failed',
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const { name, email: rawEmail, password, confirmPassword } = parseResult.data;
    const email = rawEmail.toLowerCase().trim();

    // 2. Validate passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({
        message: 'Passwords do not match.',
      });
    }

    // 3. Strict campus domain restriction
    const domainRegex = getEmailDomainRegex();
    if (!domainRegex.test(email)) {
      const allowedDomain = (process.env.ALLOWED_EMAIL_DOMAIN || 'muj.manipal.edu').trim();
      return res.status(400).json({
        message: `Registration requires an official email ending in @${allowedDomain}`,
      });
    }

    // 4. Validate password strength, name/email equality, and common dictionary blacklist
    const passwordError = validatePasswordStrength(password, name, email);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    // 5. Daily sign-up cap check to prevent spam waves
    const maxDaily = parseInt(process.env.MAX_DAILY_SIGNUPS || '500', 10);
    const countRes = await query(
      'SELECT COUNT(*) as count FROM users WHERE created_at >= CURRENT_DATE'
    );
    if (parseInt(countRes.rows[0]?.count || '0', 10) >= maxDaily) {
      return res.status(429).json({
        message: 'Daily registration limit reached. Please try again tomorrow.',
      });
    }

    const successMessage = 'Account created successfully! Please sign in with your credentials.';

    // 6. Check if email already exists
    const existing = await query(
      'SELECT id, name, email FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (existing.rowCount > 0) {
      return res.status(200).json({
        message: successMessage,
        email,
      });
    }

    // 7. Hash password with bcrypt cost 12
    const passwordHash = await bcrypt.hash(password, 12);

    // 8. Role is strictly 'user'. email_verified is true for immediate access
    const insertResult = await query(
      `INSERT INTO users (name, email, password_hash, role, email_verified, is_active, token_version, skills, college, year_of_study, bio)
       VALUES ($1, $2, $3, 'user', true, true, 0, '{}'::text[], 'Manipal University Jaipur', 1, '')
       RETURNING id, name, email`,
      [name, email, passwordHash]
    );

    const newUser = insertResult.rows[0];

    return res.status(201).json({
      message: successMessage,
      email: newUser.email,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/verify-email?token=...
 */
export async function verifyEmail(req, res, next) {
  try {
    const rawToken = req.query.token;
    const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

    if (!rawToken || typeof rawToken !== 'string') {
      return res.redirect(`${clientOrigin}/login?error=missing_token`);
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const verifRes = await query(
      `SELECT ev.id, ev.user_id, ev.expires_at, ev.used_at, u.email
       FROM email_verifications ev
       JOIN users u ON ev.user_id = u.id
       WHERE ev.token_hash = $1`,
      [tokenHash]
    );

    if (verifRes.rowCount === 0) {
      return res.redirect(`${clientOrigin}/login?error=invalid_token`);
    }

    const verification = verifRes.rows[0];

    if (verification.used_at) {
      return res.redirect(`${clientOrigin}/login?error=token_already_used`);
    }

    if (new Date(verification.expires_at) < new Date()) {
      return res.redirect(`${clientOrigin}/login?error=token_expired&email=${encodeURIComponent(verification.email)}`);
    }

    // Mark user verified and token as used
    await query('BEGIN');
    try {
      await query(
        'UPDATE users SET email_verified = true, updated_at = NOW() WHERE id = $1',
        [verification.user_id]
      );
      await query(
        'UPDATE email_verifications SET used_at = NOW() WHERE id = $1',
        [verification.id]
      );
      await query('COMMIT');
    } catch (e) {
      await query('ROLLBACK');
      throw e;
    }

    return res.redirect(`${clientOrigin}/login?verified=1`);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/resend-verification
 */
export async function resendVerification(req, res, next) {
  try {
    const { email: rawEmail } = req.body;
    if (!rawEmail || typeof rawEmail !== 'string') {
      return res.status(400).json({ message: 'Email is required' });
    }

    const email = rawEmail.toLowerCase().trim();

    // Check rate limit per email (max 3/hr)
    const emailLimit = checkResendEmailLimit(email);
    if (!emailLimit.allowed) {
      return res.status(429).json({ message: emailLimit.message });
    }

    const genericSuccess = {
      message: 'If an unverified account exists for this email, a new verification link has been sent.',
    };

    const userRes = await query(
      'SELECT id, name, email, email_verified, is_active, deleted_at FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (userRes.rowCount === 0) {
      return res.status(200).json(genericSuccess);
    }

    const user = userRes.rows[0];

    // Only send if account is unverified, active, and not deleted
    if (!user.email_verified && user.is_active && !user.deleted_at) {
      // Invalidate existing unused tokens
      await query(
        'UPDATE email_verifications SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
        [user.id]
      );

      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await query(
        `INSERT INTO email_verifications (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '24 hours')`,
        [user.id, tokenHash]
      );

      await sendVerificationEmail({
        to: user.email,
        name: user.name,
        token: rawToken,
      });
    }

    return res.status(200).json(genericSuccess);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 */
export async function login(req, res, next) {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: parseResult.error.errors[0]?.message || 'Validation failed',
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const { email: rawEmail, password } = parseResult.data;
    const email = rawEmail.toLowerCase().trim();

    // 1. Check account lockout for repeated failed logins (15 min after 5 failures)
    const lockout = checkLoginLockout(email);
    if (lockout.isLocked) {
      return res.status(429).json({ message: lockout.message });
    }

    // Generic error message for both unknown email, wrong password, or soft-deleted account
    const genericAuthError = 'Invalid credentials';

    // 2. Query user by email
    const userRes = await query(
      `SELECT id, name, email, password_hash, role, is_active, deleted_at, email_verified, token_version
       FROM users
       WHERE LOWER(email) = LOWER($1)`,
      [email]
    );

    if (userRes.rowCount === 0 || userRes.rows[0].deleted_at) {
      recordFailedLogin(email);
      console.warn(`⚠️ [AUTH FAILED] Failed login attempt for non-existent or deleted account: ${email}`);
      return res.status(401).json({ message: genericAuthError });
    }

    const user = userRes.rows[0];

    // 3. Compare bcrypt hash
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      recordFailedLogin(email);
      console.warn(`⚠️ [AUTH FAILED] Invalid password attempt for user: ${email}`);
      return res.status(401).json({ message: genericAuthError });
    }

    // Password matches -> reset failed attempts
    recordSuccessfulLogin(email);

    // 4. Reject inactive accounts
    if (!user.is_active) {
      return res.status(403).json({
        message: 'Account has been deactivated or suspended. Please contact administration.',
      });
    }

    // 5. Require email verification
    if (!user.email_verified) {
      return res.status(403).json({
        message: 'Please verify your email address before logging in.',
        needsVerification: true,
        email: user.email,
      });
    }

    // 6. Generate JWT containing userId, role, and tokenVersion
    const token = generateToken(user.id, user.role, user.token_version || 0);

    // Send in httpOnly cookie
    res.cookie(COOKIE_NAME, token, getCookieOptions());

    return res.status(200).json({
      message: 'Logged in successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/forgot-password
 */
export async function forgotPassword(req, res, next) {
  try {
    const { email: rawEmail } = req.body;
    if (!rawEmail || typeof rawEmail !== 'string') {
      return res.status(400).json({ message: 'Email is required' });
    }

    const email = rawEmail.toLowerCase().trim();
    const genericSuccess = {
      message: 'If an active account exists with that email, a password reset link has been sent.',
    };

    // Check email domain restriction
    const domainRegex = getEmailDomainRegex();
    if (!domainRegex.test(email)) {
      // Still return generic success to avoid email probing
      return res.status(200).json(genericSuccess);
    }

    const userRes = await query(
      `SELECT id, name, email, is_active, deleted_at, email_verified
       FROM users
       WHERE LOWER(email) = LOWER($1)`,
      [email]
    );

    if (userRes.rowCount === 0) {
      return res.status(200).json(genericSuccess);
    }

    const user = userRes.rows[0];

    // Only issue token for active, verified, non-deleted accounts
    if (user.is_active && !user.deleted_at && user.email_verified) {
      // Invalidate existing unused reset tokens
      await query(
        'UPDATE password_resets SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
        [user.id]
      );

      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await query(
        `INSERT INTO password_resets (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '30 minutes')`,
        [user.id, tokenHash]
      );

      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        token: rawToken,
      });
    }

    return res.status(200).json(genericSuccess);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/reset-password
 */
export async function resetPassword(req, res, next) {
  try {
    const parseResult = resetPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: parseResult.error.errors[0]?.message || 'Validation failed',
      });
    }

    const { token: rawToken, newPassword, confirmPassword } = parseResult.data;

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const resetRes = await query(
      `SELECT pr.id, pr.user_id, pr.expires_at, pr.used_at, u.name, u.email, u.token_version
       FROM password_resets pr
       JOIN users u ON pr.user_id = u.id
       WHERE pr.token_hash = $1`,
      [tokenHash]
    );

    if (resetRes.rowCount === 0) {
      return res.status(400).json({
        message: 'Invalid or expired password reset link. Please request a new one.',
      });
    }

    const resetEntry = resetRes.rows[0];

    if (resetEntry.used_at) {
      return res.status(400).json({
        message: 'This password reset link has already been used. Please request a new one.',
      });
    }

    if (new Date(resetEntry.expires_at) < new Date()) {
      return res.status(400).json({
        message: 'This password reset link has expired. Please request a new one.',
      });
    }

    // Validate password rules (length, letters & numbers, not equal to name/email, not common)
    const passwordError = validatePasswordStrength(
      newPassword,
      resetEntry.name,
      resetEntry.email
    );
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    // Hash new password with bcrypt cost 12
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Apply reset in a transaction:
    // 1. Update user password_hash
    // 2. Increment token_version to invalidate ALL active JWT sessions
    // 3. Mark all reset tokens for this user as used
    await query('BEGIN');
    try {
      await query(
        `UPDATE users
         SET password_hash = $1, token_version = token_version + 1, updated_at = NOW()
         WHERE id = $2`,
        [passwordHash, resetEntry.user_id]
      );

      await query(
        'UPDATE password_resets SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
        [resetEntry.user_id]
      );

      await query('COMMIT');
    } catch (e) {
      await query('ROLLBACK');
      throw e;
    }

    console.log(`🔑 [AUTH] Password reset successfully for user: ${resetEntry.email}. Existing sessions invalidated.`);

    return res.status(200).json({
      message: 'Password has been reset successfully. Please log in with your new password.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 */
export function logout(req, res) {
  res.clearCookie(COOKIE_NAME, getCookieOptions());

  return res.status(200).json({
    message: 'Logged out successfully',
  });
}

/**
 * GET /api/auth/me
 */
export function getMe(req, res) {
  return res.status(200).json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      email_verified: req.user.email_verified,
    },
  });
}

/**
 * PUT /api/auth/profile
 */
export async function updateProfile(req, res, next) {
  try {
    const { name, college, yearOfStudy, skills, bio } = req.body;
    const updateRes = await query(
      `UPDATE users
       SET name = COALESCE($1, name),
           college = COALESCE($2, college),
           year_of_study = COALESCE($3, year_of_study),
           skills = COALESCE($4, skills),
           bio = COALESCE($5, bio),
           updated_at = NOW()
       WHERE id = $6
       RETURNING id, name, email, role, college, year_of_study, skills, bio`,
      [name, college, yearOfStudy, skills, bio, req.user.id]
    );

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = updateRes.rows[0];
    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        college: user.college,
        yearOfStudy: user.year_of_study,
        skills: user.skills || [],
        bio: user.bio || '',
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/users
 */
export async function getAllUsers(req, res, next) {
  try {
    const usersRes = await query(
      `SELECT id, name, email, role, college, year_of_study, skills, bio
       FROM users
       WHERE is_active = true AND deleted_at IS NULL
       ORDER BY created_at DESC`
    );

    const users = usersRes.rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      college: u.college,
      yearOfStudy: u.year_of_study,
      skills: u.skills || [],
      bio: u.bio || '',
    }));

    return res.status(200).json({ users });
  } catch (err) {
    next(err);
  }
}
