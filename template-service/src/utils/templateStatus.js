export const INTERNAL_TEMPLATE_STATUSES = Object.freeze([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'PAUSED',
  'DISABLED',
  'IN_APPEAL',
  'DELETED',
  'UNKNOWN',
]);

const META_TO_INTERNAL_STATUS = Object.freeze({
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PENDING: 'PENDING',
  PAUSED: 'PAUSED',
  DISABLED: 'DISABLED',
  IN_APPEAL: 'IN_APPEAL',
  PENDING_DELETION: 'PENDING',
  DELETED: 'DELETED',
});

export const normalizeMetaStatus = (value) => {
  if (!value || typeof value !== 'string') {
    return 'UNKNOWN';
  }

  const normalized = value.trim().toUpperCase();
  return META_TO_INTERNAL_STATUS[normalized] || 'UNKNOWN';
};

export const normalizeInternalStatus = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return INTERNAL_TEMPLATE_STATUSES.includes(normalized) ? normalized : null;
};
