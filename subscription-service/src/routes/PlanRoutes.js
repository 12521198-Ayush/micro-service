import express from 'express';
import {
  getAllPlans,
  getPlanById,
  comparePlans,
  getPlanPricing,
} from '../controllers/PlanController.js'

const router = express.Router();



// Public routes
router.get('/plans', getAllPlans);
router.get('/plans/:planId', getPlanById);
router.get('/plans/:planId/pricing', getPlanPricing);
router.get('/plans-compare', comparePlans);

export default router;