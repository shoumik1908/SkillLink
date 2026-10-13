import { Router } from 'express';
import {
  createRequest,
  getRequests,
  respondToRequest,
} from '../controllers/requestController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.post('/', createRequest);
router.get('/', getRequests);
router.patch('/:id', respondToRequest);

export default router;
