import { FLOW_SUBMISSION_STATUSES } from '../constants/flowEnums.js';
import { isPlainObject, toNullableString } from '../utils/flowHelpers.js';

const PHONE_REGEX = /^\+?[0-9]{8,18}$/;

export const validateAndNormalizeFlowSubmissionPayload = (payload = {}) => {
  const errors = [];

  if (!isPlainObject(payload)) {
    return {
      isValid: false,
      errors: ['Request body must be a valid JSON object'],
      normalizedPayload: null,
    };
  }

  const normalized = {
    flowId: toNullableString(payload.flowId || payload.flow_id, 36),
    version:
      payload.version !== undefined && payload.version !== null
        ? Number.parseInt(payload.version, 10)
        : null,
    organizationId: toNullableString(payload.organizationId || payload.organization_id, 64),
    metaBusinessAccountId: toNullableString(
      payload.metaBusinessAccountId || payload.meta_business_account_id,
      64
    ),
    metaAppId: toNullableString(payload.metaAppId || payload.meta_app_id, 64),
    userPhone: toNullableString(payload.userPhone || payload.user_phone, 32),
    answers: isPlainObject(payload.answers) ? payload.answers : null,
    status: toNullableString(payload.status, 32)?.toUpperCase() || 'RECEIVED',
    source: toNullableString(payload.source, 32)?.toUpperCase() || 'WEBHOOK',
    externalReference: toNullableString(
      payload.externalReference || payload.external_reference,
      128
    ),
  };

  if (!normalized.flowId) {
    errors.push('flow_id is required');
  }

  if (normalized.version !== null && (!Number.isFinite(normalized.version) || normalized.version < 1)) {
    errors.push('version must be a positive integer when provided');
  }

  if (!normalized.organizationId) {
    errors.push('organization_id is required');
  }

  if (!normalized.metaBusinessAccountId) {
    errors.push('meta_business_account_id is required');
  }

  if (!normalized.metaAppId) {
    errors.push('meta_app_id is required');
  }

  if (!normalized.userPhone) {
    errors.push('user_phone is required');
  } else if (!PHONE_REGEX.test(normalized.userPhone)) {
    errors.push('user_phone must be a valid E.164-like number');
  }

  if (!normalized.answers) {
    errors.push('answers must be a non-empty object');
  }

  if (!FLOW_SUBMISSION_STATUSES.includes(normalized.status)) {
    errors.push(
      `status must be one of: ${FLOW_SUBMISSION_STATUSES.join(', ')}`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    normalizedPayload: normalized,
  };
};

export default {
  validateAndNormalizeFlowSubmissionPayload,
};
