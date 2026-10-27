import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { reportLimiter } from '../middleware/rateLimiter.js';
import { query } from '../db.js';

const router = Router();

const createReportSchema = z.object({
  listingId: z.string().uuid().optional().nullable(),
  reportedUserId: z.string().uuid().optional().nullable(),
  reason: z
    .string({ required_error: 'Reason is required' })
    .trim()
    .min(5, 'Reason must be at least 5 characters')
    .max(1000, 'Reason cannot exceed 1000 characters'),
}).refine(data => data.listingId || data.reportedUserId, {
  message: 'Must provide either a listingId or a reportedUserId to report',
});

/**
 * POST /api/reports
 * Authenticated endpoint for campus members to flag inappropriate content
 */
router.post('/', authenticate, reportLimiter, async (req, res, next) => {
  try {
    const parseResult = createReportSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: parseResult.error.errors[0]?.message || 'Validation error',
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const { listingId, reportedUserId, reason } = parseResult.data;
    const reporterId = req.user.id;

    // Optional verification of target existence
    if (listingId) {
      const listingCheck = await query('SELECT id FROM listings WHERE id = $1', [listingId]);
      if (listingCheck.rowCount === 0) {
        return res.status(404).json({ message: 'Target listing not found' });
      }
    }

    if (reportedUserId) {
      const userCheck = await query('SELECT id FROM users WHERE id = $1', [reportedUserId]);
      if (userCheck.rowCount === 0) {
        return res.status(404).json({ message: 'Target user not found' });
      }
    }

    const insertRes = await query(
      `INSERT INTO reports (reporter_id, listing_id, reported_user_id, reason, status)
       VALUES ($1, $2, $3, $4, 'open')
       RETURNING id, reporter_id as "reporterId", listing_id as "listingId", 
                 reported_user_id as "reportedUserId", reason, status, created_at as "createdAt"`,
      [reporterId, listingId || null, reportedUserId || null, reason]
    );

    res.status(201).json({
      message: 'Report submitted successfully. Administrators will review it.',
      report: insertRes.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

export default router;
