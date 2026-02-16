import logger from '../config/logger.js';
import TemplateCallbackEventModel from '../models/templateCallbackEventModel.js';
import WebhookEventService from '../webhooks/services/webhookEventService.js';
import TenantWebhookConfigModel from '../webhooks/models/tenantWebhookConfigModel.js';

const mapMetaStatusToInternal = (value) => {
  const normalized = String(value || '').trim().toUpperCase();

  if (normalized === 'SENT') {
    return 'SENT';
  }

  if (normalized === 'DELIVERED') {
    return 'DELIVERED';
  }

  if (normalized === 'READ') {
    return 'READ';
  }

  if (normalized === 'FAILED') {
    return 'FAILED';
  }

  return 'SENT';
};

const parseInteractiveResponse = (interactive = {}) => {
  if (interactive.type === 'button_reply') {
    return {
      kind: 'button_reply',
      id: interactive.button_reply?.id || null,
      title: interactive.button_reply?.title || null,
    };
  }

  if (interactive.type === 'list_reply') {
    return {
      kind: 'list_reply',
      id: interactive.list_reply?.id || null,
      title: interactive.list_reply?.title || null,
      description: interactive.list_reply?.description || null,
    };
  }

  if (interactive.type === 'nfm_reply') {
    let responseJson = interactive.nfm_reply?.response_json || null;

    if (typeof responseJson === 'string') {
      try {
        responseJson = JSON.parse(responseJson);
      } catch (error) {
        responseJson = {
          raw: interactive.nfm_reply?.response_json,
        };
      }
    }

    return {
      kind: 'nfm_reply',
      name: interactive.nfm_reply?.name || null,
      body: responseJson,
    };
  }

  return {
    kind: interactive.type || 'unknown',
    raw: interactive,
  };
};

class TemplateDeliveryService {
  static async resolveTenantFromMetaBusinessAccountId(metaBusinessAccountId) {
    const normalizedMetaBusinessAccountId = String(metaBusinessAccountId || '').trim();

    if (!normalizedMetaBusinessAccountId) {
      return null;
    }

    const candidates =
      await TenantWebhookConfigModel.listActiveTenantScopesByMetaBusinessAccountId(
        normalizedMetaBusinessAccountId,
        3
      );

    if (candidates.length === 1) {
      return candidates[0];
    }

    if (candidates.length > 1) {
      logger.warn('Meta webhook tenant resolution is ambiguous', {
        metaBusinessAccountId: normalizedMetaBusinessAccountId,
        candidateCount: candidates.length,
      });
    }

    return null;
  }

  static async processMetaWebhookPayload(payload) {
    const entries = Array.isArray(payload?.entry) ? payload.entry : [];

    const summary = {
      statusesProcessed: 0,
      messagesProcessed: 0,
      eventsWithoutTenant: 0,
      errors: [],
    };

    for (const entry of entries) {
      const metaBusinessAccountId = entry?.id || null;
      const tenant = await this.resolveTenantFromMetaBusinessAccountId(
        metaBusinessAccountId
      );
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];

      for (const change of changes) {
        const value = change?.value || {};
        const metadata = value.metadata || {};
        const statuses = Array.isArray(value.statuses) ? value.statuses : [];
        const messages = Array.isArray(value.messages) ? value.messages : [];

        for (const status of statuses) {
          try {
            await this.processStatusEvent({
              status,
              metadata,
              rawPayload: payload,
              tenant,
              metaBusinessAccountId,
            });
            summary.statusesProcessed += 1;
            if (!tenant) {
              summary.eventsWithoutTenant += 1;
            }
          } catch (error) {
            summary.errors.push({
              type: 'status',
              messageId: status?.id || null,
              message: error.message,
            });
          }
        }

        for (const message of messages) {
          try {
            await this.processInboundMessageEvent({
              message,
              metadata,
              rawPayload: payload,
              tenant,
              metaBusinessAccountId,
            });
            summary.messagesProcessed += 1;
            if (!tenant) {
              summary.eventsWithoutTenant += 1;
            }
          } catch (error) {
            summary.errors.push({
              type: 'message',
              messageId: message?.id || null,
              message: error.message,
            });
          }
        }
      }
    }

    logger.info('Meta webhook processed', summary);

    return summary;
  }

  static async processStatusEvent({
    status,
    metadata,
    rawPayload,
    tenant,
    metaBusinessAccountId,
  }) {
    const metaMessageId = status?.id || null;
    const rawStatus = String(status?.status || '').trim().toUpperCase();
    const normalizedStatus = mapMetaStatusToInternal(rawStatus);

    if (!metaMessageId) {
      return;
    }

    const eventKey = `meta.status:${metaBusinessAccountId || 'unknown'}:${metaMessageId}:${rawStatus}:${status?.timestamp || ''}`;

    const parsedPayload = {
      metaMessageId,
      rawStatus,
      status: normalizedStatus,
      conversation: status?.conversation || null,
      pricing: status?.pricing || null,
      errors: status?.errors || null,
      recipientId: status?.recipient_id || null,
      timestamp: status?.timestamp || null,
      metaPhoneNumberId: metadata?.phone_number_id || null,
      metaBusinessAccountId: metaBusinessAccountId || null,
    };

    await TemplateCallbackEventModel.createIfNotExists({
      tenant,
      metaMessageId,
      metaPhoneNumberId: metadata?.phone_number_id || null,
      eventType: 'MESSAGE_STATUS',
      eventKey,
      rawPayload,
      parsedPayload,
    });

    if (tenant) {
      await WebhookEventService.enqueueTenantEvent({
        tenant,
        eventType: 'template.delivery.updated',
        eventKey,
        payload: {
          messageId: null,
          metaMessageId,
          status: normalizedStatus,
          rawStatus,
          recipientId: status?.recipient_id || null,
          conversation: status?.conversation || null,
          pricing: status?.pricing || null,
          errors: status?.errors || null,
          timestamp: status?.timestamp || null,
        },
      });
    }

    await TemplateCallbackEventModel.markProcessed(eventKey);
  }

  static async processInboundMessageEvent({
    message,
    metadata,
    rawPayload,
    tenant,
    metaBusinessAccountId,
  }) {
    const inboundMessageId = message?.id || null;

    if (!inboundMessageId) {
      return;
    }

    const contextMessageId = message?.context?.id || null;
    const responseType = String(message?.type || '').trim().toLowerCase() || 'unknown';

    let parsedResponse = null;

    if (responseType === 'button') {
      parsedResponse = {
        kind: 'button',
        payload: message?.button?.payload || null,
        text: message?.button?.text || null,
      };
    } else if (responseType === 'interactive') {
      parsedResponse = parseInteractiveResponse(message?.interactive || {});
    } else if (responseType === 'text') {
      parsedResponse = {
        kind: 'text',
        body: message?.text?.body || null,
      };
    } else {
      parsedResponse = {
        kind: responseType,
        raw: message,
      };
    }

    const eventKey = `meta.message:${metaBusinessAccountId || 'unknown'}:${inboundMessageId}`;

    const parsedPayload = {
      inboundMessageId,
      responseType,
      from: message?.from || null,
      timestamp: message?.timestamp || null,
      contextMessageId,
      parsedResponse,
      metaPhoneNumberId: metadata?.phone_number_id || null,
      profileName: message?.profile?.name || null,
      metaBusinessAccountId: metaBusinessAccountId || null,
    };

    await TemplateCallbackEventModel.createIfNotExists({
      tenant,
      metaMessageId: contextMessageId,
      metaPhoneNumberId: metadata?.phone_number_id || null,
      eventType:
        parsedResponse?.kind === 'nfm_reply' ? 'FLOW_RESPONSE' : 'MESSAGE_INBOUND',
      eventKey,
      rawPayload,
      parsedPayload,
    });

    if (tenant) {
      await WebhookEventService.enqueueTenantEvent({
        tenant,
        eventType: 'template.response.received',
        eventKey,
        payload: {
          relatedMessageId: null,
          relatedMetaMessageId: contextMessageId,
          inboundMessageId,
          responseType,
          from: message?.from || null,
          timestamp: message?.timestamp || null,
          parsedResponse,
        },
      });
    }

    await TemplateCallbackEventModel.markProcessed(eventKey);
  }
}

export default TemplateDeliveryService;
