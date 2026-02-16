import express from 'express';
import {
  getCurrentUsage,
  checkLimit,
  getUsageHistory,
} from '../controllers/UsageController.js';
import verifyToken from '../middleware/auth.js';

const router = express.Router();

// All usage routes require authentication
router.get('/current', verifyToken, getCurrentUsage);
router.get('/check-limit/:limitType', verifyToken, checkLimit);
router.get('/history', verifyToken, getUsageHistory);

export default router;