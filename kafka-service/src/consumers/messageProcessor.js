const { consumer, producer, TOPICS, produceMessage } = require('../config/kafka');
const whatsappApi = require('../services/whatsappApi');
const rateLimiter = require('../utils/rateLimiter');
const logger = require('../utils/logger');
const config = require('../config');
const { MySQLPool } = require('../config/database');

class MessageProcessor {
  constructor() {
    this.pool = new MySQLPool(config.database);
    this.processingQueue = [];
    this.isProcessing = false;
  }

  async start() {
    await rateLimiter.connect();
    
    // Subscribe to message queue topic
    await consumer.subscribe({ 
      topic: TOPICS.MESSAGE_QUEUE, 
      fromBeginning: false 
    });

    // Also subscribe to campaign events
    await consumer.subscribe({ 
      topic: TOPICS.CAMPAIGN_EVENTS, 
      fromBeginning: false 
    });

    // Start consuming messages
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const payload = JSON.parse(message.value.toString());
          
          if (topic === TOPICS.MESSAGE_QUEUE) {
            await this.processMessage(payload);
          } else if (topic === TOPICS.CAMPAIGN_EVENTS) {
            await this.processCampaignEvent(payload);
          }
        } catch (error) {
          logger.error('Error processing message:', error);
          await this.handleProcessingError(message, error);
        }
      }
    });

    logger.info('Message processor started');
  }

  async processMessage(payload) {
    const {
      id,
      phoneNumberId,
      accessToken,
      recipientPhone,
      messageType,
      messageData,
      campaignId,
      attemptNumber = 0
    } = payload;

    logger.info(`Processing message ${id} to ${recipientPhone}`);

    // Check rate limits (non-blocking on Redis errors)
    try {
      const phoneRateLimit = await rateLimiter.canSendMessage(phoneNumberId);
      if (!phoneRateLimit.allowed) {
        logger.warn(`Phone rate limit exceeded for ${phoneNumberId}`);
        await this.requeueMessage(payload, phoneRateLimit.resetAt - Date.now());
        return;
      }

      const pairRateLimit = await rateLimiter.canSendToRecipient(phoneNumberId, recipientPhone);
      if (!pairRateLimit.allowed) {
        logger.warn(`Pair rate limit exceeded for ${recipientPhone}`);
        await this.requeueMessage(payload, pairRateLimit.resetAt - Date.now());
        return;
      }
    } catch (rateLimitErr) {
      logger.warn(`Rate limiter check failed (proceeding anyway): ${rateLimitErr.message}`);
    }

    // Send message based on type
    let result;
    switch (messageType) {
      case 'text':
        result = await whatsappApi.sendTextMessage(
          phoneNumberId,
          accessToken,
          recipientPhone,
          messageData.text,
          messageData.previewUrl
        );
        break;

      case 'template':
        result = await whatsappApi.sendTemplateMessage(
          phoneNumberId,
          accessToken,
          recipientPhone,
          messageData.templateName,
          messageData.language,
          messageData.components
        );
        break;

      case 'image':
        result = await whatsappApi.sendImageMessage(
          phoneNumberId,
          accessToken,
          recipientPhone,
          messageData.imageUrl,
          messageData.caption
        );
        break;

      case 'video':
        result = await whatsappApi.sendVideoMessage(
          phoneNumberId,
          accessToken,
          recipientPhone,
          messageData.videoUrl,
          messageData.caption
        );
        break;

      case 'document':
        result = await whatsappApi.sendDocumentMessage(
          phoneNumberId,
          accessToken,
          recipientPhone,
          messageData.documentUrl,
          messageData.filename,
          messageData.caption
        );
        break;

      case 'interactive_buttons':
        result = await whatsappApi.sendInteractiveButtons(
          phoneNumberId,
          accessToken,
          recipientPhone,
          messageData.body,
          messageData.buttons,
          messageData.header,
          messageData.footer
        );
        break;

      case 'interactive_list':
        result = await whatsappApi.sendInteractiveList(
          phoneNumberId,
          accessToken,
          recipientPhone,
          messageData.body,
          messageData.buttonText,
          messageData.sections,
          messageData.header,
          messageData.footer
        );
        break;

      case 'location':
        result = await whatsappApi.sendLocationMessage(
          phoneNumberId,
          accessToken,
          recipientPhone,
          messageData.latitude,
          messageData.longitude,
          messageData.name,
          messageData.address
        );
        break;

      default:
        logger.error(`Unknown message type: ${messageType}`);
        result = { success: false, errorMessage: 'Unknown message type' };
    }

    // Handle result
    if (result.success) {
      await this.handleSuccess(payload, result);
    } else {
      await this.handleFailure(payload, result, attemptNumber);
    }
  }

  async handleSuccess(payload, result) {
    const { id, campaignId, recipientPhone, phoneNumberId } = payload;

    logger.info(`Message ${id} sent successfully: ${result.messageId}`);

    // Record successful send for rate limiting (non-critical, don't let it block)
    try {
      await rateLimiter.recordSend(
        phoneNumberId,
        recipientPhone,
        result.messageId
      );
    } catch (rateLimitErr) {
      logger.warn(`Rate limiter recordSend failed (non-critical): ${rateLimitErr.message}`);
    }

    // Update campaign_service.campaign_logs if this is a campaign message
    if (campaignId) {
      await this.updateCampaignLog(campaignId, recipientPhone, 'sent', result.messageId, null, {
        whatsappResponse: result.data || null,
        templateName: payload.messageData?.templateName || null,
        phoneNumberId: payload.phoneNumberId || null,
        wabaId: payload.wabaId || null
      });
      await this.incrementCampaignCounter(campaignId, 'sent_count');
    }

    // Save outbound message to kafka_service.messages for webhook correlation
    await this.saveOutboundMessage(payload, result);

    // Create/update chat record for this conversation
    await this.createOrUpdateChat(payload, result);

    // Publish status update
    await produceMessage(TOPICS.MESSAGE_STATUS, [{
      key: id,
      value: JSON.stringify({
        messageId: id,
        whatsappMessageId: result.messageId,
        campaignId,
        recipientPhone,
        status: 'sent',
        timestamp: Date.now()
      })
    }]);

    // Update campaign analytics
    if (campaignId) {
      await produceMessage(TOPICS.CAMPAIGN_ANALYTICS, [{
        key: campaignId.toString(),
        value: JSON.stringify({
          campaignId,
          event: 'message_sent',
          recipientPhone,
          timestamp: Date.now()
        })
      }]);
    }
  }

  async handleFailure(payload, result, attemptNumber) {
    const { id, campaignId, recipientPhone } = payload;
    const maxRetries = config.rateLimit?.retry?.maxRetries || 3;

    logger.error(`Message ${id} failed: ${result.errorMessage}`);

    // Check if retryable
    if (result.retryable && attemptNumber < maxRetries) {
      let delay;
      try {
        delay = rateLimiter.getRetryDelay(attemptNumber);
      } catch (e) {
        delay = Math.min(1000 * Math.pow(2, attemptNumber), 30000);
      }
      logger.info(`Retrying message ${id} in ${delay}ms (attempt ${attemptNumber + 1})`);
      
      await this.requeueMessage({
        ...payload,
        attemptNumber: attemptNumber + 1
      }, delay);
    } else {
      // Mark as permanently failed in campaign logs
      if (campaignId) {
        await this.updateCampaignLog(campaignId, recipientPhone, 'failed', null, result.errorMessage, {
          whatsappResponse: { errorCode: result.errorCode, errorMessage: result.errorMessage },
          templateName: payload.messageData?.templateName || null,
          phoneNumberId: payload.phoneNumberId || null,
          wabaId: payload.wabaId || null
        });
        await this.incrementCampaignCounter(campaignId, 'failed_count');
      }

      // Publish failure status
      await produceMessage(TOPICS.MESSAGE_STATUS, [{
        key: id,
        value: JSON.stringify({
          messageId: id,
          campaignId,
          recipientPhone: payload.recipientPhone,
          status: 'failed',
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
          timestamp: Date.now()
        })
      }]);

      // Send to dead letter queue
      await produceMessage(TOPICS.DEAD_LETTER, [{
        key: id,
        value: JSON.stringify({
          ...payload,
          error: result,
          failedAt: Date.now()
        })
      }]);

      // Update campaign analytics
      if (campaignId) {
        await produceMessage(TOPICS.CAMPAIGN_ANALYTICS, [{
          key: campaignId.toString(),
          value: JSON.stringify({
            campaignId,
            event: 'message_failed',
            recipientPhone: payload.recipientPhone,
            errorCode: result.errorCode,
            timestamp: Date.now()
          })
        }]);
      }
    }
  }

  async requeueMessage(payload, delayMs) {
    // Simple delay using setTimeout for demo
    // In production, use a proper delayed queue mechanism
    setTimeout(async () => {
      await produceMessage(TOPICS.MESSAGE_QUEUE, [{
        key: payload.id,
        value: JSON.stringify(payload)
      }]);
    }, delayMs);
  }

  async processCampaignEvent(payload) {
    const { event, campaignId, data } = payload;

    logger.info(`Processing campaign event: ${event} for campaign ${campaignId}`);

    switch (event) {
      case 'campaign_started':
        await this.processCampaignStart(campaignId, data);
        break;
      case 'campaign_paused':
        await this.processCampaignPause(campaignId);
        break;
      case 'campaign_resumed':
        await this.processCampaignResume(campaignId);
        break;
      case 'campaign_cancelled':
        await this.processCampaignCancel(campaignId);
        break;
      default:
        logger.warn(`Unknown campaign event: ${event}`);
    }
  }

  async processCampaignStart(campaignId, data) {
    const { phoneNumberId, wabaId, accessToken, templateName, language, components, recipients } = data;

    logger.info(`Starting campaign ${campaignId} with ${recipients.length} recipients`);
    logger.info(`Template: ${templateName}, Language: ${language}, Phone: ${phoneNumberId}`);
    logger.info(`Components from campaign: ${JSON.stringify(components)}`);

    // Queue messages for each recipient
    for (const recipient of recipients) {
      const messageId = `${campaignId}_${recipient.phone}_${Date.now()}`;
      
      // Use the pre-built components from the campaign execution (built by the UI).
      // These already contain the correct header/body/button parameters.
      // Optionally substitute contact-specific variable placeholders.
      const messageComponents = this.buildMessageComponents(components, recipient);

      await produceMessage(TOPICS.MESSAGE_QUEUE, [{
        key: messageId,
        value: JSON.stringify({
          id: messageId,
          phoneNumberId,
          wabaId: wabaId || null,
          accessToken,
          recipientPhone: recipient.phone,
          messageType: 'template',
          messageData: {
            templateName,
            language,
            components: messageComponents
          },
          campaignId,
          contactId: recipient.contactId,
          contactName: recipient.name,
          attemptNumber: 0
        })
      }]);
    }

    logger.info(`Queued ${recipients.length} messages for campaign ${campaignId}`);
  }

  /**
   * Build message components for the WhatsApp API.
   * Uses the pre-built components from campaign metadata and optionally
   * substitutes contact-specific variables (like {{name}}, {{phone}}, etc.)
   */
  buildMessageComponents(campaignComponents, recipient) {
    if (campaignComponents && Array.isArray(campaignComponents) && campaignComponents.length > 0) {
      // Deep clone to avoid mutating the original
      const components = JSON.parse(JSON.stringify(campaignComponents));
      
      // Substitute contact variables in body parameters if they contain placeholders
      for (const component of components) {
        if (component.parameters) {
          for (const param of component.parameters) {
            if (param.type === 'text' && typeof param.text === 'string') {
              param.text = this.substituteContactVariables(param.text, recipient);
            }
          }
        }
      }
      
      return components;
    }

    // Fallback: no components needed (template without parameters)
    return [];
  }

  /**
   * Replace contact variable placeholders in text
   */
  substituteContactVariables(text, recipient) {
    if (!text || !recipient) return text;
    
    const vars = recipient.variables || {};
    return text
      .replace(/\{\{name\}\}/gi, vars.name || recipient.name || '')
      .replace(/\{\{first_name\}\}/gi, vars.first_name || '')
      .replace(/\{\{last_name\}\}/gi, vars.last_name || '')
      .replace(/\{\{phone\}\}/gi, vars.phone || recipient.phone || '')
      .replace(/\{\{email\}\}/gi, vars.email || '');
  }

  async processCampaignPause(campaignId) {
    // Store pause flag in Redis
    logger.info(`Campaign ${campaignId} paused`);
  }

  async processCampaignResume(campaignId) {
    logger.info(`Campaign ${campaignId} resumed`);
  }

  async processCampaignCancel(campaignId) {
    // Remove pending messages from queue
    logger.info(`Campaign ${campaignId} cancelled`);
  }

  /**
   * Update campaign_service.campaign_logs table for campaign messages
   */
  async updateCampaignLog(campaignId, phoneNumber, status, messageId = null, errorMessage = null, metadata = {}) {
    try {
      let query, params;
      
      if (status === 'sent') {
        query = `
          UPDATE campaign_service.campaign_logs 
          SET status = ?, message_id = ?, sent_at = NOW(), updated_at = NOW(),
              whatsapp_response = ?,
              template_name = COALESCE(?, template_name),
              phone_number_id = COALESCE(?, phone_number_id),
              waba_id = COALESCE(?, waba_id)
          WHERE campaign_id = ? AND phone_number = ? AND status = 'pending'
          LIMIT 1
        `;
        params = [
          status, messageId,
          metadata.whatsappResponse ? JSON.stringify(metadata.whatsappResponse) : null,
          metadata.templateName || null,
          metadata.phoneNumberId || null,
          metadata.wabaId || null,
          campaignId, phoneNumber
        ];
      } else if (status === 'delivered') {
        query = `
          UPDATE campaign_service.campaign_logs 
          SET status = ?, delivered_at = NOW(), updated_at = NOW()
          WHERE campaign_id = ? AND phone_number = ? AND status IN ('sent', 'pending')
          LIMIT 1
        `;
        params = [status, campaignId, phoneNumber];
      } else if (status === 'read') {
        query = `
          UPDATE campaign_service.campaign_logs 
          SET status = ?, read_at = NOW(), updated_at = NOW()
          WHERE campaign_id = ? AND phone_number = ? AND status IN ('sent', 'delivered')
          LIMIT 1
        `;
        params = [status, campaignId, phoneNumber];
      } else if (status === 'failed') {
        query = `
          UPDATE campaign_service.campaign_logs 
          SET status = ?, error_message = ?, updated_at = NOW(), retry_count = retry_count + 1,
              whatsapp_response = ?,
              template_name = COALESCE(?, template_name),
              phone_number_id = COALESCE(?, phone_number_id),
              waba_id = COALESCE(?, waba_id)
          WHERE campaign_id = ? AND phone_number = ? AND status = 'pending'
          LIMIT 1
        `;
        params = [
          status, errorMessage,
          metadata.whatsappResponse ? JSON.stringify(metadata.whatsappResponse) : null,
          metadata.templateName || null,
          metadata.phoneNumberId || null,
          metadata.wabaId || null,
          campaignId, phoneNumber
        ];
      } else {
        query = `
          UPDATE campaign_service.campaign_logs 
          SET status = ?, updated_at = NOW()
          WHERE campaign_id = ? AND phone_number = ?
          LIMIT 1
        `;
        params = [status, campaignId, phoneNumber];
      }

      await this.pool.query(query, params);
      logger.info(`Updated campaign_log for campaign ${campaignId}, phone ${phoneNumber} to ${status}`);
    } catch (error) {
      logger.error(`Failed to update campaign_log: ${error.message}`);
    }
  }

  /**
   * Increment a counter on the campaign_service.campaigns table
   * and check if the campaign is complete (all messages sent or failed)
   */
  async incrementCampaignCounter(campaignId, field) {
    try {
      const allowedFields = ['sent_count', 'delivered_count', 'read_count', 'failed_count'];
      if (!allowedFields.includes(field)) return;

      await this.pool.query(
        `UPDATE campaign_service.campaigns SET ${field} = ${field} + 1, updated_at = NOW() WHERE id = ?`,
        [campaignId]
      );

      // Check if campaign is complete (all messages either sent or failed)
      if (field === 'sent_count' || field === 'failed_count') {
        await this.checkCampaignCompletion(campaignId);
      }
    } catch (error) {
      logger.error(`Failed to increment ${field} for campaign ${campaignId}: ${error.message}`);
    }
  }

  /**
   * Check if all recipients have been processed and mark campaign as completed
   */
  async checkCampaignCompletion(campaignId) {
    try {
      const result = await this.pool.query(
        `SELECT total_recipients, sent_count, failed_count, status 
         FROM campaign_service.campaigns WHERE id = ?`,
        [campaignId]
      );

      const rows = result.rows;
      if (!rows || rows.length === 0) return;

      const campaign = rows[0];

      // Only check running campaigns
      if (campaign.status !== 'running') return;

      const processed = (campaign.sent_count || 0) + (campaign.failed_count || 0);
      const total = campaign.total_recipients || 0;

      if (total > 0 && processed >= total) {
        await this.pool.query(
          `UPDATE campaign_service.campaigns 
           SET status = 'completed', completed_at = NOW(), updated_at = NOW() 
           WHERE id = ? AND status = 'running'`,
          [campaignId]
        );
        logger.info(`Campaign ${campaignId} completed: ${campaign.sent_count} sent, ${campaign.failed_count} failed out of ${total} total`);
      }
    } catch (error) {
      logger.error(`Failed to check campaign completion for ${campaignId}: ${error.message}`);
    }
  }

  /**
   * Save outbound message to kafka_service.messages for tracking and webhook correlation
   */
  async saveOutboundMessage(payload, result) {
    try {
      const { id, campaignId, phoneNumberId, recipientPhone, messageType, messageData } = payload;
      
      await this.pool.query(
        `INSERT INTO messages (id, campaign_id, organization_id, phone_number_id, recipient_phone, 
         message_type, content, status, whatsapp_message_id, sent_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'sent', ?, NOW(), NOW(), NOW())
         ON DUPLICATE KEY UPDATE status='sent', whatsapp_message_id=?, sent_at=NOW(), updated_at=NOW()`,
        [id, campaignId || null, 'system', phoneNumberId, recipientPhone, 
         messageType, JSON.stringify(messageData), result.messageId, result.messageId]
      );
    } catch (error) {
      logger.error(`Failed to save outbound message: ${error.message}`);
    }
  }

  /**
   * Create or update a chat record when a message is sent
   * Mirrors Laravel's WhatsappService approach of creating Chat + ChatLog records
   */
  async createOrUpdateChat(payload, result) {
    try {
      const { recipientPhone, phoneNumberId, campaignId, messageType, messageData, contactId } = payload;
      const waMessageId = result.messageId;

      // Create/update chat record in whatsapp_service.chats
      await this.pool.query(
        `INSERT INTO whatsapp_service.chats 
         (phone_number, phone_number_id, contact_id, last_message, last_message_type, 
          last_message_at, direction, status, campaign_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, NOW(), 'outbound', 'sent', ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE 
           last_message = VALUES(last_message),
           last_message_type = VALUES(last_message_type),
           last_message_at = NOW(),
           direction = 'outbound',
           status = 'sent',
           updated_at = NOW()`,
        [
          recipientPhone, phoneNumberId, contactId || null,
          messageType === 'template' ? `Template: ${messageData?.templateName || 'N/A'}` : (messageData?.text || 'Message'),
          messageType, campaignId || null
        ]
      );

      // Create chat_log record
      await this.pool.query(
        `INSERT INTO whatsapp_service.chat_logs 
         (phone_number, phone_number_id, whatsapp_message_id, direction, message_type, 
          content, status, campaign_id, created_at)
         VALUES (?, ?, ?, 'outbound', ?, ?, 'sent', ?, NOW())`,
        [
          recipientPhone, phoneNumberId, waMessageId,
          messageType, JSON.stringify(messageData), campaignId || null
        ]
      );
    } catch (error) {
      logger.error(`Failed to create chat record: ${error.message}`);
    }
  }

  async handleProcessingError(message, error) {
    logger.error('Processing error:', error);
    
    // Send to dead letter queue
    await produceMessage(TOPICS.DEAD_LETTER, [{
      key: message.key?.toString() || 'unknown',
      value: JSON.stringify({
        originalMessage: message.value?.toString(),
        error: error.message,
        stack: error.stack,
        timestamp: Date.now()
      })
    }]);
  }

  async stop() {
    await rateLimiter.disconnect();
    await this.pool.end();
    logger.info('Message processor stopped');
  }
}

module.exports = new MessageProcessor();
