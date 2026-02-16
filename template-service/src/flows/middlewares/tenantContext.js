import { requireTenantContext } from '../../middleware/tenantContext.js';

export const attachTenantContext = requireTenantContext({
  requireOrganizationId: true,
  requireMetaBusinessAccountId: true,
  requireMetaAppId: true,
});

export default attachTenantContext;
