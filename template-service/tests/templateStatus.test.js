import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeMetaStatus,
  normalizeInternalStatus,
} from '../src/utils/templateStatus.js';

test('normalizeMetaStatus maps approved status', () => {
  assert.equal(normalizeMetaStatus('APPROVED'), 'APPROVED');
});

test('normalizeMetaStatus maps pending deletion to pending', () => {
  assert.equal(normalizeMetaStatus('PENDING_DELETION'), 'PENDING');
});

test('normalizeMetaStatus returns UNKNOWN for unsupported values', () => {
  assert.equal(normalizeMetaStatus('SOMETHING_ELSE'), 'UNKNOWN');
});

test('normalizeInternalStatus normalizes valid internal status', () => {
  assert.equal(normalizeInternalStatus('approved'), 'APPROVED');
});

test('normalizeInternalStatus returns null for unsupported status', () => {
  assert.equal(normalizeInternalStatus('legacy_pending'), null);
});
