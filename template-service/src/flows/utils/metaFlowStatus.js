const SUPPORTED_META_FLOW_STATUSES = new Set([
  'DRAFT',
  'PUBLISHED',
  'DEPRECATED',
  'THROTTLED',
  'BLOCKED',
]);

const toStatus = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  return normalized || null;
};

export const normalizeMetaFlowStatus = (value) => {
  const status = toStatus(value);
  return status && SUPPORTED_META_FLOW_STATUSES.has(status) ? status : null;
};

export const extractMetaFlowStatus = (payload = {}) => {
  const directCandidates = [
    payload?.status,
    payload?.flow_status,
    payload?.flowStatus,
    payload?.health_status,
    payload?.healthStatus,
  ];

  for (const candidate of directCandidates) {
    const normalized = normalizeMetaFlowStatus(candidate);
    if (normalized) {
      return normalized;
    }
  }

  const nested = payload?.data;
  if (nested && typeof nested === 'object') {
    return extractMetaFlowStatus(nested);
  }

  return null;
};

export const mapMetaFlowStatusToLocalStatus = (metaStatus) => {
  return normalizeMetaFlowStatus(metaStatus);
};

export default {
  normalizeMetaFlowStatus,
  extractMetaFlowStatus,
  mapMetaFlowStatusToLocalStatus,
};
