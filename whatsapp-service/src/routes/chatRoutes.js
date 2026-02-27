import express from 'express';
import authenticateToken from '../middleware/auth.js';
import { attachWabaConfig } from '../middleware/wabaConfig.js';
import {
  listChats,
  getChatMessages,
  getChatDetail,
  sendChatMessage,
  markChatAsRead,
  closeChat,
  getChatStats
} from '../controllers/chatController.js';

const router = express.Router();

// All chat routes require authentication
router.use(authenticateToken);

// Stats must come before :phoneNumber routes to avoid matching
router.get('/stats', getChatStats);

// List all chats (inbox)
router.get('/', listChats);

// Get chat detail
router.get('/:phoneNumber', getChatDetail);

// Get messages for a chat
router.get('/:phoneNumber/messages', getChatMessages);

// Send a message (requires WABA config)
router.post('/:phoneNumber/send', attachWabaConfig, sendChatMessage);

// Mark chat as read
router.post('/:phoneNumber/read', markChatAsRead);

// Close/archive chat
router.post('/:phoneNumber/close', closeChat);

export default router;
