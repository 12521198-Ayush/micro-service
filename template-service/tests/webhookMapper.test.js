import test from 'node:test';
import assert from 'node:assert/strict';
import { applyWebhookMapping } from '../src/flows/utils/webhookMapper.js';

test('applyWebhookMapping maps nested placeholders', () => {
  const mapping = {
    customer: {
      name: '{{answers.name}}',
      phone: '{{user_phone}}',
    },
    flow: '{{flow.id}}',
    summary: 'Lead from {{tenant.organization_id}}',
  };

  const context = {
    answers: {
      name: 'Alex',
    },
    user_phone: '+14155550123',
    flow: {
      id: 'flow_123',
    },
    tenant: {
      organization_id: 'org_1',
    },
  };

  const result = applyWebhookMapping(mapping, context);

  assert.equal(result.customer.name, 'Alex');
  assert.equal(result.customer.phone, '+14155550123');
  assert.equal(result.flow, 'flow_123');
  assert.equal(result.summary, 'Lead from org_1');
});

test('applyWebhookMapping defaults to answers when mapping is empty', () => {
  const context = {
    answers: {
      email: 'demo@example.com',
    },
  };

  const result = applyWebhookMapping(null, context);

  assert.deepEqual(result, context.answers);
});
