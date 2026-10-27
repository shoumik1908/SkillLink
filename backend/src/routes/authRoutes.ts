import { Router } from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
  getAllUsers,
  uploadResume,
  deleteResume,
} from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import { resumeUpload } from '../middleware/upload.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticateToken, getMe);
router.put('/profile', authenticateToken, updateProfile);
router.get('/users', getAllUsers);

// Resume upload & management
router.post('/resume', authenticateToken, resumeUpload.single('resume'), uploadResume);
router.delete('/resume', authenticateToken, deleteResume);

export default router;
