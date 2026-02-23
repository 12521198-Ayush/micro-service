import express from 'express';
import asyncHandler from '../../middleware/asyncHandler.js';
import verifyToken from '../../middleware/auth.js';
import {
  clearWebhookTestEvents,
  listWebhookTestEvents,
  receiveWebhookTestEvent,
} from '../controllers/webhookTestController.js';

const router = express.Router();

router.post('/testing/receiver', asyncHandler(receiveWebhookTestEvent));
router.get('/testing/events', verifyToken, asyncHandler(listWebhookTestEvents));
router.delete('/testing/events', verifyToken, asyncHandler(clearWebhookTestEvents));

export default router;
