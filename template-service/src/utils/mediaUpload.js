const SUPPORTED_TEMPLATE_MEDIA_MIME_TYPES = Object.freeze([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'video/mp4',
]);

const MIME_EXTENSION_BY_TYPE = Object.freeze({
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'video/mp4': 'mp4',
});

const FILE_NAME_WITH_EXTENSION_PATTERN = /\.[a-z0-9]{2,8}$/i;

export const normalizeMimeType = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.split(';')[0].trim().toLowerCase();
  return normalized || null;
};

export const isSupportedTemplateMediaType = (mimeType) => {
  const normalized = normalizeMimeType(mimeType);

  if (!normalized) {
    return false;
  }

  return SUPPORTED_TEMPLATE_MEDIA_MIME_TYPES.includes(normalized);
};

export const extensionForMimeType = (mimeType) => {
  const normalized = normalizeMimeType(mimeType);
  return normalized ? MIME_EXTENSION_BY_TYPE[normalized] || null : null;
};

const sanitizeFileNameFragment = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 128);
};

export const sanitizeUploadFileName = (value, fallback = 'template_media') => {
  const sanitized = sanitizeFileNameFragment(value);
  const fallbackSafe = sanitizeFileNameFragment(fallback) || 'template_media';

  if (!sanitized) {
    return fallbackSafe;
  }

  return sanitized;
};

export const ensureFileNameHasExtension = (fileName, mimeType) => {
  const extension = extensionForMimeType(mimeType);

  if (!extension) {
    return fileName;
  }

  if (FILE_NAME_WITH_EXTENSION_PATTERN.test(fileName)) {
    return fileName;
  }

  return `${fileName}.${extension}`;
};

export { SUPPORTED_TEMPLATE_MEDIA_MIME_TYPES };
