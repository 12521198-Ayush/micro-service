import express from 'express';
import authenticateToken from '../middleware/auth.js';
import { attachWabaConfig } from '../middleware/wabaConfig.js';

// Message Controllers
import {
  sendTextMessage,
  sendTemplateMessage,
  sendImageMessage,
  sendVideoMessage,
  sendAudioMessage,
  sendDocumentMessage,
  sendStickerMessage,
  sendLocationMessage,
  sendContactMessage,
  sendInteractiveButtons,
  sendInteractiveList,
  sendCtaUrlButton,
  sendLocationRequest,
  sendFlowMessage,
  sendReaction,
  markAsRead
} from '../controllers/allMessageTypesController.js';

// Webhook Controller
import {
  verifyWebhook,
  receiveWebhook,
  getWebhookStatus
} from '../controllers/webhookController.js';

// Media Controller
import {
  uploadMedia,
  getMediaUrl,
  downloadMedia,
  deleteMedia
} from '../controllers/mediaController.js';

// Phone Number Controller
import {
  getPhoneNumberInfo,
  getPhoneNumbers,
  requestVerificationCode,
  verifyCode,
  registerPhoneNumber,
  deregisterPhoneNumber,
  setTwoStepPin,
  getBusinessProfile,
  updateBusinessProfile,
  getCommerceSettings,
  updateCommerceSettings
} from '../controllers/phoneNumberController.js';

// Original Message Controller (for backwards compatibility)
import {
  sendMessage,
  getMessages,
  getMessageById
} from '../controllers/messageController.js';

const router = express.Router();

// ==================== WEBHOOK ROUTES (Public) ====================
router.get('/webhook', verifyWebhook);
router.post('/webhook', express.raw({ type: 'application/json' }), receiveWebhook);

// ==================== PROTECTED ROUTES ====================
// All routes below require authentication
router.use(authenticateToken);
router.use(attachWabaConfig);

// ==================== MESSAGE ROUTES ====================

// Text Messages
router.post('/messages/text', sendTextMessage);

// Template Messages
router.post('/messages/template', sendTemplateMessage);

// Media Messages
router.post('/messages/image', sendImageMessage);
router.post('/messages/video', sendVideoMessage);
router.post('/messages/audio', sendAudioMessage);
router.post('/messages/document', sendDocumentMessage);
router.post('/messages/sticker', sendStickerMessage);

// Location Messages
router.post('/messages/location', sendLocationMessage);

// Contact Messages
router.post('/messages/contact', sendContactMessage);

// Interactive Messages
router.post('/messages/interactive/buttons', sendInteractiveButtons);
router.post('/messages/interactive/list', sendInteractiveList);
router.post('/messages/interactive/cta-url', sendCtaUrlButton);
router.post('/messages/interactive/location-request', sendLocationRequest);
router.post('/messages/interactive/flow', sendFlowMessage);

// Reactions
router.post('/messages/reaction', sendReaction);

// Message Status
router.post('/messages/mark-read', markAsRead);

// Legacy/General message endpoints
router.post('/messages/send', sendMessage);
router.get('/messages', getMessages);
router.get('/messages/:id', getMessageById);

// ==================== MEDIA ROUTES ====================
router.post('/media/upload', uploadMedia);
router.get('/media/:mediaId', getMediaUrl);
router.get('/media/:mediaId/download', downloadMedia);
router.delete('/media/:mediaId', deleteMedia);

// ==================== PHONE NUMBER ROUTES ====================
router.get('/phone-numbers', getPhoneNumbers);
router.get('/phone-numbers/:phoneNumberId', getPhoneNumberInfo);
router.post('/phone-numbers/:phoneNumberId/request-code', requestVerificationCode);
router.post('/phone-numbers/:phoneNumberId/verify-code', verifyCode);
router.post('/phone-numbers/:phoneNumberId/register', registerPhoneNumber);
router.post('/phone-numbers/:phoneNumberId/deregister', deregisterPhoneNumber);
router.post('/phone-numbers/:phoneNumberId/set-pin', setTwoStepPin);
router.get('/phone-numbers/:phoneNumberId/profile', getBusinessProfile);
router.put('/phone-numbers/:phoneNumberId/profile', updateBusinessProfile);
router.get('/phone-numbers/:phoneNumberId/commerce', getCommerceSettings);
router.put('/phone-numbers/:phoneNumberId/commerce', updateCommerceSettings);

// ==================== WEBHOOK STATUS ====================
router.get('/webhook/status', getWebhookStatus);

export default router;
