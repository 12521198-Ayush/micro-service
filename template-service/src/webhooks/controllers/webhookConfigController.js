import WebhookConfigService from '../services/webhookConfigService.js';

const getUserId = (req) => req.user?.id || req.user?.userId || null;

export const getTenantWebhookConfig = async (req, res) => {
  const data = await WebhookConfigService.getTenantConfig(req.tenant);

  res.status(200).json({
    success: true,
    data,
  });
};

export const upsertTenantWebhookConfig = async (req, res) => {
  const data = await WebhookConfigService.upsertTenantConfig({
    tenant: req.tenant,
    userId: getUserId(req),
    payload: req.body || {},
  });

  res.status(200).json({
    success: true,
    message: 'Webhook configuration saved',
    data,
  });
};

export const disableTenantWebhookConfig = async (req, res) => {
  const data = await WebhookConfigService.disableTenantConfig({
    tenant: req.tenant,
    userId: getUserId(req),
  });

  res.status(200).json({
    success: true,
    message: 'Webhook configuration disabled',
    data,
  });
};

export const listTenantWebhookEvents = async (req, res) => {
  const limit = Number.parseInt(req.query.limit, 10) || 30;
  const data = await WebhookConfigService.listRecentEvents(req.tenant, limit);

  res.status(200).json({
    success: true,
    count: data.length,
    data,
  });
};

export const retryTenantWebhookEvent = async (req, res) => {
  const data = await WebhookConfigService.retryEvent({
    tenant: req.tenant,
    eventId: req.params.eventId,
  });

  res.status(200).json({
    success: true,
    message: 'Webhook event requeued',
    data,
  });
};

export default {
  getTenantWebhookConfig,
  upsertTenantWebhookConfig,
  disableTenantWebhookConfig,
  listTenantWebhookEvents,
  retryTenantWebhookEvent,
};
