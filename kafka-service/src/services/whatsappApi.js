const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

class WhatsAppAPI {
  constructor() {
    this.baseUrl = `${config.whatsapp.baseUrl}/${config.whatsapp.apiVersion}`;
  }

  // Send any message type
  async sendMessage(phoneNumberId, accessToken, messagePayload) {
    try {
      const url = `${this.baseUrl}/${phoneNumberId}/messages`;
      
      const response = await axios.post(url, {
        messaging_product: 'whatsapp',
        ...messagePayload
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        messageId: response.data.messages?.[0]?.id,
        data: response.data
      };
    } catch (error) {
      const errorData = error.response?.data?.error || {};
      logger.error('WhatsApp API error:', {
        code: errorData.code,
        message: errorData.message,
        phoneNumberId
      });

      return {
        success: false,
        errorCode: errorData.code,
        errorMessage: errorData.message,
        retryable: this.isRetryableError(errorData.code)
      };
    }
  }

  // Send text message
  async sendTextMessage(phoneNumberId, accessToken, to, text, previewUrl = false) {
    return this.sendMessage(phoneNumberId, accessToken, {
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        preview_url: previewUrl,
        body: text
      }
    });
  }

  // Send template message
  async sendTemplateMessage(phoneNumberId, accessToken, to, templateName, language, components = []) {
    return this.sendMessage(phoneNumberId, accessToken, {
      recipient_type: 'individual',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: language },
        components
      }
    });
  }

  // Send image message
  async sendImageMessage(phoneNumberId, accessToken, to, imageUrl, caption = '') {
    return this.sendMessage(phoneNumberId, accessToken, {
      recipient_type: 'individual',
      to,
      type: 'image',
      image: {
        link: imageUrl,
        caption
      }
    });
  }

  // Send video message
  async sendVideoMessage(phoneNumberId, accessToken, to, videoUrl, caption = '') {
    return this.sendMessage(phoneNumberId, accessToken, {
      recipient_type: 'individual',
      to,
      type: 'video',
      video: {
        link: videoUrl,
        caption
      }
    });
  }

  // Send document message
  async sendDocumentMessage(phoneNumberId, accessToken, to, documentUrl, filename, caption = '') {
    return this.sendMessage(phoneNumberId, accessToken, {
      recipient_type: 'individual',
      to,
      type: 'document',
      document: {
        link: documentUrl,
        filename,
        caption
      }
    });
  }

  // Send interactive buttons
  async sendInteractiveButtons(phoneNumberId, accessToken, to, body, buttons, header = null, footer = null) {
    const interactive = {
      type: 'button',
      body: { text: body },
      action: {
        buttons: buttons.map((btn, index) => ({
          type: 'reply',
          reply: {
            id: btn.id || `btn_${index}`,
            title: btn.title
          }
        }))
      }
    };

    if (header) interactive.header = header;
    if (footer) interactive.footer = { text: footer };

    return this.sendMessage(phoneNumberId, accessToken, {
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive
    });
  }

  // Send interactive list
  async sendInteractiveList(phoneNumberId, accessToken, to, body, buttonText, sections, header = null, footer = null) {
    const interactive = {
      type: 'list',
      body: { text: body },
      action: {
        button: buttonText,
        sections
      }
    };

    if (header) interactive.header = { type: 'text', text: header };
    if (footer) interactive.footer = { text: footer };

    return this.sendMessage(phoneNumberId, accessToken, {
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive
    });
  }

  // Send location
  async sendLocationMessage(phoneNumberId, accessToken, to, latitude, longitude, name = '', address = '') {
    return this.sendMessage(phoneNumberId, accessToken, {
      recipient_type: 'individual',
      to,
      type: 'location',
      location: {
        latitude,
        longitude,
        name,
        address
      }
    });
  }

  // Mark message as read
  async markAsRead(phoneNumberId, accessToken, messageId) {
    try {
      const url = `${this.baseUrl}/${phoneNumberId}/messages`;
      
      await axios.post(url, {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to mark message as read:', error);
      return { success: false };
    }
  }

  // Check if error is retryable
  isRetryableError(errorCode) {
    const retryableCodes = [
      130429, // Rate limit exceeded
      131048, // Spam rate limit
      131056, // Pair rate limit
      500,    // Internal error
      503     // Service unavailable
    ];
    return retryableCodes.includes(errorCode);
  }
}

module.exports = new WhatsAppAPI();
