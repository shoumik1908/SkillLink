import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { query } from '../db.js';

const router = Router();

/**
 * GET /api/listings
 * Publicly viewable or authenticated listings feed
 */
router.get('/', async (req, res, next) => {
  try {
    const listingsRes = await query(`
      SELECT 
        l.id, l.owner_id as "ownerId", l.title, l.description, l.type, 
        l.college, l.intended_team_size as "intendedTeamSize", 
        l.deadline, l.status, l.created_at as "createdAt",
        u.name as "ownerName", u.email as "ownerEmail",
        COALESCE(
          json_agg(DISTINCT ls.skill) FILTER (WHERE ls.skill IS NOT NULL), 
          '[]'
        ) as "requiredSkills",
        COALESCE(
          json_agg(DISTINCT r.student_id) FILTER (WHERE r.student_id IS NOT NULL AND r.status = 'approved'),
          '[]'
        ) as "approvedStudentIds"
      FROM listings l
      JOIN users u ON l.owner_id = u.id
      LEFT JOIN listing_skills ls ON l.id = ls.listing_id
      LEFT JOIN requests r ON l.id = r.listing_id AND r.status = 'approved'
      GROUP BY l.id, u.id
      ORDER BY l.created_at DESC
    `);

    const formatted = listingsRes.rows.map((row) => ({
      ...row,
      currentTeamIds: Array.from(new Set([row.ownerId, ...(row.approvedStudentIds || [])])),
    }));

    res.json({ listings: formatted });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/listings
 * Requires authentication. Derives ownerId strictly from token (req.user.id)
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { title, description, type, college, intendedTeamSize, deadline, requiredSkills } = req.body;

    if (!title || !description || !type) {
      return res.status(400).json({ message: 'Title, description, and type are required' });
    }

    const ownerId = req.user.id; // Strictly from verified token

    const insertRes = await query(
      `INSERT INTO listings (owner_id, title, description, type, college, intended_team_size, deadline)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, owner_id as "ownerId", title, description, type, college, intended_team_size as "intendedTeamSize", deadline, status, created_at as "createdAt"`,
      [
        ownerId,
        title.trim(),
        description.trim(),
        type,
        college || null,
        intendedTeamSize || 1,
        deadline ? new Date(deadline) : null,
      ]
    );

    const newListing = insertRes.rows[0];

    // Insert skills if provided
    if (Array.isArray(requiredSkills) && requiredSkills.length > 0) {
      for (const skill of requiredSkills) {
        if (typeof skill === 'string' && skill.trim()) {
          await query(
            'INSERT INTO listing_skills (listing_id, skill) VALUES ($1, $2)',
            [newListing.id, skill.trim()]
          );
        }
      }
    }

    newListing.requiredSkills = requiredSkills || [];
    res.status(201).json({ listing: newListing });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/listings/:id
 * Users can edit or close only their own listings. Admins can override.
 */
router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, status } = req.body;

    // Fetch existing listing
    const listingRes = await query('SELECT id, owner_id, status FROM listings WHERE id = $1', [id]);
    if (listingRes.rowCount === 0) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    const listing = listingRes.rows[0];

    // OWNERSHIP CHECK: Admin can override; otherwise owner_id MUST match req.user.id
    if (req.user.role !== 'admin' && listing.owner_id !== req.user.id) {
      return res.status(403).json({
        message: 'Forbidden: You can only edit or close listings that you own.',
      });
    }

    // Update fields
    const updated = await query(
      `UPDATE listings
       SET 
         title = COALESCE($1, title),
         description = COALESCE($2, description),
         status = COALESCE($3, status),
         updated_at = NOW()
       WHERE id = $4
       RETURNING id, owner_id as "ownerId", title, description, type, status, updated_at as "updatedAt"`,
      [title || null, description || null, status || null, id]
    );

    res.json({
      message: 'Listing updated successfully',
      listing: updated.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

export default router;
