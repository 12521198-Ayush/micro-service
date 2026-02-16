import express from 'express';
import {
  createOrUpdateOrganizationDetails,
  getOrganizationDetails,
} from '../controllers/organizationController.js';
import verifyToken from '../middleware/auth.js';

const router = express.Router();

// Create or Update organization details with single POST endpoint
router.post('/details', verifyToken, createOrUpdateOrganizationDetails);

// Get organization details
router.get('/details', verifyToken, getOrganizationDetails);

export default router;
