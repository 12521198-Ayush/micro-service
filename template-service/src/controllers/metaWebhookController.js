import env from '../config/env.js';
import AppError from '../errors/AppError.js';
import TemplateDeliveryService from '../services/templateDeliveryService.js';

export const verifyMetaWebhook = async (req, res) => {
  const mode = req.query['hub.mode'];
  const verifyToken = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (!env.metaWebhookVerifyToken) {
    throw new AppError(500, 'META_WEBHOOK_VERIFY_TOKEN is not configured', {
      code: 'META_WEBHOOK_VERIFY_TOKEN_MISSING',
      expose: false,
    });
  }

  if (mode !== 'subscribe' || verifyToken !== env.metaWebhookVerifyToken) {
    throw new AppError(403, 'Webhook verification failed', {
      code: 'WEBHOOK_VERIFICATION_FAILED',
    });
  }

  res.status(200).send(challenge || 'ok');
};

export const receiveMetaWebhook = async (req, res) => {
  await TemplateDeliveryService.processMetaWebhookPayload(req.body || {});

  res.status(200).json({
    success: true,
  });
};

export default {
  verifyMetaWebhook,
  receiveMetaWebhook,
};
