const { consumer, TOPICS, produceMessage } = require('../config/kafka');
const logger = require('../utils/logger');
const config = require('../config');
const { Pool } = require('pg');

class WebhookProcessor {
  constructor() {
    this.pool = new Pool(config.database);
  }

  async start() {
    // Create a separate consumer group for webhooks
    const webhookConsumer = require('../config/kafka').kafka.consumer({ 
      groupId: 'webhook-processor-group' 
    });

    await webhookConsumer.connect();
    await webhookConsumer.subscribe({ 
      topic: TOPICS.WEBHOOK_EVENTS, 
      fromBeginning: false 
    });

    await webhookConsumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const payload = JSON.parse(message.value.toString());
          await this.processWebhookEvent(payload);
        } catch (error) {
          logger.error('Error processing webhook:', error);
        }
      }
    });

    logger.info('Webhook processor started');
  }

  async processWebhookEvent(payload) {
    const { entry } = payload;

    if (!entry || !Array.isArray(entry)) {
      logger.warn('Invalid webhook payload - no entry array');
      return;
    }

    for (const entryItem of entry) {
      const { id: wabaId, changes } = entryItem;

      if (!changes || !Array.isArray(changes)) continue;

      for (const change of changes) {
        const { field, value } = change;

        switch (field) {
          case 'messages':
            await this.processMessagesWebhook(wabaId, value);
            break;
          case 'message_template_status_update':
            await this.processTemplateStatusUpdate(wabaId, value);
            break;
          case 'account_update':
            await this.processAccountUpdate(wabaId, value);
            break;
          case 'phone_number_quality_update':
            await this.processPhoneQualityUpdate(wabaId, value);
            break;
          case 'template_category_update':
            await this.processTemplateCategoryUpdate(wabaId, value);
            break;
          case 'flows':
            await this.processFlowsWebhook(wabaId, value);
            break;
          default:
            logger.warn(`Unknown webhook field: ${field}`);
        }
      }
    }
  }

  async processMessagesWebhook(wabaId, value) {
    const { metadata, contacts, messages, statuses } = value;
    const phoneNumberId = metadata?.phone_number_id;

    // Process incoming messages
    if (messages && Array.isArray(messages)) {
      for (const message of messages) {
        await this.handleIncomingMessage(wabaId, phoneNumberId, message, contacts);
      }
    }

    // Process message status updates
    if (statuses && Array.isArray(statuses)) {
      for (const status of statuses) {
        await this.handleStatusUpdate(wabaId, phoneNumberId, status);
      }
    }
  }

  async handleIncomingMessage(wabaId, phoneNumberId, message, contacts) {
    const {
      id: messageId,
      from,
      timestamp,
      type,
      text,
      image,
      video,
      audio,
      document,
      sticker,
      location,
      contacts: messageContacts,
      interactive,
      button,
      context
    } = message;

    logger.info(`Received ${type} message from ${from}: ${messageId}`);

    // Get contact name
    const contact = contacts?.find(c => c.wa_id === from);
    const contactName = contact?.profile?.name || 'Unknown';

    // Build message content based on type
    let content = null;
    switch (type) {
      case 'text':
        content = { text: text?.body };
        break;
      case 'image':
        content = { 
          mediaId: image?.id, 
          mimeType: image?.mime_type,
          caption: image?.caption 
        };
        break;
      case 'video':
        content = { 
          mediaId: video?.id, 
          mimeType: video?.mime_type,
          caption: video?.caption 
        };
        break;
      case 'audio':
        content = { 
          mediaId: audio?.id, 
          mimeType: audio?.mime_type,
          voice: audio?.voice 
        };
        break;
      case 'document':
        content = { 
          mediaId: document?.id, 
          mimeType: document?.mime_type,
          filename: document?.filename,
          caption: document?.caption 
        };
        break;
      case 'sticker':
        content = { 
          mediaId: sticker?.id, 
          mimeType: sticker?.mime_type,
          animated: sticker?.animated 
        };
        break;
      case 'location':
        content = { 
          latitude: location?.latitude,
          longitude: location?.longitude,
          name: location?.name,
          address: location?.address,
          url: location?.url
        };
        break;
      case 'contacts':
        content = { contacts: messageContacts };
        break;
      case 'interactive':
        content = { 
          type: interactive?.type,
          buttonReply: interactive?.button_reply,
          listReply: interactive?.list_reply 
        };
        break;
      case 'button':
        content = { 
          text: button?.text,
          payload: button?.payload 
        };
        break;
      default:
        content = { raw: message };
    }

    // Save to database
    await this.saveIncomingMessage({
      whatsappMessageId: messageId,
      wabaId,
      phoneNumberId,
      from,
      contactName,
      type,
      content,
      timestamp: new Date(parseInt(timestamp) * 1000),
      contextMessageId: context?.id,
      contextFrom: context?.from
    });

    // Publish for real-time updates (WebSocket, etc.)
    await produceMessage(TOPICS.MESSAGE_STATUS, [{
      key: messageId,
      value: JSON.stringify({
        event: 'incoming_message',
        whatsappMessageId: messageId,
        wabaId,
        phoneNumberId,
        from,
        contactName,
        type,
        content,
        timestamp: Date.now()
      })
    }]);
  }

  async handleStatusUpdate(wabaId, phoneNumberId, status) {
    const {
      id: messageId,
      status: messageStatus,
      timestamp,
      recipient_id,
      conversation,
      pricing,
      errors
    } = status;

    logger.info(`Message ${messageId} status: ${messageStatus}`);

    // Update message status in database
    await this.updateMessageDeliveryStatus({
      whatsappMessageId: messageId,
      status: messageStatus,
      timestamp: new Date(parseInt(timestamp) * 1000),
      recipientId: recipient_id,
      conversationId: conversation?.id,
      conversationOrigin: conversation?.origin?.type,
      conversationExpiration: conversation?.expiration_timestamp,
      pricingCategory: pricing?.category,
      pricingModel: pricing?.pricing_model,
      errors: errors
    });

    // Publish status update
    await produceMessage(TOPICS.MESSAGE_STATUS, [{
      key: messageId,
      value: JSON.stringify({
        event: 'status_update',
        whatsappMessageId: messageId,
        wabaId,
        phoneNumberId,
        status: messageStatus,
        recipientId: recipient_id,
        conversation,
        pricing,
        errors,
        timestamp: Date.now()
      })
    }]);

    // Update campaign analytics if applicable
    const campaignId = await this.getCampaignIdForMessage(messageId);
    if (campaignId) {
      await produceMessage(TOPICS.CAMPAIGN_ANALYTICS, [{
        key: campaignId,
        value: JSON.stringify({
          campaignId,
          event: `message_${messageStatus}`,
          whatsappMessageId: messageId,
          timestamp: Date.now()
        })
      }]);
    }
  }

  async processTemplateStatusUpdate(wabaId, value) {
    const { event, message_template_id, message_template_name, message_template_language, reason } = value;

    logger.info(`Template ${message_template_name} status: ${event}`);

    // Update template status in database
    await this.updateTemplateStatus({
      wabaId,
      templateId: message_template_id,
      templateName: message_template_name,
      language: message_template_language,
      status: event, // APPROVED, REJECTED, PENDING, etc.
      reason
    });
  }

  async processAccountUpdate(wabaId, value) {
    const { event, ban_info, restriction_info, decision, disable_info } = value;

    logger.info(`Account ${wabaId} update: ${event}`);

    // Update account status in database
    await this.updateAccountStatus({
      wabaId,
      event,
      banInfo: ban_info,
      restrictionInfo: restriction_info,
      decision,
      disableInfo: disable_info
    });

    // Send alert for critical account events
    if (['ACCOUNT_BANNED', 'ACCOUNT_RESTRICTED'].includes(event)) {
      // Send notification to admin
      logger.error(`Critical account event: ${event} for WABA ${wabaId}`);
    }
  }

  async processPhoneQualityUpdate(wabaId, value) {
    const { display_phone_number, current_limit, event } = value;

    logger.info(`Phone quality update: ${display_phone_number} - ${event}`);

    // Update phone quality in database
    await this.updatePhoneQuality({
      wabaId,
      phoneNumber: display_phone_number,
      currentLimit: current_limit,
      event // FLAGGED, UNFLAGGED
    });
  }

  async processTemplateCategoryUpdate(wabaId, value) {
    const { message_template_id, message_template_name, previous_category, new_category } = value;

    logger.info(`Template category update: ${message_template_name} from ${previous_category} to ${new_category}`);

    // Update template category in database
    await this.updateTemplateCategory({
      wabaId,
      templateId: message_template_id,
      templateName: message_template_name,
      previousCategory: previous_category,
      newCategory: new_category
    });
  }

  async processFlowsWebhook(wabaId, value) {
    const { event, flow_id, error_type, error_message } = value;

    logger.info(`Flow ${flow_id} event: ${event}`);

    // Handle flow events (DRAFT, PUBLISHED, DEPRECATED, etc.)
    if (event === 'ENDPOINT_ERROR') {
      logger.error(`Flow endpoint error: ${error_message}`);
    }
  }

  // Database methods
  async saveIncomingMessage(data) {
    try {
      const query = `
        INSERT INTO incoming_messages (
          whatsapp_message_id, waba_id, phone_number_id, from_number,
          contact_name, message_type, content, received_at,
          context_message_id, context_from
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (whatsapp_message_id) DO NOTHING
      `;
      
      await this.pool.query(query, [
        data.whatsappMessageId,
        data.wabaId,
        data.phoneNumberId,
        data.from,
        data.contactName,
        data.type,
        JSON.stringify(data.content),
        data.timestamp,
        data.contextMessageId,
        data.contextFrom
      ]);
    } catch (error) {
      logger.error('Failed to save incoming message:', error);
    }
  }

  async updateMessageDeliveryStatus(data) {
    try {
      const query = `
        UPDATE messages 
        SET delivery_status = $1,
            delivered_at = CASE WHEN $1 = 'delivered' THEN $2 ELSE delivered_at END,
            read_at = CASE WHEN $1 = 'read' THEN $2 ELSE read_at END,
            conversation_id = COALESCE($3, conversation_id),
            conversation_origin = COALESCE($4, conversation_origin),
            pricing_category = COALESCE($5, pricing_category),
            error_details = COALESCE($6, error_details),
            updated_at = NOW()
        WHERE whatsapp_message_id = $7
      `;
      
      await this.pool.query(query, [
        data.status,
        data.timestamp,
        data.conversationId,
        data.conversationOrigin,
        data.pricingCategory,
        data.errors ? JSON.stringify(data.errors) : null,
        data.whatsappMessageId
      ]);
    } catch (error) {
      logger.error('Failed to update message delivery status:', error);
    }
  }

  async updateTemplateStatus(data) {
    try {
      const query = `
        UPDATE templates 
        SET status = $1, rejection_reason = $2, updated_at = NOW()
        WHERE waba_id = $3 AND (meta_template_id = $4 OR name = $5)
      `;
      
      await this.pool.query(query, [
        data.status,
        data.reason,
        data.wabaId,
        data.templateId,
        data.templateName
      ]);
    } catch (error) {
      logger.error('Failed to update template status:', error);
    }
  }

  async updateAccountStatus(data) {
    try {
      const query = `
        UPDATE waba_accounts 
        SET account_status = $1, 
            ban_info = COALESCE($2, ban_info),
            restriction_info = COALESCE($3, restriction_info),
            updated_at = NOW()
        WHERE waba_id = $4
      `;
      
      await this.pool.query(query, [
        data.event,
        data.banInfo ? JSON.stringify(data.banInfo) : null,
        data.restrictionInfo ? JSON.stringify(data.restrictionInfo) : null,
        data.wabaId
      ]);
    } catch (error) {
      logger.error('Failed to update account status:', error);
    }
  }

  async updatePhoneQuality(data) {
    try {
      const query = `
        UPDATE phone_numbers 
        SET quality_rating = $1, messaging_limit = $2, updated_at = NOW()
        WHERE waba_id = $3 AND display_phone_number = $4
      `;
      
      await this.pool.query(query, [
        data.event,
        data.currentLimit,
        data.wabaId,
        data.phoneNumber
      ]);
    } catch (error) {
      logger.error('Failed to update phone quality:', error);
    }
  }

  async updateTemplateCategory(data) {
    try {
      const query = `
        UPDATE templates 
        SET category = $1, updated_at = NOW()
        WHERE waba_id = $2 AND meta_template_id = $3
      `;
      
      await this.pool.query(query, [
        data.newCategory,
        data.wabaId,
        data.templateId
      ]);
    } catch (error) {
      logger.error('Failed to update template category:', error);
    }
  }

  async getCampaignIdForMessage(whatsappMessageId) {
    try {
      const query = `
        SELECT campaign_id FROM messages 
        WHERE whatsapp_message_id = $1 AND campaign_id IS NOT NULL
      `;
      const result = await this.pool.query(query, [whatsappMessageId]);
      return result.rows[0]?.campaign_id;
    } catch (error) {
      logger.error('Failed to get campaign ID:', error);
      return null;
    }
  }

  async stop() {
    await this.pool.end();
    logger.info('Webhook processor stopped');
  }
}

module.exports = new WebhookProcessor();
