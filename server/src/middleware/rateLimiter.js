import rateLimit from 'express-rate-limit';

// Standard IP-based rate limiters
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many registration attempts from this IP. Please try again after an hour.',
  },
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many login attempts from this IP. Please try again after 15 minutes.',
  },
});

export const resendVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many verification email requests from this IP. Please try again in an hour.',
  },
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many password reset requests from this IP. Please try again in an hour.',
  },
});

export const resetPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many password reset submissions from this IP. Please try again later.',
  },
});

export const verifyEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many email verification attempts. Please try again later.',
  },
});

// Existing limiters for admin & reports
export const adminWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many administrative requests. Please slow down.',
  },
});

export const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many report submissions. Please try again later.',
  },
});

// Backward-compatible authLimiter
export const authLimiter = loginLimiter;

/* ========================================================================
   EMAIL-BASED ACCOUNT LOCKOUT (5 failed attempts -> 15-minute temporary lockout)
   ======================================================================== */
const failedLoginAttempts = new Map(); // email -> { count: number, lockUntil: number, firstAttemptAt: number }

export function checkLoginLockout(email) {
  if (!email) return { isLocked: false };
  const normalized = email.trim().toLowerCase();
  const entry = failedLoginAttempts.get(normalized);
  if (!entry) return { isLocked: false };

  const now = Date.now();
  // If locked and lock period is still active
  if (entry.lockUntil && entry.lockUntil > now) {
    const remainingSeconds = Math.ceil((entry.lockUntil - now) / 1000);
    const remainingMinutes = Math.ceil(remainingSeconds / 60);
    return {
      isLocked: true,
      remainingMinutes,
      message: `Account temporarily locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute(s).`,
    };
  }

  // If lock period has expired, reset
  if (entry.lockUntil && entry.lockUntil <= now) {
    failedLoginAttempts.delete(normalized);
    return { isLocked: false };
  }

  // Clear if attempts were recorded over 15 minutes ago
  if (now - entry.firstAttemptAt > 15 * 60 * 1000) {
    failedLoginAttempts.delete(normalized);
    return { isLocked: false };
  }

  return { isLocked: false };
}

export function recordFailedLogin(email) {
  if (!email) return;
  const normalized = email.trim().toLowerCase();
  const now = Date.now();
  const entry = failedLoginAttempts.get(normalized) || { count: 0, lockUntil: 0, firstAttemptAt: now };

  // Reset window if first attempt was > 15 min ago
  if (now - entry.firstAttemptAt > 15 * 60 * 1000) {
    entry.count = 1;
    entry.firstAttemptAt = now;
    entry.lockUntil = 0;
  } else {
    entry.count += 1;
  }

  if (entry.count >= 5) {
    entry.lockUntil = now + 15 * 60 * 1000; // 15 minutes lockout
    console.warn(`🔒 [SECURITY] Account ${normalized} locked for 15 minutes after 5 failed login attempts.`);
  }

  failedLoginAttempts.set(normalized, entry);
}

export function recordSuccessfulLogin(email) {
  if (!email) return;
  failedLoginAttempts.delete(email.trim().toLowerCase());
}

/* ========================================================================
   EMAIL-BASED RESEND VERIFICATION RATE LIMIT (Max 3 per hour per email)
   ======================================================================== */
const resendEmailTracker = new Map(); // email -> timestamps[]

export function checkResendEmailLimit(email) {
  if (!email) return { allowed: true };
  const normalized = email.trim().toLowerCase();
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour

  let timestamps = resendEmailTracker.get(normalized) || [];
  // Filter out timestamps older than 1 hour
  timestamps = timestamps.filter(ts => now - ts < windowMs);

  if (timestamps.length >= 3) {
    return {
      allowed: false,
      message: 'Too many verification email requests for this account. Please wait before requesting another.',
    };
  }

  timestamps.push(now);
  resendEmailTracker.set(normalized, timestamps);
  return { allowed: true };
}
