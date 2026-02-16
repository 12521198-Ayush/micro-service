import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { buildWebhookSignature } from '../src/webhooks/utils/webhookSecurity.js';

test('buildWebhookSignature returns deterministic sha256 signature', () => {
  const payloadText = JSON.stringify({ hello: 'world' });
  const timestamp = '1700000000';
  const signingSecret = 'super_secret';

  const expected = `sha256=${createHmac('sha256', signingSecret)
    .update(`${timestamp}.${payloadText}`)
    .digest('hex')}`;

  const signature = buildWebhookSignature({
    signingSecret,
    timestamp,
    payloadText,
  });

  assert.equal(signature, expected);
});

test('buildWebhookSignature returns null without signing secret', () => {
  const signature = buildWebhookSignature({
    signingSecret: '',
    timestamp: '1700000000',
    payloadText: '{}',
  });

  assert.equal(signature, null);
});
