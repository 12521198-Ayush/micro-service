import test from 'node:test';
import assert from 'node:assert/strict';
import WebhookTestSinkService from '../src/webhooks/services/webhookTestSinkService.js';

test('webhook test sink captures, lists and clears events', () => {
  WebhookTestSinkService.clearCapturedEvents();

  const request = {
    method: 'POST',
    originalUrl: '/webhooks/testing/receiver',
    headers: {
      'x-webhook-event': 'template.created',
    },
    query: {},
    body: {
      eventType: 'template.created',
      data: {
        templateId: 'abc',
      },
    },
  };

  const captured = WebhookTestSinkService.captureRequest(request);
  assert.ok(captured.id);
  assert.equal(captured.method, 'POST');
  assert.equal(captured.path, '/webhooks/testing/receiver');

  const listed = WebhookTestSinkService.listCapturedEvents({ limit: 10 });
  assert.equal(listed.length, 1);
  assert.equal(listed[0].id, captured.id);

  const removed = WebhookTestSinkService.clearCapturedEvents();
  assert.equal(removed, 1);
  assert.equal(WebhookTestSinkService.listCapturedEvents({ limit: 10 }).length, 0);
});
