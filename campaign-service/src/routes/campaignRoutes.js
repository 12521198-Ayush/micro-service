import express from 'express';
import {
  createCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign
} from '../controllers/campaignController.js';
import {
  executeCampaign,
  pauseCampaign,
  resumeCampaign,
  cancelCampaign,
  getCampaignAnalytics,
  getCampaignMessages,
  scheduleCampaign
} from '../controllers/campaignExecutionController.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// CRUD operations
router.post('/', createCampaign);
router.get('/', getCampaigns);
router.get('/:id', getCampaignById);
router.put('/:id', updateCampaign);
router.delete('/:id', deleteCampaign);

// Campaign execution operations
router.post('/:id/execute', executeCampaign);
router.post('/:id/pause', pauseCampaign);
router.post('/:id/resume', resumeCampaign);
router.post('/:id/cancel', cancelCampaign);
router.post('/:id/schedule', scheduleCampaign);

// Analytics and reporting
router.get('/:id/analytics', getCampaignAnalytics);
router.get('/:id/stats', getCampaignAnalytics); // alias
router.get('/:id/messages', getCampaignMessages);

export default router;
