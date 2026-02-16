import axios from 'axios';
import env from '../../config/env.js';
import logger from '../../config/logger.js';
import TenantWebhookConfigModel from '../models/tenantWebhookConfigModel.js';
import TenantWebhookEventModel from '../models/tenantWebhookEventModel.js';
import { buildWebhookSignature } from '../utils/webhookSecurity.js';

const RETRYABLE_HTTP_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

const toTenantKey = (tenant) => {
  return `${tenant.organizationId}|${tenant.metaBusinessAccountId}|${tenant.metaAppId}`;
};

const shouldRetryResponseStatus = (statusCode) => {
  if (!statusCode) {
    return true;
  }

  if (RETRYABLE_HTTP_STATUS.has(statusCode)) {
    return true;
  }

  return false;
};

const isHttpSuccess = (statusCode) => statusCode >= 200 && statusCode < 300;

const computeNextAttemptTime = ({ baseSeconds, attemptNumber }) => {
  const exponent = Math.max(attemptNumber - 1, 0);
  const retrySeconds = Math.min(baseSeconds * 2 ** exponent, 900);
  const jitterMs = Math.floor(Math.random() * 1000);
  return new Date(Date.now() + retrySeconds * 1000 + jitterMs);
};

const buildAuthorizationHeader = (authType, authConfig) => {
  if (authType === 'BEARER') {
    if (!authConfig?.token) {
      return null;
    }

    return `Bearer ${authConfig.token}`;
  }

  if (authType === 'BASIC') {
    if (!authConfig?.username || !authConfig?.password) {
      return null;
    }

    const encoded = Buffer.from(`${authConfig.username}:${authConfig.password}`).toString('base64');
    return `Basic ${encoded}`;
  }

  return null;
};

class WebhookEventService {
  static dispatchTimer = null;
  static isDispatching = false;

  static async enqueueTenantEvent({ tenant, eventType, eventKey, payload }) {
    const config = await TenantWebhookConfigModel.getActiveByTenant(tenant);

    if (!config) {
      return {
        queued: false,
        reason: 'WEBHOOK_CONFIG_NOT_FOUND_OR_INACTIVE',
      };
    }

    const subscribedEventTypes = Array.isArray(config.eventTypes)
      ? config.eventTypes
      : [];

    if (subscribedEventTypes.length > 0 && !subscribedEventTypes.includes(eventType)) {
      return {
        queued: false,
        reason: 'WEBHOOK_EVENT_TYPE_NOT_SUBSCRIBED',
      };
    }

    const event = await TenantWebhookEventModel.enqueueIfConfigured({
      config,
      tenant,
      eventType,
      eventKey,
      payload,
    });

    logger.info('Webhook event queued', {
      tenantKey: toTenantKey(tenant),
      eventType,
      eventKey,
      eventUuid: event?.uuid,
    });

    return {
      queued: Boolean(event),
      eventId: event?.uuid || null,
    };
  }

  static startDispatcher() {
    if (this.dispatchTimer) {
      return;
    }

    this.dispatchTimer = setInterval(() => {
      this.dispatchDueEvents().catch((error) => {
        logger.error('Webhook dispatcher iteration failed', {
          message: error.message,
          stack: error.stack,
        });
      });
    }, env.webhookDispatchIntervalMs);

    logger.info('Webhook dispatcher started', {
      intervalMs: env.webhookDispatchIntervalMs,
      batchSize: env.webhookDispatchBatchSize,
    });
  }

  static stopDispatcher() {
    if (!this.dispatchTimer) {
      return;
    }

    clearInterval(this.dispatchTimer);
    this.dispatchTimer = null;
    logger.info('Webhook dispatcher stopped');
  }

  static async dispatchDueEvents() {
    if (this.isDispatching) {
      return;
    }

    this.isDispatching = true;

    try {
      const dispatchRows = await TenantWebhookEventModel.claimDueEvents(
        env.webhookDispatchBatchSize
      );

      for (const dispatchRow of dispatchRows) {
        await this.dispatchSingleEvent(dispatchRow);
      }
    } finally {
      this.isDispatching = false;
    }
  }

  static async dispatchSingleEvent(dispatchRow) {
    const { event, config } = dispatchRow;

    if (!config.isActive) {
      await TenantWebhookEventModel.markSkipped({
        eventId: event.id,
        errorMessage: 'Webhook config is inactive',
      });
      return;
    }

    const attemptNumber = event.attemptCount;
    const maxAttempts = Number(config.maxRetries || 0) + 1;

    const body = {
      eventId: event.uuid,
      eventType: event.eventType,
      eventKey: event.eventKey,
      occurredAt: event.createdAt,
      tenant: {
        organizationId: event.organizationId,
        metaBusinessAccountId: event.metaBusinessAccountId,
        metaAppId: event.metaAppId,
      },
      data: event.payload,
    };

    const payloadText = JSON.stringify(body);
    const timestamp = String(Math.floor(Date.now() / 1000));

    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'template-service-webhook-dispatcher/1.0',
      'X-Webhook-Event': event.eventType,
      'X-Webhook-Event-Id': event.uuid,
      'X-Webhook-Event-Key': event.eventKey,
      'X-Webhook-Timestamp': timestamp,
      'Idempotency-Key': event.eventKey,
    };

    const signature = buildWebhookSignature({
      signingSecret: config.signingSecret,
      timestamp,
      payloadText,
    });

    if (signature) {
      headers['X-Webhook-Signature'] = signature;
    }

    const authorizationHeader = buildAuthorizationHeader(config.authType, config.authConfig);

    if (authorizationHeader) {
      headers.Authorization = authorizationHeader;
    }

    const startedAt = Date.now();

    try {
      const response = await axios.post(config.targetUrl, body, {
        timeout: Number(config.timeoutMs || 8000),
        headers,
        validateStatus: () => true,
      });

      const durationMs = Date.now() - startedAt;
      const responseStatus = response.status;
      const responseBodyText =
        typeof response.data === 'string'
          ? response.data
          : JSON.stringify(response.data || {});

      await TenantWebhookEventModel.recordAttempt({
        eventId: event.id,
        attemptNumber,
        requestHeaders: headers,
        requestPayload: body,
        responseStatus,
        responseBody: responseBodyText.slice(0, 4000),
        durationMs,
      });

      if (isHttpSuccess(responseStatus)) {
        await TenantWebhookEventModel.markDelivered(event.id, responseStatus);
        await TenantWebhookConfigModel.updateDeliverySummary(config.id, {
          status: 'DELIVERED',
          at: new Date(),
        });
        return;
      }

      const shouldRetry = shouldRetryResponseStatus(responseStatus);

      if (shouldRetry && attemptNumber < maxAttempts) {
        const nextAttemptAt = computeNextAttemptTime({
          baseSeconds: Number(config.retryBackoffBaseSeconds || 15),
          attemptNumber,
        });

        await TenantWebhookEventModel.markRetryPending({
          eventId: event.id,
          nextAttemptAt,
          responseStatus,
          errorMessage: `Non-success HTTP status ${responseStatus}`,
        });

        await TenantWebhookConfigModel.updateDeliverySummary(config.id, {
          status: `RETRY_PENDING_${responseStatus}`,
          at: new Date(),
        });

        return;
      }

      await TenantWebhookEventModel.markDead({
        eventId: event.id,
        responseStatus,
        errorMessage: `Delivery failed with HTTP status ${responseStatus}`,
      });

      await TenantWebhookConfigModel.updateDeliverySummary(config.id, {
        status: `DEAD_${responseStatus}`,
        at: new Date(),
      });
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const errorMessage = error.message;
      const responseStatus = error.response?.status || null;
      const maxAttemptsReached = attemptNumber >= maxAttempts;

      await TenantWebhookEventModel.recordAttempt({
        eventId: event.id,
        attemptNumber,
        requestHeaders: headers,
        requestPayload: body,
        responseStatus,
        responseBody: error.response?.data
          ? JSON.stringify(error.response.data).slice(0, 4000)
          : null,
        durationMs,
        errorMessage,
      });

      if (!maxAttemptsReached) {
        const nextAttemptAt = computeNextAttemptTime({
          baseSeconds: Number(config.retryBackoffBaseSeconds || 15),
          attemptNumber,
        });

        await TenantWebhookEventModel.markRetryPending({
          eventId: event.id,
          nextAttemptAt,
          errorMessage,
          responseStatus,
        });

        await TenantWebhookConfigModel.updateDeliverySummary(config.id, {
          status: 'RETRY_PENDING_NETWORK',
          at: new Date(),
        });

        return;
      }

      await TenantWebhookEventModel.markDead({
        eventId: event.id,
        errorMessage,
        responseStatus,
      });

      await TenantWebhookConfigModel.updateDeliverySummary(config.id, {
        status: 'DEAD_NETWORK',
        at: new Date(),
      });
    }
  }
}

export default WebhookEventService;
