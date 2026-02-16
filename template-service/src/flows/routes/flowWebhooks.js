import express from 'express';
import asyncHandler from '../../middleware/asyncHandler.js';
import verifyFlowWebhookSecret from '../middlewares/flowWebhookAuth.js';
import { receiveFlowSubmissionWebhook } from '../controllers/flowWebhookController.js';

const router = express.Router();

router.post('/flows', verifyFlowWebhookSecret, asyncHandler(receiveFlowSubmissionWebhook));

export default router;
