import AppError from '../errors/AppError.js';

const readString = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
};

const pickFirstNonEmpty = (...values) => {
  for (const value of values) {
    const normalized = readString(value);

    if (normalized) {
      return normalized;
    }
  }

  return null;
};

export const resolveTenantContext = (req) => {
  const organizationId = pickFirstNonEmpty(
    req.headers['x-organization-id'],
    req.user?.organizationId,
    req.user?.organization_id,
    // Fallback: derive from user ID if no org is assigned yet
    req.user?.userId ? `user_${req.user.userId}` : null,
    req.user?.id ? `user_${req.user.id}` : null
  );

  const metaBusinessAccountId = pickFirstNonEmpty(
    req.headers['x-meta-business-account-id'],
    req.user?.metaBusinessAccountId,
    req.user?.meta_business_account_id
  );

  const metaAppId = pickFirstNonEmpty(
    req.headers['x-meta-app-id'],
    req.user?.metaAppId,
    req.user?.meta_app_id
  );

  const metaPhoneNumberId = pickFirstNonEmpty(
    req.headers['x-meta-phone-number-id'],
    req.user?.metaPhoneNumberId,
    req.user?.meta_phone_number_id
  );

  return {
    organizationId,
    metaBusinessAccountId,
    metaAppId,
    metaPhoneNumberId,
  };
};

export const requireTenantContext = (options = {}) => {
  const {
    requireOrganizationId = true,
    requireMetaBusinessAccountId = true,
    requireMetaAppId = true,
    requireMetaPhoneNumberId = false,
  } = options;

  return (req, res, next) => {
    const context = resolveTenantContext(req);
    const missing = [];

    if (requireOrganizationId && !context.organizationId) {
      missing.push('organizationId');
    }

    if (requireMetaBusinessAccountId && !context.metaBusinessAccountId) {
      missing.push('metaBusinessAccountId');
    }

    if (requireMetaAppId && !context.metaAppId) {
      missing.push('metaAppId');
    }

    if (requireMetaPhoneNumberId && !context.metaPhoneNumberId) {
      missing.push('metaPhoneNumberId');
    }

    if (missing.length > 0) {
      next(
        new AppError(400, 'Tenant context is incomplete', {
          code: 'TENANT_CONTEXT_MISSING',
          details: {
            missing,
          },
        })
      );
      return;
    }

    req.tenant = context;
    next();
  };
};

export default {
  resolveTenantContext,
  requireTenantContext,
};
