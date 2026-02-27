const { consumer, TOPICS, produceMessage } = require('../config/kafka');
const logger = require('../utils/logger');
const config = require('../config');
const { MySQLPool } = require('../config/database');

class WebhookProcessor {
  constructor() {
    this.pool = new MySQLPool(config.database);
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

    // Log the raw webhook event for debugging
    try {
      await this.pool.query(
        `INSERT INTO webhook_events_log (event_type, waba_id, payload, created_at) VALUES (?, ?, ?, NOW())`,
        ['webhook', entry[0]?.id || 'unknown', JSON.stringify(payload)]
      );
    } catch (e) {
      // Non-critical, don't fail on logging
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
          default:
            logger.warn(`Unknown webhook field: ${field}`);
        }
      }
    }
  }

  // ===================== MESSAGE WEBHOOKS =====================

  async processMessagesWebhook(wabaId, value) {
    const { metadata, contacts, messages, statuses } = value;
    const phoneNumberId = metadata?.phone_number_id;

    // Process incoming messages
    if (messages && Array.isArray(messages)) {
      for (const message of messages) {
        await this.handleIncomingMessage(wabaId, phoneNumberId, message, contacts);
      }
    }

    // Process message status updates (sent, delivered, read, failed)
    if (statuses && Array.isArray(statuses)) {
      for (const status of statuses) {
        await this.handleStatusUpdate(wabaId, phoneNumberId, status);
      }
    }
  }

  /**
   * Handle an incoming WhatsApp message.
   * Creates/updates a chat record and chat_log entry.
   * (Mirrors Laravel's WebhookController::handlePostRequest for incoming messages)
   */
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
      document: doc,
      sticker,
      location,
      contacts: messageContacts,
      interactive,
      button,
      context
    } = message;

    logger.info(`Received ${type} message from ${from}: ${messageId}`);

    // Get contact name from webhook payload
    const contact = contacts?.find(c => c.wa_id === from);
    const contactName = contact?.profile?.name || 'Unknown';

    // Build message content based on type
    let content = null;
    let displayMessage = '';
    
    switch (type) {
      case 'text':
        content = { text: text?.body };
        displayMessage = text?.body || '';
        break;
      case 'image':
        content = { mediaId: image?.id, mimeType: image?.mime_type, caption: image?.caption };
        displayMessage = image?.caption || '📷 Image';
        break;
      case 'video':
        content = { mediaId: video?.id, mimeType: video?.mime_type, caption: video?.caption };
        displayMessage = video?.caption || '🎥 Video';
        break;
      case 'audio':
        content = { mediaId: audio?.id, mimeType: audio?.mime_type, voice: audio?.voice };
        displayMessage = audio?.voice ? '🎤 Voice note' : '🎵 Audio';
        break;
      case 'document':
        content = { mediaId: doc?.id, mimeType: doc?.mime_type, filename: doc?.filename, caption: doc?.caption };
        displayMessage = `📄 ${doc?.filename || 'Document'}`;
        break;
      case 'sticker':
        content = { mediaId: sticker?.id, mimeType: sticker?.mime_type, animated: sticker?.animated };
        displayMessage = '🏷️ Sticker';
        break;
      case 'location':
        content = { latitude: location?.latitude, longitude: location?.longitude, name: location?.name, address: location?.address };
        displayMessage = `📍 ${location?.name || 'Location'}`;
        break;
      case 'contacts':
        content = { contacts: messageContacts };
        displayMessage = '👤 Contact';
        break;
      case 'interactive':
        content = { type: interactive?.type, buttonReply: interactive?.button_reply, listReply: interactive?.list_reply };
        displayMessage = interactive?.button_reply?.title || interactive?.list_reply?.title || 'Interactive';
        break;
      case 'button':
        content = { text: button?.text, payload: button?.payload };
        displayMessage = button?.text || 'Button';
        break;
      case 'reaction':
        content = { emoji: message.reaction?.emoji, reactedMessageId: message.reaction?.message_id };
        displayMessage = message.reaction?.emoji || '👍';
        break;
      default:
        content = { raw: message };
        displayMessage = `${type} message`;
    }

    const receivedAt = new Date(parseInt(timestamp) * 1000);

    // 1. Create or update chat record in whatsapp_service.chats
    try {
      await this.pool.query(
        `INSERT INTO whatsapp_service.chats 
         (phone_number, phone_number_id, contact_name, last_message, last_message_type, 
          last_message_at, direction, status, unread_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'inbound', 'received', 1, NOW(), NOW())
         ON DUPLICATE KEY UPDATE 
           contact_name = COALESCE(VALUES(contact_name), contact_name),
           last_message = VALUES(last_message),
           last_message_type = VALUES(last_message_type),
           last_message_at = VALUES(last_message_at),
           direction = 'inbound',
           status = 'received',
           unread_count = unread_count + 1,
           updated_at = NOW()`,
        [from, phoneNumberId, contactName, displayMessage.substring(0, 500), type, receivedAt]
      );
    } catch (error) {
      logger.error(`Failed to upsert chat for ${from}: ${error.message}`);
    }

    // 2. Create chat_log entry
    try {
      await this.pool.query(
        `INSERT INTO whatsapp_service.chat_logs 
         (phone_number, phone_number_id, whatsapp_message_id, direction, message_type, 
          content, status, context_message_id, created_at)
         VALUES (?, ?, ?, 'inbound', ?, ?, 'received', ?, ?)`,
        [from, phoneNumberId, messageId, type, JSON.stringify(content), context?.id || null, receivedAt]
      );
    } catch (error) {
      logger.error(`Failed to create chat_log for ${messageId}: ${error.message}`);
    }

    // 3. Save media info if applicable
    if (['image', 'video', 'audio', 'document', 'sticker'].includes(type) && content?.mediaId) {
      try {
        await this.pool.query(
          `INSERT INTO whatsapp_service.chat_media 
           (whatsapp_message_id, media_type, media_id, mime_type, caption, created_at)
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [messageId, type, content.mediaId, content.mimeType || null, content.caption || null]
        );
      } catch (error) {
        logger.error(`Failed to save chat_media for ${messageId}: ${error.message}`);
      }
    }

    // 4. Also save to kafka_service.incoming_messages for backward compatibility
    try {
      await this.pool.query(
        `INSERT IGNORE INTO incoming_messages 
         (whatsapp_message_id, waba_id, phone_number_id, from_number, contact_name, 
          message_type, content, context_message_id, context_from, received_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [messageId, wabaId, phoneNumberId, from, contactName, type, 
         JSON.stringify(content), context?.id || null, context?.from || null, receivedAt]
      );
    } catch (error) {
      logger.error(`Failed to save incoming_message: ${error.message}`);
    }

    // 5. Publish for real-time updates (to be consumed by Socket.IO)
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
        displayMessage,
        timestamp: receivedAt.toISOString()
      })
    }]);
  }

  /**
   * Handle message status updates (sent, delivered, read, failed).
   * Updates chat status, campaign logs, and messages table.
   * (Mirrors Laravel's WebhookController status update handling)
   */
  async handleStatusUpdate(wabaId, phoneNumberId, status) {
    const {
      id: whatsappMessageId,
      status: messageStatus,
      timestamp,
      recipient_id,
      conversation,
      pricing,
      errors
    } = status;

    logger.info(`Status update: ${whatsappMessageId} → ${messageStatus} (recipient: ${recipient_id})`);

    const statusTime = new Date(parseInt(timestamp) * 1000);

    // 1. Log the status change in whatsapp_service.chat_status_logs
    try {
      await this.pool.query(
        `INSERT INTO whatsapp_service.chat_status_logs 
         (whatsapp_message_id, status, timestamp, error_code, error_message, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [
          whatsappMessageId, messageStatus, statusTime,
          errors?.[0]?.code || null, errors?.[0]?.title || null
        ]
      );
    } catch (error) {
      logger.error(`Failed to log status change: ${error.message}`);
    }

    // 2. Update the chat_log entry status
    try {
      await this.pool.query(
        `UPDATE whatsapp_service.chat_logs 
         SET status = ?
         WHERE whatsapp_message_id = ?`,
        [messageStatus, whatsappMessageId]
      );
    } catch (error) {
      logger.error(`Failed to update chat_log status: ${error.message}`);
    }

    // 3. Update the chat record status (only for outbound messages)
    if (recipient_id) {
      try {
        await this.pool.query(
          `UPDATE whatsapp_service.chats 
           SET status = ?, updated_at = NOW()
           WHERE phone_number = ? AND phone_number_id = ? AND direction = 'outbound'`,
          [messageStatus, recipient_id, phoneNumberId]
        );
      } catch (error) {
        logger.error(`Failed to update chat status: ${error.message}`);
      }
    }

    // 4. Update kafka_service.messages table
    try {
      let updateFields = 'delivery_status = ?, updated_at = NOW()';
      let params = [messageStatus];

      if (messageStatus === 'delivered') {
        updateFields += ', delivered_at = ?';
        params.push(statusTime);
      } else if (messageStatus === 'read') {
        updateFields += ', read_at = ?';
        params.push(statusTime);
      } else if (messageStatus === 'failed') {
        updateFields += ', error_code = ?, error_message = ?';
        params.push(errors?.[0]?.code || null, errors?.[0]?.title || null);
      }

      if (conversation?.id) {
        updateFields += ', conversation_id = ?, conversation_origin = ?';
        params.push(conversation.id, conversation.origin?.type || null);
      }
      if (pricing?.category) {
        updateFields += ', pricing_category = ?';
        params.push(pricing.category);
      }

      params.push(whatsappMessageId);

      await this.pool.query(
        `UPDATE messages SET ${updateFields} WHERE whatsapp_message_id = ?`,
        params
      );
    } catch (error) {
      logger.error(`Failed to update message delivery status: ${error.message}`);
    }

    // 5. Update campaign_service.campaign_logs if this is a campaign message
    try {
      const result = await this.pool.query(
        `SELECT campaign_id, recipient_phone FROM messages WHERE whatsapp_message_id = ? AND campaign_id IS NOT NULL`,
        [whatsappMessageId]
      );
      const rows = result.rows;

      if (rows && rows.length > 0) {
        const { campaign_id: campaignId, recipient_phone: recipientPhone } = rows[0];
        
        if (messageStatus === 'delivered') {
          await this.pool.query(
            `UPDATE campaign_service.campaign_logs SET status = 'delivered', delivered_at = NOW(), updated_at = NOW()
             WHERE campaign_id = ? AND phone_number = ? AND status IN ('sent', 'pending') LIMIT 1`,
            [campaignId, recipientPhone]
          );
          await this.pool.query(
            `UPDATE campaign_service.campaigns SET delivered_count = delivered_count + 1, updated_at = NOW() WHERE id = ?`,
            [campaignId]
          );
        } else if (messageStatus === 'read') {
          await this.pool.query(
            `UPDATE campaign_service.campaign_logs SET status = 'read', read_at = NOW(), updated_at = NOW()
             WHERE campaign_id = ? AND phone_number = ? AND status IN ('sent', 'delivered') LIMIT 1`,
            [campaignId, recipientPhone]
          );
          await this.pool.query(
            `UPDATE campaign_service.campaigns SET read_count = read_count + 1, updated_at = NOW() WHERE id = ?`,
            [campaignId]
          );
        } else if (messageStatus === 'failed') {
          await this.pool.query(
            `UPDATE campaign_service.campaign_logs SET status = 'failed', error_message = ?, updated_at = NOW()
             WHERE campaign_id = ? AND phone_number = ? AND status IN ('sent', 'pending') LIMIT 1`,
            [errors?.[0]?.title || 'Unknown error', campaignId, recipientPhone]
          );
          await this.pool.query(
            `UPDATE campaign_service.campaigns SET failed_count = failed_count + 1, updated_at = NOW() WHERE id = ?`,
            [campaignId]
          );
        }

        // Check if campaign is complete (all messages have final status)
        await this.checkCampaignCompletion(campaignId);

        // Update campaign analytics
        await produceMessage(TOPICS.CAMPAIGN_ANALYTICS, [{
          key: campaignId.toString(),
          value: JSON.stringify({
            campaignId,
            event: `message_${messageStatus}`,
            whatsappMessageId,
            timestamp: Date.now()
          })
        }]);
      }
    } catch (error) {
      logger.error(`Failed to update campaign for status ${messageStatus}: ${error.message}`);
    }

    // 6. Publish for real-time updates
    await produceMessage(TOPICS.MESSAGE_STATUS, [{
      key: whatsappMessageId,
      value: JSON.stringify({
        event: 'status_update',
        whatsappMessageId,
        wabaId,
        phoneNumberId,
        status: messageStatus,
        recipientId: recipient_id,
        conversation,
        pricing,
        errors: errors || null,
        timestamp: statusTime.toISOString()
      })
    }]);
  }

  /**
   * Check if all messages in a campaign have reached a final status
   * and mark the campaign as completed if so.
   */
  async checkCampaignCompletion(campaignId) {
    try {
      const result = await this.pool.query(
        `SELECT COUNT(*) as pending FROM campaign_service.campaign_logs 
         WHERE campaign_id = ? AND status IN ('pending', 'sent')`,
        [campaignId]
      );
      const rows = result.rows;

      if (rows && rows[0] && rows[0].pending === 0) {
        await this.pool.query(
          `UPDATE campaign_service.campaigns SET status = 'completed', updated_at = NOW() 
           WHERE id = ? AND status = 'running'`,
          [campaignId]
        );
        logger.info(`Campaign ${campaignId} completed - all messages reached final status`);
      }
    } catch (error) {
      logger.error(`Failed to check campaign completion: ${error.message}`);
    }
  }

  // ===================== TEMPLATE WEBHOOKS =====================

  async processTemplateStatusUpdate(wabaId, value) {
    const { event, message_template_id, message_template_name, message_template_language, reason } = value;

    logger.info(`Template ${message_template_name} status: ${event}`);

    // Update template status in template_service DB
    try {
      await this.pool.query(
        `UPDATE template_service.whatsapp_templates 
         SET status = ?, updated_at = NOW()
         WHERE meta_business_account_id = ? AND (meta_template_id = ? OR name = ?)`,
        [event, wabaId, message_template_id?.toString(), message_template_name]
      );
    } catch (error) {
      logger.error(`Failed to update template status: ${error.message}`);
    }

    // Also update kafka_service.templates if it exists
    try {
      await this.pool.query(
        `UPDATE templates SET status = ?, rejection_reason = ?, updated_at = NOW()
         WHERE waba_id = ? AND (meta_template_id = ? OR name = ?)`,
        [event, reason || null, wabaId, message_template_id?.toString(), message_template_name]
      );
    } catch (error) {
      // Non-critical
    }
  }

  // ===================== ACCOUNT WEBHOOKS =====================

  async processAccountUpdate(wabaId, value) {
    const { event, ban_info, restriction_info } = value;
    logger.info(`Account ${wabaId} update: ${event}`);

    try {
      await this.pool.query(
        `UPDATE waba_accounts SET account_status = ?, ban_info = ?, restriction_info = ?, updated_at = NOW()
         WHERE waba_id = ?`,
        [event, ban_info ? JSON.stringify(ban_info) : null, restriction_info ? JSON.stringify(restriction_info) : null, wabaId]
      );
    } catch (error) {
      logger.error(`Failed to update account status: ${error.message}`);
    }

    if (['ACCOUNT_BANNED', 'ACCOUNT_RESTRICTED'].includes(event)) {
      logger.error(`Critical account event: ${event} for WABA ${wabaId}`);
    }
  }

  // ===================== PHONE QUALITY WEBHOOKS =====================

  async processPhoneQualityUpdate(wabaId, value) {
    const { display_phone_number, current_limit, event } = value;
    logger.info(`Phone quality update: ${display_phone_number} - ${event}`);

    try {
      await this.pool.query(
        `UPDATE phone_numbers SET quality_rating = ?, messaging_limit = ?, updated_at = NOW()
         WHERE waba_id = ? AND display_phone_number = ?`,
        [event, current_limit, wabaId, display_phone_number]
      );
    } catch (error) {
      logger.error(`Failed to update phone quality: ${error.message}`);
    }
  }

  // ===================== TEMPLATE CATEGORY WEBHOOKS =====================

  async processTemplateCategoryUpdate(wabaId, value) {
    const { message_template_id, message_template_name, new_category } = value;
    logger.info(`Template category update: ${message_template_name} → ${new_category}`);

    try {
      await this.pool.query(
        `UPDATE template_service.whatsapp_templates SET category = ?, updated_at = NOW()
         WHERE meta_business_account_id = ? AND meta_template_id = ?`,
        [new_category, wabaId, message_template_id?.toString()]
      );
    } catch (error) {
      logger.error(`Failed to update template category: ${error.message}`);
    }
  }

  async stop() {
    await this.pool.end();
    logger.info('Webhook processor stopped');
  }
}

module.exports = new WebhookProcessor();
