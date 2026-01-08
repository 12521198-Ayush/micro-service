import express from 'express';
import {
  sendMessage,
  getMessages,
  getMessageById,
  handleWebhook,
  verifyWebhook
} from '../controllers/messageController.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

// Webhook routes (no auth)
router.get('/webhook', verifyWebhook);
router.post('/webhook', handleWebhook);

// Protected routes
router.post('/send', authenticateToken, sendMessage);
router.get('/', authenticateToken, getMessages);
router.get('/:id', authenticateToken, getMessageById);

export default router;
