import { Router } from 'express';
import {
  createListing,
  getListings,
  getListingById,
  deleteListing,
} from '../controllers/listingController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.get('/', getListings);
router.get('/:id', getListingById);
router.post('/', authenticateToken, createListing);
router.delete('/:id', authenticateToken, deleteListing);

export default router;
