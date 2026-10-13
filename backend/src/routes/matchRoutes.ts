import { Router } from 'express';
import { getMatches } from '../controllers/matchController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getMatches);

export default router;
