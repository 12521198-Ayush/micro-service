const { consumer, producer, TOPICS, produceMessage } = require('../config/kafka');
const whatsappApi = require('../services/whatsappApi');
const rateLimiter = require('../utils/rateLimiter');
const logger = require('../utils/logger');
const config = require('../config');
const { Pool } = require('pg');

class MessageProcessor {
  constructor() {
    this.pool = new Pool(config.database);
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

    // Check rate limits
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
    const { id, campaignId, recipientPhone } = payload;

    logger.info(`Message ${id} sent successfully: ${result.messageId}`);

    // Record successful send
    await rateLimiter.recordSend(
      payload.phoneNumberId,
      recipientPhone,
      result.messageId
    );

    // Update database
    await this.updateMessageStatus(id, 'sent', result.messageId);

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
        key: campaignId,
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
    const { id, campaignId } = payload;
    const maxRetries = config.rateLimit.retry.maxRetries;

    logger.error(`Message ${id} failed: ${result.errorMessage}`);

    // Check if retryable
    if (result.retryable && attemptNumber < maxRetries) {
      const delay = rateLimiter.getRetryDelay(attemptNumber);
      logger.info(`Retrying message ${id} in ${delay}ms (attempt ${attemptNumber + 1})`);
      
      await this.requeueMessage({
        ...payload,
        attemptNumber: attemptNumber + 1
      }, delay);
    } else {
      // Mark as permanently failed
      await this.updateMessageStatus(id, 'failed', null, result.errorCode, result.errorMessage);

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
          key: campaignId,
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
    const { phoneNumberId, accessToken, templateName, language, recipients } = data;

    logger.info(`Starting campaign ${campaignId} with ${recipients.length} recipients`);

    // Queue messages for each recipient
    for (const recipient of recipients) {
      const messageId = `${campaignId}_${recipient.phone}_${Date.now()}`;
      
      await produceMessage(TOPICS.MESSAGE_QUEUE, [{
        key: messageId,
        value: JSON.stringify({
          id: messageId,
          phoneNumberId,
          accessToken,
          recipientPhone: recipient.phone,
          messageType: 'template',
          messageData: {
            templateName,
            language,
            components: this.buildTemplateComponents(recipient.variables)
          },
          campaignId,
          attemptNumber: 0
        })
      }]);
    }

    logger.info(`Queued ${recipients.length} messages for campaign ${campaignId}`);
  }

  buildTemplateComponents(variables) {
    if (!variables || Object.keys(variables).length === 0) {
      return [];
    }

    // Build body component with variables
    const bodyParams = Object.entries(variables).map(([key, value]) => ({
      type: 'text',
      text: value
    }));

    return [{
      type: 'body',
      parameters: bodyParams
    }];
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

  async updateMessageStatus(messageId, status, whatsappMessageId = null, errorCode = null, errorMessage = null) {
    try {
      const query = `
        UPDATE messages 
        SET status = $1, 
            whatsapp_message_id = COALESCE($2, whatsapp_message_id),
            error_code = $3,
            error_message = $4,
            updated_at = NOW()
        WHERE id = $5
      `;
      
      await this.pool.query(query, [status, whatsappMessageId, errorCode, errorMessage, messageId]);
    } catch (error) {
      logger.error('Failed to update message status in database:', error);
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
