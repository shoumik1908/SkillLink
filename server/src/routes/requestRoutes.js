import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { pool, query } from '../db.js';

const router = Router();

/**
 * POST /api/requests
 * Creates a join request. student_id is strictly derived from req.user.id
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { listingId, message } = req.body;
    if (!listingId) {
      return res.status(400).json({ message: 'listingId is required' });
    }

    const studentId = req.user.id;

    // Check if listing exists
    const listingRes = await query('SELECT id, owner_id FROM listings WHERE id = $1', [listingId]);
    if (listingRes.rowCount === 0) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    if (listingRes.rows[0].owner_id === studentId) {
      return res.status(400).json({ message: 'Cannot join your own listing' });
    }

    const insertRes = await query(
      `INSERT INTO requests (listing_id, student_id, message)
       VALUES ($1, $2, $3)
       ON CONFLICT (listing_id, student_id) DO NOTHING
       RETURNING id, listing_id as "listingId", student_id as "studentId", status, message, created_at as "createdAt"`,
      [listingId, studentId, message || null]
    );

    if (insertRes.rowCount === 0) {
      return res.status(409).json({ message: 'Request already exists for this listing' });
    }

    res.status(201).json({ request: insertRes.rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/requests/:id
 * Accept or decline request: ONLY owner of the listing or admin can do this.
 * Approving runs in a transaction and is rejected if the team is full.
 */
router.patch('/:id', authenticate, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['approved', 'denied'].includes(status)) {
      return res.status(400).json({ message: "Status must be 'approved' or 'denied'" });
    }

    await client.query('BEGIN');

    // Lock request and join listing to get owner and intended team size
    const requestRes = await client.query(
      `SELECT r.id, r.listing_id, r.student_id, r.status, l.owner_id, l.intended_team_size
       FROM requests r
       JOIN listings l ON r.listing_id = l.id
       WHERE r.id = $1
       FOR UPDATE`,
      [id]
    );

    if (requestRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Request not found' });
    }

    const requestItem = requestRes.rows[0];

    // OWNERSHIP CHECK: Admin can override; otherwise listing owner MUST match req.user.id
    if (req.user.role !== 'admin' && requestItem.owner_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        message: 'Forbidden: You can only respond to requests for listings you own.',
      });
    }

    // If approving, check if team is already full (1 owner + approved requests)
    if (status === 'approved' && requestItem.status !== 'approved') {
      const approvedCountRes = await client.query(
        `SELECT COUNT(*)::int as count 
         FROM requests 
         WHERE listing_id = $1 AND status = 'approved'`,
        [requestItem.listing_id]
      );

      const approvedCount = approvedCountRes.rows[0].count;
      const currentTeamSize = 1 + approvedCount; // Owner counts as 1 spot
      const maxTeamSize = requestItem.intended_team_size || 1;

      if (currentTeamSize >= maxTeamSize) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          message: 'Cannot accept request: Team is already full.',
        });
      }
    }

    const updateRes = await client.query(
      `UPDATE requests
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, listing_id as "listingId", student_id as "studentId", status, updated_at as "updatedAt"`,
      [status, id]
    );

    await client.query('COMMIT');

    res.json({
      message: `Request ${status} successfully`,
      request: updateRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

export default router;
