import test from 'node:test';
import assert from 'node:assert/strict';
import env from '../src/config/env.js';
import { normalizeUploadSessionPath } from '../src/config/metaApi.js';

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
