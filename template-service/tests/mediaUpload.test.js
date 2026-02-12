import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ensureFileNameHasExtension,
  extensionForMimeType,
  isSupportedTemplateMediaType,
  normalizeMimeType,
  sanitizeUploadFileName,
} from '../src/utils/mediaUpload.js';

test('normalizeMimeType trims and strips content-type parameters', () => {
  assert.equal(normalizeMimeType(' image/jpeg; charset=utf-8 '), 'image/jpeg');
});

test('isSupportedTemplateMediaType allows Meta-supported template media types', () => {
  assert.equal(isSupportedTemplateMediaType('image/png'), true);
  assert.equal(isSupportedTemplateMediaType('video/mp4'), true);
  assert.equal(isSupportedTemplateMediaType('application/zip'), false);
});

test('sanitizeUploadFileName removes unsafe characters', () => {
  assert.equal(
    sanitizeUploadFileName('my promo banner (final).png'),
    'my_promo_banner_final_.png'
  );
});

test('extensionForMimeType and ensureFileNameHasExtension infer missing extension', () => {
  assert.equal(extensionForMimeType('application/pdf'), 'pdf');
  assert.equal(ensureFileNameHasExtension('voucher', 'application/pdf'), 'voucher.pdf');
  assert.equal(ensureFileNameHasExtension('banner.jpg', 'image/jpeg'), 'banner.jpg');
});
