import express from 'express';
import {
  validatePromoCode,
  calculateDiscount,
  getActivePromoCodes,
  createPromoCode,
  getAllPromoCodes,
  getPromoCodeById,
  updatePromoCode,
  deletePromoCode,
} from '../controllers/PromoController.js';
import verifyToken from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/active', getActivePromoCodes);

// Protected routes (Regular users)
router.post('/validate', verifyToken, validatePromoCode);
router.post('/calculate-discount', verifyToken, calculateDiscount);

// Admin routes (Protected - requires admin role)
// TODO: Add admin role check middleware
router.post('/', verifyToken, createPromoCode);
router.get('/', verifyToken, getAllPromoCodes);
router.get('/:promoId', verifyToken, getPromoCodeById);
router.put('/:promoId', verifyToken, updatePromoCode);
router.delete('/:promoId', verifyToken, deletePromoCode);

export default router;