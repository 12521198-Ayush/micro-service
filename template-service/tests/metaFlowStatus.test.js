import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractMetaFlowStatus,
  mapMetaFlowStatusToLocalStatus,
  normalizeMetaFlowStatus,
} from '../src/flows/utils/metaFlowStatus.js';

test('normalizeMetaFlowStatus supports all aligned statuses', () => {
  assert.equal(normalizeMetaFlowStatus('draft'), 'DRAFT');
  assert.equal(normalizeMetaFlowStatus('PUBLISHED'), 'PUBLISHED');
  assert.equal(normalizeMetaFlowStatus('deprecated'), 'DEPRECATED');
  assert.equal(normalizeMetaFlowStatus('THROTTLED'), 'THROTTLED');
  assert.equal(normalizeMetaFlowStatus('blocked'), 'BLOCKED');
});

test('normalizeMetaFlowStatus returns null for unknown status', () => {
  assert.equal(normalizeMetaFlowStatus('ARCHIVED'), null);
});

test('extractMetaFlowStatus resolves nested payload status', () => {
  const payload = {
    data: {
      flow_status: 'THROTTLED',
    },
  };

  assert.equal(extractMetaFlowStatus(payload), 'THROTTLED');
});

test('mapMetaFlowStatusToLocalStatus returns same aligned status', () => {
  assert.equal(mapMetaFlowStatusToLocalStatus('BLOCKED'), 'BLOCKED');
});
