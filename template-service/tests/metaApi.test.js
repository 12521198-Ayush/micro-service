import test from 'node:test';
import assert from 'node:assert/strict';
import env from '../src/config/env.js';
import {
  DEFAULT_TEMPLATE_FIELDS,
  normalizeUploadSessionPath,
  sanitizeTemplateFields,
} from '../src/config/metaApi.js';

test('normalizeUploadSessionPath keeps upload session query signature intact', () => {
  const input = 'upload:session123?sig=abc123';
  assert.equal(
    normalizeUploadSessionPath(input),
    '/upload:session123?sig=abc123'
  );
});

test('normalizeUploadSessionPath prefixes bare upload session values', () => {
  assert.equal(normalizeUploadSessionPath('session123'), '/upload:session123');
});

test('normalizeUploadSessionPath keeps leading slash for upload session path', () => {
  assert.equal(
    normalizeUploadSessionPath('/upload:session123?sig=abc123'),
    '/upload:session123?sig=abc123'
  );
});

test('normalizeUploadSessionPath strips API version from absolute Graph URL', () => {
  const sessionUrl = `https://graph.facebook.com/${env.metaApiVersion}/upload:session123?sig=abc123`;
  assert.equal(
    normalizeUploadSessionPath(sessionUrl),
    '/upload:session123?sig=abc123'
  );
});

test('DEFAULT_TEMPLATE_FIELDS does not include unsupported created_time field', () => {
  assert.equal(DEFAULT_TEMPLATE_FIELDS.includes('created_time'), false);
});

test('sanitizeTemplateFields removes empty items and duplicates', () => {
  const result = sanitizeTemplateFields('id,name,name,,status');
  assert.deepEqual(result, ['id', 'name', 'status']);
});
