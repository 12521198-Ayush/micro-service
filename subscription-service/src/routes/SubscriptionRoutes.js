import express from 'express';
import {
  subscribe,
  getCurrentSubscription,
  getSubscriptionHistory,
  cancelSubscription,
  toggleAutoRenew,
} from '../controllers/SubscriptionController.js';
import verifyToken from '../middleware/auth.js';

const router = express.Router();

// All subscription routes require authentication
router.post('/subscribe', verifyToken, subscribe);
router.get('/current', verifyToken, getCurrentSubscription);
router.get('/history', verifyToken, getSubscriptionHistory);
router.post('/:subscriptionId/cancel', verifyToken, cancelSubscription);
router.put('/:subscriptionId/auto-renew', verifyToken, toggleAutoRenew);

export default router;