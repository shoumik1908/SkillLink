import jwt from 'jsonwebtoken';
import { query } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.warn('⚠️ WARNING: JWT_SECRET should be at least 32 characters long!');
}

/**
 * Authenticates request using httpOnly JWT cookie
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken =
      authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const token = req.cookies?.token || bearerToken;

    if (!token) {
      return res.status(401).json({ message: 'Authentication required. No session found.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    } catch (err) {
      // Clear invalid cookie
      res.clearCookie('token', {
        httpOnly: true,
        sameSite: process.env.COOKIE_SAME_SITE || 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      });
      return res.status(401).json({ message: 'Invalid or expired session. Please log in again.' });
    }

    // Verify user exists, is active, is not soft-deleted, email is verified, and token_version matches
    const userRes = await query(
      'SELECT id, name, email, role, is_active, deleted_at, email_verified, token_version, college, year_of_study, skills, bio FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userRes.rowCount === 0) {
      return res.status(401).json({ message: 'Account no longer exists.' });
    }

    const dbUser = userRes.rows[0];

    if (dbUser.deleted_at) {
      return res.status(401).json({ message: 'Account has been deleted.' });
    }

    if (!dbUser.is_active) {
      return res.status(403).json({ message: 'Account is inactive or suspended.' });
    }

    // Check token version to end old sessions after password reset
    if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== dbUser.token_version) {
      res.clearCookie('token', {
        httpOnly: true,
        sameSite: process.env.COOKIE_SAME_SITE || 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      });
      return res.status(401).json({ message: 'Session invalidated. Please log in again.' });
    }

    // Require email verification for all protected routes
    if (!dbUser.email_verified) {
      return res.status(403).json({ message: 'Please verify your email before accessing this resource.' });
    }

    // Attach verified user to request (strictly from DB + verified token)
    req.user = {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      email_verified: dbUser.email_verified,
      college: dbUser.college || 'State University',
      yearOfStudy: dbUser.year_of_study || 1,
      skills: Array.isArray(dbUser.skills) ? dbUser.skills : [],
      bio: dbUser.bio || '',
    };

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Role-based access control middleware
 * For admin roles, re-checks role, active status, and deletion in DB on each request
 */
export function requireRole(...roles) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required.' });
      }

      // If checking for admin or if user claims admin, perform immediate database re-verification
      if (roles.includes('admin') || req.user.role === 'admin') {
        const freshUser = await query(
          'SELECT role, is_active, deleted_at FROM users WHERE id = $1',
          [req.user.id]
        );

        if (
          freshUser.rowCount === 0 ||
          !freshUser.rows[0].is_active ||
          freshUser.rows[0].deleted_at ||
          freshUser.rows[0].role !== 'admin'
        ) {
          return res.status(403).json({ message: 'Access denied: Admin privileges revoked or inactive.' });
        }

        req.user.role = freshUser.rows[0].role;
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          message: `Forbidden: Requires one of [${roles.join(', ')}] role.`,
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
