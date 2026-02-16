import express from 'express';
import {
  addBalance,
  deductBalance,
  getBalance,
  getTransactions,
  updateMessagePrices,
} from '../controllers/walletController.js';
import verifyToken from '../middleware/auth.js';

const router = express.Router();

// All wallet routes are protected
router.post('/add', verifyToken, addBalance);
router.post('/deduct', verifyToken, deductBalance);
router.get('/balance', verifyToken, getBalance);
router.get('/transactions', verifyToken, getTransactions);
router.put('/pricing', verifyToken, updateMessagePrices);

export default router;
