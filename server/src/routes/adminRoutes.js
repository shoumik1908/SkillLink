import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.js';
import { adminWriteLimiter } from '../middleware/rateLimiter.js';
import { pool, query } from '../db.js';
import { logAudit } from '../utils/auditLogger.js';

const router = Router();

// Re-check authentication & verify role === 'admin' directly against DB on every request
router.use(authenticate, requireRole('admin'));

/**
 * GET /api/admin/stats
 * Key operational KPIs
 */
router.get('/stats', async (req, res, next) => {
  try {
    const [
      usersTotal,
      usersThisWeek,
      activeListings,
      expiredListings,
      totalRequests,
      pendingReports,
    ] = await Promise.all([
      query('SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL'),
      query("SELECT COUNT(*) as count FROM users WHERE created_at >= NOW() - INTERVAL '7 days' AND deleted_at IS NULL"),
      query("SELECT COUNT(*) as count FROM listings WHERE status = 'OPEN' AND (deadline IS NULL OR deadline >= NOW())"),
      query("SELECT COUNT(*) as count FROM listings WHERE status = 'OPEN' AND deadline IS NOT NULL AND deadline < NOW()"),
      query('SELECT COUNT(*) as count FROM requests'),
      query("SELECT COUNT(*) as count FROM reports WHERE status IN ('open', 'pending')"),
    ]);

    res.json({
      totalUsers: parseInt(usersTotal.rows[0].count, 10),
      newSignupsThisWeek: parseInt(usersThisWeek.rows[0].count, 10),
      activeListings: parseInt(activeListings.rows[0].count, 10),
      expiredListings: parseInt(expiredListings.rows[0].count, 10),
      totalRequests: parseInt(totalRequests.rows[0].count, 10),
      pendingReports: parseInt(pendingReports.rows[0].count, 10),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/overview (Compatibility endpoint)
 */
router.get('/overview', async (req, res, next) => {
  try {
    const [usersCount, listingsCount, requestsCount] = await Promise.all([
      query('SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL'),
      query('SELECT COUNT(*) as count FROM listings'),
      query('SELECT COUNT(*) as count FROM requests'),
    ]);

    res.json({
      adminUser: req.user,
      stats: {
        totalUsers: parseInt(usersCount.rows[0].count, 10),
        totalListings: parseInt(listingsCount.rows[0].count, 10),
        totalRequests: parseInt(requestsCount.rows[0].count, 10),
      },
      system: {
        nodeVersion: process.version,
        uptimeSeconds: Math.floor(process.uptime()),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/analytics
 * Data for charts (30-day signups, listings by type, requests by status, top 10 skills)
 */
router.get('/analytics', async (req, res, next) => {
  try {
    const [signupsRes, listingsRes, requestsRes, skillsRes] = await Promise.all([
      // Signups per day for the last 30 days
      query(`
        SELECT 
          to_char(day, 'Mon DD') as label,
          to_char(day, 'YYYY-MM-DD') as date,
          COUNT(u.id)::int as count
        FROM generate_series(
          date_trunc('day', NOW() - INTERVAL '29 days'),
          date_trunc('day', NOW()),
          '1 day'::interval
        ) as day
        LEFT JOIN users u ON date_trunc('day', u.created_at) = day AND u.deleted_at IS NULL
        GROUP BY day
        ORDER BY day ASC
      `),
      // Listings grouped by type
      query(`
        SELECT type, COUNT(*)::int as count
        FROM listings
        GROUP BY type
        ORDER BY count DESC
      `),
      // Requests grouped by status
      query(`
        SELECT status, COUNT(*)::int as count
        FROM requests
        GROUP BY status
        ORDER BY count DESC
      `),
      // Top 10 skills
      query(`
        SELECT skill, COUNT(*)::int as count
        FROM listing_skills
        GROUP BY skill
        ORDER BY count DESC
        LIMIT 10
      `),
    ]);

    res.json({
      signupsByDay: signupsRes.rows,
      listingsByType: listingsRes.rows,
      requestsByStatus: requestsRes.rows,
      topSkills: skillsRes.rows,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/attention
 * Quick overview for items needing administrator attention
 */
router.get('/attention', async (req, res, next) => {
  try {
    const [reportsRes, expiredRes, newUsersRes] = await Promise.all([
      query(`
        SELECT r.id, r.reason, r.status, r.created_at as "createdAt",
               u.name as "reporterName", u.email as "reporterEmail"
        FROM reports r
        JOIN users u ON r.reporter_id = u.id
        WHERE r.status IN ('open', 'pending')
        ORDER BY r.created_at DESC
        LIMIT 5
      `),
      query(`
        SELECT l.id, l.title, l.type, l.deadline, l.status, u.name as "ownerName"
        FROM listings l
        JOIN users u ON l.owner_id = u.id
        WHERE l.status = 'OPEN' AND l.deadline IS NOT NULL AND l.deadline < NOW()
        ORDER BY l.deadline ASC
        LIMIT 5
      `),
      query(`
        SELECT id, name, email, role, created_at as "createdAt"
        FROM users
        WHERE created_at >= NOW() - INTERVAL '24 hours' AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 5
      `),
    ]);

    res.json({
      openReports: reportsRes.rows,
      expiredListings: expiredRes.rows,
      recentSignups: newUsersRes.rows,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/users
 * Searchable, filterable, paginated user list
 */
router.get('/users', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize || '10', 10)));
    const offset = (page - 1) * pageSize;

    const search = req.query.search ? String(req.query.search).trim() : '';
    const roleFilter = req.query.role ? String(req.query.role).trim() : '';
    const statusFilter = req.query.status ? String(req.query.status).trim() : '';

    const conditions = [];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }

    if (roleFilter && ['user', 'admin'].includes(roleFilter)) {
      params.push(roleFilter);
      conditions.push(`role = $${params.length}`);
    }

    if (statusFilter === 'active') {
      conditions.push('is_active = true AND deleted_at IS NULL');
    } else if (statusFilter === 'suspended') {
      conditions.push('is_active = false AND deleted_at IS NULL');
    } else if (statusFilter === 'deleted') {
      conditions.push('deleted_at IS NOT NULL');
    } else {
      conditions.push('deleted_at IS NULL');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
    const countRes = await query(countQuery, params);
    const total = parseInt(countRes.rows[0].total, 10);

    // Data query (never returns password_hash)
    params.push(pageSize);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const usersQuery = `
      SELECT 
        id, name, email, role, is_active as "isActive", 
        email_verified as "emailVerified", deleted_at as "deletedAt",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const usersRes = await query(usersQuery, params);

    res.json({
      users: usersRes.rows,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/users/:id/detail
 * User profile drawer info: listings, reports, and request stats
 */
router.get('/users/:id/detail', async (req, res, next) => {
  try {
    const { id } = req.params;

    const [userRes, listingsRes, reportsRes] = await Promise.all([
      query(
        `SELECT id, name, email, role, is_active as "isActive", deleted_at as "deletedAt", created_at as "createdAt"
         FROM users WHERE id = $1`,
        [id]
      ),
      query(
        `SELECT id, title, type, status, intended_team_size as "intendedTeamSize", deadline, created_at as "createdAt"
         FROM listings WHERE owner_id = $1 ORDER BY created_at DESC`,
        [id]
      ),
      query(
        `SELECT id, reason, status, created_at as "createdAt"
         FROM reports WHERE reported_user_id = $1 ORDER BY created_at DESC`,
        [id]
      ),
    ]);

    if (userRes.rowCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: userRes.rows[0],
      listings: listingsRes.rows,
      reportsAgainstUser: reportsRes.rows,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/users/:id/role
 * Change user role (Protected: no self-demotion, last admin protected, audit logged)
 */
router.patch('/users/:id/role', adminWriteLimiter, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id: targetId } = req.params;
    const { role: newRole } = req.body;

    if (!['user', 'admin'].includes(newRole)) {
      return res.status(400).json({ message: "Role must be 'user' or 'admin'" });
    }

    // 1. Self-protection
    if (req.user.id === targetId) {
      return res.status(400).json({ message: 'Administrators cannot modify their own role.' });
    }

    await client.query('BEGIN');

    // 2. Fetch current target state
    const targetRes = await client.query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = $1 AND deleted_at IS NULL FOR UPDATE',
      [targetId]
    );

    if (targetRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'User not found or deleted.' });
    }

    const previousRole = targetRes.rows[0].role;

    // 3. Last Admin Protection
    if (previousRole === 'admin' && newRole === 'user') {
      const adminCountRes = await client.query(
        "SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = true AND deleted_at IS NULL AND id != $1",
        [targetId]
      );
      const remainingAdmins = parseInt(adminCountRes.rows[0].count, 10);
      if (remainingAdmins < 1) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Cannot demote the last remaining active administrator.' });
      }
    }

    // 4. Update role
    const updateRes = await client.query(
      `UPDATE users
       SET role = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, name, email, role, is_active as "isActive", created_at as "createdAt"`,
      [newRole, targetId]
    );

    // 5. Audit Log inside transaction
    await logAudit(client, {
      actorId: req.user.id,
      action: 'USER_ROLE_UPDATED',
      targetType: 'user',
      targetId,
      metadata: { previousRole, newRole, targetEmail: targetRes.rows[0].email },
      ipAddress: req.ip,
    });

    await client.query('COMMIT');

    res.json({
      message: `User role successfully updated to ${newRole}`,
      user: updateRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * PATCH /api/admin/users/:id/status
 * Suspend or activate user (Protected: no self-suspension, last admin protected, audit logged)
 */
router.patch('/users/:id/status', adminWriteLimiter, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id: targetId } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ message: 'is_active must be a boolean' });
    }

    // 1. Self-protection
    if (req.user.id === targetId && is_active === false) {
      return res.status(400).json({ message: 'Administrators cannot suspend their own account.' });
    }

    await client.query('BEGIN');

    const targetRes = await client.query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = $1 AND deleted_at IS NULL FOR UPDATE',
      [targetId]
    );

    if (targetRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'User not found or deleted.' });
    }

    const target = targetRes.rows[0];

    // 2. Last admin protection against suspension
    if (target.role === 'admin' && is_active === false) {
      const adminCountRes = await client.query(
        "SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = true AND deleted_at IS NULL AND id != $1",
        [targetId]
      );
      const remainingAdmins = parseInt(adminCountRes.rows[0].count, 10);
      if (remainingAdmins < 1) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Cannot suspend the last remaining active administrator.' });
      }
    }

    const updateRes = await client.query(
      `UPDATE users
       SET is_active = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, name, email, role, is_active as "isActive", created_at as "createdAt"`,
      [is_active, targetId]
    );

    // Audit log
    await logAudit(client, {
      actorId: req.user.id,
      action: is_active ? 'USER_ACTIVATED' : 'USER_SUSPENDED',
      targetType: 'user',
      targetId,
      metadata: { targetEmail: target.email, previousStatus: target.is_active, newStatus: is_active },
      ipAddress: req.ip,
    });

    await client.query('COMMIT');

    res.json({
      message: is_active ? 'User account activated' : 'User account suspended',
      user: updateRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * POST /api/admin/users/:id/reset-password
 * Reset user password to default firstname@123
 */
router.post('/users/:id/reset-password', adminWriteLimiter, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id: targetId } = req.params;

    await client.query('BEGIN');

    // 1. Fetch user
    const targetRes = await client.query(
      'SELECT id, name, email, role FROM users WHERE id = $1 AND deleted_at IS NULL FOR UPDATE',
      [targetId]
    );

    if (targetRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'User not found or deleted.' });
    }

    const targetUser = targetRes.rows[0];

    // 2. Compute default password: firstname@123
    const rawFirstName = (targetUser.name || 'user').trim().split(/\s+/)[0].toLowerCase();
    const cleanFirstName = rawFirstName.replace(/[^a-z0-9]/g, '') || 'user';
    const defaultPassword = `${cleanFirstName}@123`;

    // 3. Hash with bcrypt cost 12
    const passwordHash = await bcrypt.hash(defaultPassword, 12);

    // 4. Update password_hash and increment token_version to revoke old active sessions
    await client.query(
      `UPDATE users
       SET password_hash = $1, token_version = token_version + 1, updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, targetId]
    );

    // 5. Audit Log
    await logAudit(client, {
      actorId: req.user.id,
      action: 'ADMIN_RESET_USER_PASSWORD',
      targetType: 'user',
      targetId,
      metadata: {
        targetEmail: targetUser.email,
        targetName: targetUser.name,
        resetPattern: 'firstname@123',
      },
      ipAddress: req.ip,
    });

    await client.query('COMMIT');

    return res.status(200).json({
      message: `Password for ${targetUser.name} has been reset to ${defaultPassword}`,
      newPassword: defaultPassword,
      userName: targetUser.name,
      userEmail: targetUser.email,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/admin/users/:id
 * Soft delete user account (Protected: no self-deletion, last admin protected, audit logged)
 */
router.delete('/users/:id', adminWriteLimiter, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id: targetId } = req.params;

    // 1. Self-protection
    if (req.user.id === targetId) {
      return res.status(400).json({ message: 'Administrators cannot delete their own account.' });
    }

    await client.query('BEGIN');

    const targetRes = await client.query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = $1 AND deleted_at IS NULL FOR UPDATE',
      [targetId]
    );

    if (targetRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'User not found or already deleted.' });
    }

    const target = targetRes.rows[0];

    // 2. Last admin protection
    if (target.role === 'admin') {
      const adminCountRes = await client.query(
        "SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = true AND deleted_at IS NULL AND id != $1",
        [targetId]
      );
      const remainingAdmins = parseInt(adminCountRes.rows[0].count, 10);
      if (remainingAdmins < 1) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Cannot delete the last remaining active administrator.' });
      }
    }

    // Soft delete
    await client.query(
      'UPDATE users SET deleted_at = NOW(), is_active = false, updated_at = NOW() WHERE id = $1',
      [targetId]
    );

    // Audit log
    await logAudit(client, {
      actorId: req.user.id,
      action: 'USER_DELETED',
      targetType: 'user',
      targetId,
      metadata: { targetEmail: target.email, role: target.role },
      ipAddress: req.ip,
    });

    await client.query('COMMIT');

    res.json({ message: 'User account has been soft-deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * GET /api/admin/listings
 * Paginated moderation table for listings
 */
router.get('/listings', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize || '10', 10)));
    const offset = (page - 1) * pageSize;

    const search = req.query.search ? String(req.query.search).trim() : '';
    const typeFilter = req.query.type ? String(req.query.type).trim() : '';
    const statusFilter = req.query.status ? String(req.query.status).trim() : '';
    const expiredFilter = req.query.expired === 'true';

    const conditions = [];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(l.title ILIKE $${params.length} OR l.description ILIKE $${params.length})`);
    }

    if (typeFilter && ['Project', 'Hackathon Team', 'Competition'].includes(typeFilter)) {
      params.push(typeFilter);
      conditions.push(`l.type = $${params.length}`);
    }

    if (statusFilter && ['OPEN', 'FILLED', 'CLOSED', 'FLAGGED', 'REMOVED'].includes(statusFilter)) {
      params.push(statusFilter);
      conditions.push(`l.status = $${params.length}`);
    }

    if (expiredFilter) {
      conditions.push('(l.deadline IS NOT NULL AND l.deadline < NOW())');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(
      `SELECT COUNT(*) as total FROM listings l ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].total, 10);

    params.push(pageSize);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const dataQuery = `
      SELECT 
        l.id, l.owner_id as "ownerId", l.title, l.description, l.type, 
        l.college, l.intended_team_size as "intendedTeamSize", 
        l.deadline, l.status, l.created_at as "createdAt",
        (l.deadline IS NOT NULL AND l.deadline < NOW()) as "isExpired",
        u.name as "ownerName", u.email as "ownerEmail",
        COALESCE(
          json_agg(ls.skill) FILTER (WHERE ls.skill IS NOT NULL), 
          '[]'
        ) as "requiredSkills"
      FROM listings l
      JOIN users u ON l.owner_id = u.id
      LEFT JOIN listing_skills ls ON l.id = ls.listing_id
      ${whereClause}
      GROUP BY l.id, u.id
      ORDER BY l.created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const listingsRes = await query(dataQuery, params);

    res.json({
      listings: listingsRes.rows,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/listings/:id/status
 * Moderation status change (approve, flag, remove, close)
 */
router.patch('/listings/:id/status', adminWriteLimiter, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['OPEN', 'FLAGGED', 'REMOVED', 'CLOSED'].includes(status)) {
      return res.status(400).json({
        message: "Status must be 'OPEN', 'FLAGGED', 'REMOVED', or 'CLOSED'",
      });
    }

    await client.query('BEGIN');

    const listingCheck = await client.query(
      'SELECT id, title, status, owner_id FROM listings WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (listingCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Listing not found' });
    }

    const previousStatus = listingCheck.rows[0].status;

    const updateRes = await client.query(
      `UPDATE listings
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, title, type, status, updated_at as "updatedAt"`,
      [status, id]
    );

    // Audit Log inside transaction
    await logAudit(client, {
      actorId: req.user.id,
      action: 'LISTING_MODERATED',
      targetType: 'listing',
      targetId: id,
      metadata: {
        listingTitle: listingCheck.rows[0].title,
        previousStatus,
        newStatus: status,
      },
      ipAddress: req.ip,
    });

    await client.query('COMMIT');

    res.json({
      message: `Listing status updated to ${status}`,
      listing: updateRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * GET /api/admin/reports
 * Paginated reports queue
 */
router.get('/reports', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize || '10', 10)));
    const offset = (page - 1) * pageSize;

    const statusFilter = req.query.status ? String(req.query.status).trim() : '';

    const conditions = [];
    const params = [];

    if (statusFilter && ['open', 'reviewed', 'resolved', 'dismissed'].includes(statusFilter)) {
      params.push(statusFilter);
      conditions.push(`r.status = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(`SELECT COUNT(*) as total FROM reports r ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].total, 10);

    params.push(pageSize);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const reportsQuery = `
      SELECT 
        r.id, r.reason, r.status, r.admin_note as "adminNote",
        r.created_at as "createdAt", r.reviewed_at as "reviewedAt",
        u.id as "reporterId", u.name as "reporterName", u.email as "reporterEmail",
        l.id as "listingId", l.title as "listingTitle",
        ru.id as "reportedUserId", ru.name as "reportedUserName", ru.email as "reportedUserEmail"
      FROM reports r
      JOIN users u ON r.reporter_id = u.id
      LEFT JOIN listings l ON r.listing_id = l.id
      LEFT JOIN users ru ON r.reported_user_id = ru.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const reportsRes = await query(reportsQuery, params);

    res.json({
      reports: reportsRes.rows,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/reports/:id
 * Resolve or dismiss a report with optional admin note
 */
router.patch('/reports/:id', adminWriteLimiter, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    if (!['open', 'reviewed', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({
        message: "Status must be 'open', 'reviewed', 'resolved', or 'dismissed'",
      });
    }

    await client.query('BEGIN');

    const reportCheck = await client.query('SELECT id, status FROM reports WHERE id = $1 FOR UPDATE', [id]);
    if (reportCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Report not found' });
    }

    const previousStatus = reportCheck.rows[0].status;

    const updateRes = await client.query(
      `UPDATE reports
       SET status = $1, admin_note = COALESCE($2, admin_note), 
           reviewed_at = NOW(), reviewed_by = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING id, reason, status, admin_note as "adminNote", reviewed_at as "reviewedAt"`,
      [status, note || null, req.user.id, id]
    );

    // Audit log inside transaction
    await logAudit(client, {
      actorId: req.user.id,
      action: 'REPORT_REVIEWED',
      targetType: 'report',
      targetId: id,
      metadata: { previousStatus, newStatus: status, adminNote: note || '' },
      ipAddress: req.ip,
    });

    await client.query('COMMIT');

    res.json({
      message: `Report marked as ${status}`,
      report: updateRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * GET /api/admin/audit-log
 * Paginated admin audit trail
 */
router.get('/audit-log', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize || '15', 10)));
    const offset = (page - 1) * pageSize;

    const actor = req.query.actor ? String(req.query.actor).trim() : '';
    const action = req.query.action ? String(req.query.action).trim() : '';

    const conditions = [];
    const params = [];

    if (actor) {
      params.push(`%${actor}%`);
      conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
    }

    if (action) {
      params.push(`%${action}%`);
      conditions.push(`a.action ILIKE $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(
      `SELECT COUNT(*) as total FROM audit_log a LEFT JOIN users u ON a.actor_id = u.id ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].total, 10);

    params.push(pageSize);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const auditQuery = `
      SELECT 
        a.id, a.action, a.target_type as "targetType", a.target_id as "targetId",
        a.metadata, a.ip_address as "ipAddress", a.created_at as "createdAt",
        u.id as "actorId", u.name as "actorName", u.email as "actorEmail", u.role as "actorRole"
      FROM audit_log a
      LEFT JOIN users u ON a.actor_id = u.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const logsRes = await query(auditQuery, params);

    res.json({
      logs: logsRes.rows,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
