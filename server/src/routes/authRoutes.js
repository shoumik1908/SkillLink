import { Router } from 'express';
import {
  register,
  verifyEmail,
  resendVerification,
  login,
  forgotPassword,
  resetPassword,
  logout,
  getMe,
  updateProfile,
  getAllUsers,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import {
  registerLimiter,
  loginLimiter,
  resendVerificationLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  verifyEmailLimiter,
} from '../middleware/rateLimiter.js';

const router = Router();

// Registration & Verification
router.post('/register', registerLimiter, register);
router.get('/verify-email', verifyEmailLimiter, verifyEmail);
router.post('/resend-verification', resendVerificationLimiter, resendVerification);

// Authentication
router.post('/login', loginLimiter, login);
router.post('/logout', logout);

// Password Recovery
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password', resetPasswordLimiter, resetPassword);

// Session Profile & Users
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.get('/users', getAllUsers);

export default router;
