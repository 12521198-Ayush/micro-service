import express from 'express';
import {
  getTransactionHistory,
  getTransactionById,
  getTotalRevenue,
} from '../controllers/TransactionController.js';
import verifyToken from '../middleware/auth.js';

const router = express.Router();

// All transaction routes require authentication
router.get('/', verifyToken, getTransactionHistory);
router.get('/:transactionId', verifyToken, getTransactionById);
router.get('/stats/revenue', verifyToken, getTotalRevenue);

export default router;