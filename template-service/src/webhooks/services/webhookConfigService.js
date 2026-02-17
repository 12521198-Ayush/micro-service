import AppError from '../../errors/AppError.js';
import { WEBHOOK_EVENT_TYPES } from '../constants.js';
import TenantWebhookConfigModel from '../models/tenantWebhookConfigModel.js';
import TenantWebhookEventModel from '../models/tenantWebhookEventModel.js';

const AUTH_TYPES = new Set(['NONE', 'BEARER', 'BASIC']);

const sanitizeUrl = (value) => {
  if (!value) {
    return null;
  }

  const url = String(value).trim();

  try {
    const parsed = new URL(url);

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }

    return parsed.toString();
  } catch (error) {
    return null;
  }
};

const normalizeEventTypes = (value) => {
  if (!Array.isArray(value) || value.length === 0) {
    return [...WEBHOOK_EVENT_TYPES];
  }

  const normalized = [...new Set(value.map((item) => String(item).trim()))];
  return normalized;
};

const redactAuthConfig = (authType, authConfig) => {
  if (!authConfig) {
    return null;
  }

  if (authType === 'BEARER') {
    return {
      token: authConfig.token ? '***' : null,
    };
  }

  if (authType === 'BASIC') {
    return {
      username: authConfig.username || null,
      password: authConfig.password ? '***' : null,
    };
  }

  return null;
};

const toDto = (config) => {
  if (!config) {
    return null;
  }

  return {
    id: config.uuid,
    targetUrl: config.targetUrl,
    authType: config.authType,
    auth: redactAuthConfig(config.authType, config.authConfig),
    signingEnabled: Boolean(config.signingSecret),
    timeoutMs: config.timeoutMs,
    maxRetries: config.maxRetries,
    retryBackoffBaseSeconds: config.retryBackoffBaseSeconds,
    eventTypes: config.eventTypes,
    isActive: config.isActive,
    lastDeliveryStatus: config.lastDeliveryStatus,
    lastDeliveryAt: config.lastDeliveryAt,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  };
};

class WebhookConfigService {
  static async getTenantConfig(tenant) {
    const config = await TenantWebhookConfigModel.getByTenant(tenant);
    return toDto(config);
  }

  static async upsertTenantConfig({ tenant, userId, payload }) {
    const targetUrl = sanitizeUrl(payload.targetUrl || payload.target_url);
    const authType = String(payload.authType || payload.auth_type || 'NONE')
      .trim()
      .toUpperCase();

    if (!targetUrl) {
      throw new AppError(422, 'targetUrl must be a valid http/https URL', {
        code: 'INVALID_WEBHOOK_URL',
      });
    }

    if (!AUTH_TYPES.has(authType)) {
      throw new AppError(422, `authType must be one of: ${Array.from(AUTH_TYPES).join(', ')}`, {
        code: 'INVALID_WEBHOOK_AUTH_TYPE',
      });
    }

    const authConfig = payload.auth && typeof payload.auth === 'object' ? payload.auth : {};

    if (authType === 'BEARER' && !authConfig.token) {
      throw new AppError(422, 'auth.token is required for BEARER authType', {
        code: 'INVALID_WEBHOOK_AUTH_CONFIG',
      });
    }

    if (authType === 'BASIC' && (!authConfig.username || !authConfig.password)) {
      throw new AppError(422, 'auth.username and auth.password are required for BASIC authType', {
        code: 'INVALID_WEBHOOK_AUTH_CONFIG',
      });
    }

    const timeoutMs = Number.parseInt(payload.timeoutMs, 10);
    const maxRetries = Number.parseInt(payload.maxRetries, 10);
    const retryBackoffBaseSeconds = Number.parseInt(payload.retryBackoffBaseSeconds, 10);

    const config = await TenantWebhookConfigModel.upsertForTenant({
      tenant,
      userId,
      targetUrl,
      authType,
      authConfig: authType === 'NONE' ? null : authConfig,
      signingSecret: payload.signingSecret || payload.signing_secret || null,
      timeoutMs: Number.isFinite(timeoutMs) ? Math.min(Math.max(timeoutMs, 1000), 30000) : 8000,
      maxRetries: Number.isFinite(maxRetries) ? Math.min(Math.max(maxRetries, 0), 12) : 6,
      retryBackoffBaseSeconds: Number.isFinite(retryBackoffBaseSeconds)
        ? Math.min(Math.max(retryBackoffBaseSeconds, 5), 600)
        : 15,
      eventTypes: normalizeEventTypes(payload.eventTypes || payload.event_types),
      isActive: payload.isActive !== false && payload.is_active !== false,
    });

    return toDto(config);
  }

  static async disableTenantConfig({ tenant, userId }) {
    const removed = await TenantWebhookConfigModel.disableForTenant({ tenant, userId });

    if (!removed) {
      throw new AppError(404, 'Webhook config not found for tenant', {
        code: 'WEBHOOK_CONFIG_NOT_FOUND',
      });
    }

    return {
      disabled: true,
    };
  }

  static async listRecentEvents(tenant, limit = 30) {
    const events = await TenantWebhookEventModel.listRecentEventsForTenant(
      tenant,
      Math.min(Math.max(limit, 1), 100)
    );

    return events.map((event) => ({
      id: event.uuid,
      eventType: event.eventType,
      eventKey: event.eventKey,
      status: event.status,
      attemptCount: event.attemptCount,
      nextAttemptAt: event.nextAttemptAt,
      lastAttemptAt: event.lastAttemptAt,
      lastHttpStatus: event.lastHttpStatus,
      lastError: event.lastError,
      deliveredAt: event.deliveredAt,
      createdAt: event.createdAt,
    }));
  }

  static async retryEvent({ tenant, eventId }) {
    const requeued = await TenantWebhookEventModel.requeueByUuidForTenant(eventId, tenant);

    if (!requeued) {
      throw new AppError(404, 'Webhook event not found for tenant', {
        code: 'WEBHOOK_EVENT_NOT_FOUND',
      });
    }

    return {
      requeued: true,
    };
  }
}

export default WebhookConfigService;
