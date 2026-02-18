import WebhookTestSinkService from '../services/webhookTestSinkService.js';

export const receiveWebhookTestEvent = async (req, res) => {
  const event = WebhookTestSinkService.captureRequest(req);

  res.status(202).json({
    success: true,
    message: 'Webhook event captured',
    data: {
      id: event.id,
      receivedAt: event.receivedAt,
    },
  });
};

export const listWebhookTestEvents = async (req, res) => {
  const events = WebhookTestSinkService.listCapturedEvents({
    limit: req.query.limit,
  });

  res.status(200).json({
    success: true,
    count: events.length,
    data: events,
  });
};

export const clearWebhookTestEvents = async (req, res) => {
  const removed = WebhookTestSinkService.clearCapturedEvents();

  res.status(200).json({
    success: true,
    message: 'Captured webhook events cleared',
    data: {
      removed,
    },
  });
};

export default {
  receiveWebhookTestEvent,
  listWebhookTestEvents,
  clearWebhookTestEvents,
};
