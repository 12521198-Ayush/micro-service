import axios from 'axios';
import Message from '../models/Message.js';
import { cache } from '../config/redis.js';

const META_API_VERSION = process.env.META_API_VERSION || 'v24.0';
const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// Create axios instance for Meta API calls
const createMetaClient = (accessToken) => {
  return axios.create({
    baseURL: META_GRAPH_URL,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    }
  });
};

// Get user's WhatsApp configuration
const getUserWhatsAppConfig = async (userId) => {
  const cacheKey = `whatsapp_config:${userId}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  // This would typically come from user-service/database
  // For now, using environment variables as fallback
  const config = {
    phoneNumberId: process.env.META_PHONE_NUMBER_ID,
    accessToken: process.env.META_ACCESS_TOKEN,
    wabaId: process.env.META_WABA_ID
  };

  await cache.set(cacheKey, config, 3600);
  return config;
};

// ==================== TEXT MESSAGES ====================

/**
 * @desc    Send text message
 * @route   POST /api/whatsapp/messages/text
 * @access  Private
 */
export const sendTextMessage = async (req, res) => {
  try {
    const { to, text, previewUrl = false } = req.body;
    const userId = req.user.id || req.user.userId;
    const config = await getUserWhatsAppConfig(userId);
    const client = createMetaClient(config.accessToken);

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        body: text,
        preview_url: previewUrl
      }
    };

    const response = await client.post(`/${config.phoneNumberId}/messages`, payload);

    // Save to database
    const message = await Message.create({
      userId,
      phoneNumber: to,
      messageType: 'text',
      content: payload,
      status: 'sent',
      whatsappMessageId: response.data.messages[0].id
    });

    res.json({
      success: true,
      data: {
        messageId: message.id,
        whatsappMessageId: response.data.messages[0].id,
        status: 'sent'
      }
    });
  } catch (error) {
    console.error('Send Text Error:', error.response?.data || error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
  }
};

// ==================== TEMPLATE MESSAGES ====================

/**
 * @desc    Send template message
 * @route   POST /api/whatsapp/messages/template
 * @access  Private
 */
export const sendTemplateMessage = async (req, res) => {
  try {
    const { to, templateName, language = 'en', components = [] } = req.body;
    const userId = req.user.id || req.user.userId;
    const config = await getUserWhatsAppConfig(userId);
    const client = createMetaClient(config.accessToken);

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: language }
      }
    };

    if (components.length > 0) {
      payload.template.components = components;
    }

    const response = await client.post(`/${config.phoneNumberId}/messages`, payload);

    const message = await Message.create({
      userId,
      phoneNumber: to,
      templateId: templateName,
      messageType: 'template',
      content: payload,
      status: 'sent',
      whatsappMessageId: response.data.messages[0].id
    });

    res.json({
      success: true,
      data: {
        messageId: message.id,
        whatsappMessageId: response.data.messages[0].id,
        status: 'sent'
      }
    });
  } catch (error) {
    console.error('Send Template Error:', error.response?.data || error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
  }
};

// ==================== MEDIA MESSAGES ====================

/**
 * @desc    Send image message
 * @route   POST /api/whatsapp/messages/image
 * @access  Private
 */
export const sendImageMessage = async (req, res) => {
  try {
    const { to, imageUrl, imageId, caption } = req.body;
    const userId = req.user.id || req.user.userId;
    const config = await getUserWhatsAppConfig(userId);
    const client = createMetaClient(config.accessToken);

    const imagePayload = {};
    if (imageId) {
      imagePayload.id = imageId;
    } else {
      imagePayload.link = imageUrl;
    }
    if (caption) {
      imagePayload.caption = caption;
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'image',
      image: imagePayload
    };

    const response = await client.post(`/${config.phoneNumberId}/messages`, payload);

    const message = await Message.create({
      userId,
      phoneNumber: to,
      messageType: 'image',
      content: payload,
      status: 'sent',
      whatsappMessageId: response.data.messages[0].id
    });

    res.json({
      success: true,
      data: {
        messageId: message.id,
        whatsappMessageId: response.data.messages[0].id,
        status: 'sent'
      }
    });
  } catch (error) {
    console.error('Send Image Error:', error.response?.data || error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
  }
};

/**
 * @desc    Send video message
 * @route   POST /api/whatsapp/messages/video
 * @access  Private
 */
export const sendVideoMessage = async (req, res) => {
  try {
    const { to, videoUrl, videoId, caption } = req.body;
    const userId = req.user.id || req.user.userId;
    const config = await getUserWhatsAppConfig(userId);
    const client = createMetaClient(config.accessToken);

    const videoPayload = {};
    if (videoId) {
      videoPayload.id = videoId;
    } else {
      videoPayload.link = videoUrl;
    }
    if (caption) {
      videoPayload.caption = caption;
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'video',
      video: videoPayload
    };

    const response = await client.post(`/${config.phoneNumberId}/messages`, payload);

    const message = await Message.create({
      userId,
      phoneNumber: to,
      messageType: 'video',
      content: payload,
      status: 'sent',
      whatsappMessageId: response.data.messages[0].id
    });

    res.json({
      success: true,
      data: {
        messageId: message.id,
        whatsappMessageId: response.data.messages[0].id,
        status: 'sent'
      }
    });
  } catch (error) {
    console.error('Send Video Error:', error.response?.data || error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
  }
};

/**
 * @desc    Send audio message
 * @route   POST /api/whatsapp/messages/audio
 * @access  Private
 */
export const sendAudioMessage = async (req, res) => {
  try {
    const { to, audioUrl, audioId } = req.body;
    const userId = req.user.id || req.user.userId;
    const config = await getUserWhatsAppConfig(userId);
    const client = createMetaClient(config.accessToken);

    const audioPayload = {};
    if (audioId) {
      audioPayload.id = audioId;
    } else {
      audioPayload.link = audioUrl;
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'audio',
      audio: audioPayload
    };

    const response = await client.post(`/${config.phoneNumberId}/messages`, payload);

    const message = await Message.create({
      userId,
      phoneNumber: to,
      messageType: 'audio',
      content: payload,
      status: 'sent',
      whatsappMessageId: response.data.messages[0].id
    });

    res.json({
      success: true,
      data: {
        messageId: message.id,
        whatsappMessageId: response.data.messages[0].id,
        status: 'sent'
      }
    });
  } catch (error) {
    console.error('Send Audio Error:', error.response?.data || error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
  }
};

/**
 * @desc    Send document message
 * @route   POST /api/whatsapp/messages/document
 * @access  Private
 */
export const sendDocumentMessage = async (req, res) => {
  try {
    const { to, documentUrl, documentId, filename, caption } = req.body;
    const userId = req.user.id || req.user.userId;
    const config = await getUserWhatsAppConfig(userId);
    const client = createMetaClient(config.accessToken);

    const documentPayload = {};
    if (documentId) {
      documentPayload.id = documentId;
    } else {
      documentPayload.link = documentUrl;
    }
    if (filename) {
      documentPayload.filename = filename;
    }
    if (caption) {
      documentPayload.caption = caption;
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'document',
      document: documentPayload
    };

    const response = await client.post(`/${config.phoneNumberId}/messages`, payload);

    const message = await Message.create({
      userId,
      phoneNumber: to,
      messageType: 'document',
      content: payload,
      status: 'sent',
      whatsappMessageId: response.data.messages[0].id
    });

    res.json({
      success: true,
      data: {
        messageId: message.id,
        whatsappMessageId: response.data.messages[0].id,
        status: 'sent'
      }
    });
  } catch (error) {
    console.error('Send Document Error:', error.response?.data || error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
  }
};

/**
 * @desc    Send sticker message
 * @route   POST /api/whatsapp/messages/sticker
 * @access  Private
 */
export const sendStickerMessage = async (req, res) => {
  try {
    const { to, stickerUrl, stickerId } = req.body;
    const userId = req.user.id || req.user.userId;
    const config = await getUserWhatsAppConfig(userId);
    const client = createMetaClient(config.accessToken);

    const stickerPayload = {};
    if (stickerId) {
      stickerPayload.id = stickerId;
    } else {
      stickerPayload.link = stickerUrl;
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'sticker',
      sticker: stickerPayload
    };

    const response = await client.post(`/${config.phoneNumberId}/messages`, payload);

    const message = await Message.create({
      userId,
      phoneNumber: to,
      messageType: 'sticker',
      content: payload,
      status: 'sent',
      whatsappMessageId: response.data.messages[0].id
    });

    res.json({
      success: true,
      data: {
        messageId: message.id,
        whatsappMessageId: response.data.messages[0].id,
        status: 'sent'
      }
    });
  } catch (error) {
    console.error('Send Sticker Error:', error.response?.data || error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
  }
};

// ==================== LOCATION MESSAGE ====================

/**
 * @desc    Send location message
 * @route   POST /api/whatsapp/messages/location
 * @access  Private
 */
export const sendLocationMessage = async (req, res) => {
  try {
    const { to, latitude, longitude, name, address } = req.body;
    const userId = req.user.id || req.user.userId;
    const config = await getUserWhatsAppConfig(userId);
    const client = createMetaClient(config.accessToken);

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'location',
      location: {
        latitude,
        longitude,
        name,
        address
      }
    };

    const response = await client.post(`/${config.phoneNumberId}/messages`, payload);

    const message = await Message.create({
      userId,
      phoneNumber: to,
      messageType: 'location',
      content: payload,
      status: 'sent',
      whatsappMessageId: response.data.messages[0].id
    });

    res.json({
      success: true,
      data: {
        messageId: message.id,
        whatsappMessageId: response.data.messages[0].id,
        status: 'sent'
      }
    });
  } catch (error) {
    console.error('Send Location Error:', error.response?.data || error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
  }
};

// ==================== CONTACT MESSAGE ====================

/**
 * @desc    Send contact card message
 * @route   POST /api/whatsapp/messages/contact
 * @access  Private
 */
export const sendContactMessage = async (req, res) => {
  try {
    const { to, contacts } = req.body;
    const userId = req.user.id || req.user.userId;
    const config = await getUserWhatsAppConfig(userId);
    const client = createMetaClient(config.accessToken);

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'contacts',
      contacts
    };

    const response = await client.post(`/${config.phoneNumberId}/messages`, payload);

    const message = await Message.create({
      userId,
      phoneNumber: to,
      messageType: 'contacts',
      content: payload,
      status: 'sent',
      whatsappMessageId: response.data.messages[0].id
    });

    res.json({
      success: true,
      data: {
        messageId: message.id,
        whatsappMessageId: response.data.messages[0].id,
        status: 'sent'
      }
    });
  } catch (error) {
    console.error('Send Contact Error:', error.response?.data || error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
  }
};

// ==================== INTERACTIVE MESSAGES ====================

/**
 * @desc    Send interactive button message
 * @route   POST /api/whatsapp/messages/interactive/buttons
 * @access  Private
 */
export const sendInteractiveButtons = async (req, res) => {
  try {
    const { to, body, buttons, header, footer } = req.body;
    const userId = req.user.id || req.user.userId;
    const config = await getUserWhatsAppConfig(userId);
    const client = createMetaClient(config.accessToken);

    const interactive = {
      type: 'button',
      body: { text: body },
      action: {
        buttons: buttons.map((btn, idx) => ({
          type: 'reply',
          reply: {
            id: btn.id || `btn_${idx}`,
            title: btn.title
          }
        }))
      }
    };

    if (header) {
      interactive.header = header;
    }
    if (footer) {
      interactive.footer = { text: footer };
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive
    };

    const response = await client.post(`/${config.phoneNumberId}/messages`, payload);

    const message = await Message.create({
      userId,
      phoneNumber: to,
      messageType: 'interactive_buttons',
      content: payload,
      status: 'sent',
      whatsappMessageId: response.data.messages[0].id
    });

    res.json({
      success: true,
      data: {
        messageId: message.id,
        whatsappMessageId: response.data.messages[0].id,
        status: 'sent'
      }
    });
  } catch (error) {
    console.error('Send Interactive Buttons Error:', error.response?.data || error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
  }
};

/**
 * @desc    Send interactive list message
 * @route   POST /api/whatsapp/messages/interactive/list
 * @access  Private
 */
export const sendInteractiveList = async (req, res) => {
  try {
    const { to, body, buttonText, sections, header, footer } = req.body;
    const userId = req.user.id || req.user.userId;
    const config = await getUserWhatsAppConfig(userId);
    const client = createMetaClient(config.accessToken);

    const interactive = {
      type: 'list',
      body: { text: body },
      action: {
        button: buttonText,
        sections
      }
    };

    if (header) {
      interactive.header = { type: 'text', text: header };
    }
    if (footer) {
      interactive.footer = { text: footer };
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive
    };

    const response = await client.post(`/${config.phoneNumberId}/messages`, payload);

    const message = await Message.create({
      userId,
      phoneNumber: to,
      messageType: 'interactive_list',
      content: payload,
      status: 'sent',
      whatsappMessageId: response.data.messages[0].id
    });

    res.json({
      success: true,
      data: {
        messageId: message.id,
        whatsappMessageId: response.data.messages[0].id,
        status: 'sent'
      }
    });
  } catch (error) {
    console.error('Send Interactive List Error:', error.response?.data || error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
  }
};

/**
 * @desc    Send CTA URL button message
 * @route   POST /api/whatsapp/messages/interactive/cta-url
 * @access  Private
 */
export const sendCtaUrlButton = async (req, res) => {
  try {
    const { to, body, displayText, url, header, footer } = req.body;
    const userId = req.user.id || req.user.userId;
    const config = await getUserWhatsAppConfig(userId);
    const client = createMetaClient(config.accessToken);

    const interactive = {
      type: 'cta_url',
      body: { text: body },
      action: {
        name: 'cta_url',
        parameters: {
          display_text: displayText,
          url
        }
      }
    };

    if (header) {
      interactive.header = header;
    }
    if (footer) {
      interactive.footer = { text: footer };
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive
    };

    const response = await client.post(`/${config.phoneNumberId}/messages`, payload);

    const message = await Message.create({
      userId,
      phoneNumber: to,
      messageType: 'interactive_cta_url',
      content: payload,
      status: 'sent',
      whatsappMessageId: response.data.messages[0].id
    });

    res.json({
      success: true,
      data: {
        messageId: message.id,
        whatsappMessageId: response.data.messages[0].id,
        status: 'sent'
      }
    });
  } catch (error) {
    console.error('Send CTA URL Error:', error.response?.data || error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
  }
};

/**
 * @desc    Send location request message
 * @route   POST /api/whatsapp/messages/interactive/location-request
 * @access  Private
 */
export const sendLocationRequest = async (req, res) => {
  try {
    const { to, body } = req.body;
    const userId = req.user.id || req.user.userId;
    const config = await getUserWhatsAppConfig(userId);
    const client = createMetaClient(config.accessToken);

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'location_request_message',
        body: { text: body },
        action: {
          name: 'send_location'
        }
      }
    };

    const response = await client.post(`/${config.phoneNumberId}/messages`, payload);

    const message = await Message.create({
      userId,
      phoneNumber: to,
      messageType: 'location_request',
      content: payload,
      status: 'sent',
      whatsappMessageId: response.data.messages[0].id
    });

    res.json({
      success: true,
      data: {
        messageId: message.id,
        whatsappMessageId: response.data.messages[0].id,
        status: 'sent'
      }
    });
  } catch (error) {
    console.error('Send Location Request Error:', error.response?.data || error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
  }
};

/**
 * @desc    Send WhatsApp Flow message
 * @route   POST /api/whatsapp/messages/interactive/flow
 * @access  Private
 */
export const sendFlowMessage = async (req, res) => {
  try {
    const { to, body, flowId, flowToken, flowCta, flowAction = 'navigate', screenId, flowData, header, footer } = req.body;
    const userId = req.user.id || req.user.userId;
    const config = await getUserWhatsAppConfig(userId);
    const client = createMetaClient(config.accessToken);

    const flowActionPayload = {
      name: 'flow',
      parameters: {
        flow_message_version: '3',
        flow_id: flowId,
        flow_token: flowToken,
        flow_cta: flowCta,
        flow_action: flowAction
      }
    };

    if (flowAction === 'navigate' && screenId) {
      flowActionPayload.parameters.flow_action_payload = {
        screen: screenId,
        data: flowData || {}
      };
    }

    const interactive = {
      type: 'flow',
      body: { text: body },
      action: flowActionPayload
    };

    if (header) {
      interactive.header = { type: 'text', text: header };
    }
    if (footer) {
      interactive.footer = { text: footer };
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive
    };

    const response = await client.post(`/${config.phoneNumberId}/messages`, payload);

    const message = await Message.create({
      userId,
      phoneNumber: to,
      messageType: 'interactive_flow',
      content: payload,
      status: 'sent',
      whatsappMessageId: response.data.messages[0].id
    });

    res.json({
      success: true,
      data: {
        messageId: message.id,
        whatsappMessageId: response.data.messages[0].id,
        status: 'sent'
      }
    });
  } catch (error) {
    console.error('Send Flow Error:', error.response?.data || error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
  }
};

// ==================== REACTION MESSAGE ====================

/**
 * @desc    Send reaction to a message
 * @route   POST /api/whatsapp/messages/reaction
 * @access  Private
 */
export const sendReaction = async (req, res) => {
  try {
    const { to, messageId: targetMessageId, emoji } = req.body;
    const userId = req.user.id || req.user.userId;
    const config = await getUserWhatsAppConfig(userId);
    const client = createMetaClient(config.accessToken);

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'reaction',
      reaction: {
        message_id: targetMessageId,
        emoji
      }
    };

    const response = await client.post(`/${config.phoneNumberId}/messages`, payload);

    res.json({
      success: true,
      data: {
        whatsappMessageId: response.data.messages[0].id,
        status: 'sent'
      }
    });
  } catch (error) {
    console.error('Send Reaction Error:', error.response?.data || error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
  }
};

// ==================== MESSAGE STATUS ====================

/**
 * @desc    Mark message as read
 * @route   POST /api/whatsapp/messages/mark-read
 * @access  Private
 */
export const markAsRead = async (req, res) => {
  try {
    const { messageId: targetMessageId } = req.body;
    const userId = req.user.id || req.user.userId;
    const config = await getUserWhatsAppConfig(userId);
    const client = createMetaClient(config.accessToken);

    const payload = {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: targetMessageId
    };

    await client.post(`/${config.phoneNumberId}/messages`, payload);

    res.json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    console.error('Mark Read Error:', error.response?.data || error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
  }
};

export default {
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
};
