import test from 'node:test';
import assert from 'node:assert/strict';
import { requireTenantContext, resolveTenantContext } from '../src/middleware/tenantContext.js';

test('resolveTenantContext reads tenant data from authenticated user', () => {
  const req = {
    user: {
      organizationId: 'org_1',
      metaBusinessAccountId: 'waba_1',
      metaAppId: 'app_1',
      metaPhoneNumberId: 'phone_1',
    },
    headers: {},
  };

  const tenant = resolveTenantContext(req);

  assert.equal(tenant.organizationId, 'org_1');
  assert.equal(tenant.metaBusinessAccountId, 'waba_1');
  assert.equal(tenant.metaAppId, 'app_1');
  assert.equal(tenant.metaPhoneNumberId, 'phone_1');
});

test('requireTenantContext returns error when required fields are missing', () => {
  const middleware = requireTenantContext({
    requireOrganizationId: true,
    requireMetaBusinessAccountId: true,
    requireMetaAppId: true,
  });

  const req = {
    user: {},
    headers: {},
  };

  let nextError = null;

  middleware(req, {}, (error) => {
    nextError = error;
  });

  assert.equal(nextError.statusCode, 400);
  assert.equal(nextError.code, 'TENANT_CONTEXT_MISSING');
  assert.deepEqual(nextError.details.missing, [
    'organizationId',
    'metaBusinessAccountId',
    'metaAppId',
  ]);
});

test('requireTenantContext attaches tenant context from headers when absent in token', () => {
  const middleware = requireTenantContext({
    requireOrganizationId: true,
    requireMetaBusinessAccountId: true,
    requireMetaAppId: true,
    requireMetaPhoneNumberId: true,
  });

  const req = {
    user: {},
    headers: {
      'x-organization-id': 'org_h',
      'x-meta-business-account-id': 'waba_h',
      'x-meta-app-id': 'app_h',
      'x-meta-phone-number-id': 'phone_h',
    },
  };

  let nextError = null;

  middleware(req, {}, (error) => {
    nextError = error;
  });

  assert.equal(nextError, undefined);
  assert.equal(req.tenant.organizationId, 'org_h');
  assert.equal(req.tenant.metaBusinessAccountId, 'waba_h');
  assert.equal(req.tenant.metaAppId, 'app_h');
  assert.equal(req.tenant.metaPhoneNumberId, 'phone_h');
});
