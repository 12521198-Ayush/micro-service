import express from 'express';
import {
  register,
  login,
  getProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  updateProfile,
  deleteAccount,
  updateMetaBusinessAccountId,
} from '../controllers/authController.js';
import verifyToken from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/profile', verifyToken, getProfile);
router.put('/profile', verifyToken, updateProfile);
router.post('/change-password', verifyToken, changePassword);
router.post('/meta-business-account', verifyToken, updateMetaBusinessAccountId);
router.delete('/account', verifyToken, deleteAccount);

export default router;
