import express from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import {
  receiveMetaWebhook,
  verifyMetaWebhook,
} from '../controllers/metaWebhookController.js';

const router = express.Router();

router.get('/meta', asyncHandler(verifyMetaWebhook));
router.post('/meta', asyncHandler(receiveMetaWebhook));

export default router;
