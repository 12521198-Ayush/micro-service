import axios from 'axios';
import Message from '../models/Message.js';
import { cache } from '../config/redis.js';
import cacheKeys from '../utils/cacheKeys.js';

// Meta WhatsApp API Configuration
const META_API_CONFIG = {
  baseURL: 'https://graph.facebook.com',
  version: process.env.META_API_VERSION || 'v20.0',
  phoneNumberId: process.env.META_PHONE_NUMBER_ID,
  accessToken: process.env.META_ACCESS_TOKEN,
};

const metaApiClient = axios.create({
  baseURL: `${META_API_CONFIG.baseURL}/${META_API_CONFIG.version}`,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${META_API_CONFIG.accessToken}`,
  },
});

// @desc    Send WhatsApp message
// @route   POST /api/messages/send
// @access  Private
export const sendMessage = async (req, res) => {
  try {
    const { to, type, templateName, templateLanguage, components, text } = req.body;
    const userId = req.user.id || req.user.userId;

    let messagePayload = {
      messaging_product: 'whatsapp',
      to: to,
    };

    if (type === 'template') {
      messagePayload.type = 'template';
      messagePayload.template = {
        name: templateName,
        language: { code: templateLanguage || 'en' },
      };
      if (components) {
        messagePayload.template.components = components;
      }
    } else {
      messagePayload.type = 'text';
      messagePayload.text = { body: text };
    }

    // Send via Meta API
    const response = await metaApiClient.post(
      `/${META_API_CONFIG.phoneNumberId}/messages`,
      messagePayload
    );

    // Save to database
    const message = await Message.create({
      userId,
      phoneNumber: to,
      templateId: templateName || null,
      messageType: type,
      content: messagePayload,
      status: 'sent'
    });

    await Message.updateStatus(message.id, 'sent', response.data.messages[0].id);

    // Invalidate cache
    await cache.deletePattern(cacheKeys.patterns.userMessages(userId));

    res.json({
      success: true,
      message: 'Message sent successfully',
      data: {
        id: message.id,
        metaMessageId: response.data.messages[0].id,
        status: 'sent'
      }
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
};

// @desc    Get message history
// @route   GET /api/messages
// @access  Private
export const getMessages = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { status = '', page = 1, limit = 20 } = req.query;

    // Check cache first
    const cacheKey = cacheKeys.userMessages(userId, page, limit);
    const cachedData = await cache.get(cacheKey);

    if (cachedData && !status) {
      return res.json({
        ...cachedData,
        cached: true
      });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const messages = await Message.findByUserId(userId, {
      status: status || undefined,
      limit: parseInt(limit),
      offset
    });

    const total = await Message.count(userId, status || null);

    const responseData = {
      success: true,
      count: messages.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: messages
    };

    // Cache for 2 minutes
    if (!status) {
      await cache.set(cacheKey, responseData, 120);
    }

    res.json(responseData);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get single message by ID
// @route   GET /api/messages/:id
// @access  Private
export const getMessageById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check cache first
    const cacheKey = cacheKeys.message(id);
    const cachedMessage = await cache.get(cacheKey);

    if (cachedMessage) {
      return res.json({
        success: true,
        data: cachedMessage,
        cached: true
      });
    }

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    // Cache for 10 minutes
    await cache.set(cacheKey, message, 600);

    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Handle WhatsApp webhook
// @route   POST /api/messages/webhook
// @access  Public (verified by Meta)
export const handleWebhook = async (req, res) => {
  try {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
      body.entry?.forEach((entry) => {
        entry.changes?.forEach(async (change) => {
          if (change.field === 'messages') {
            const messages = change.value.messages;
            const statuses = change.value.statuses;

            // Handle status updates
            if (statuses) {
              for (const status of statuses) {
                const metaMessageId = status.id;
                const newStatus = status.status;

                // Update message status in database
                // You'll need to add a method to find by meta_message_id
                // For now, invalidate cache
                await cache.deletePattern('message:*');
              }
            }
          }
        });
      });
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
};

// @desc    Verify webhook (required by Meta)
// @route   GET /api/messages/webhook
// @access  Public
export const verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
      console.log('Webhook verified');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
};

export default {
  sendMessage,
  getMessages,
  getMessageById,
  handleWebhook,
  verifyWebhook
};
