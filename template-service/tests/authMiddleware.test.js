import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import verifyToken from '../src/middleware/auth.js';
import env from '../src/config/env.js';

test('verifyToken attaches authenticated user context', () => {
  const token = jwt.sign(
    {
      id: 42,
      organizationId: 'org_001',
      metaBusinessAccountId: 'waba_123',
      metaAppId: '1234567890',
      metaPhoneNumberId: '1098765432',
    },
    env.jwtSecret
  );

  const req = {
    headers: {
      authorization: `Bearer ${token}`,
    },
  };

  let nextError = null;

  verifyToken(req, {}, (error) => {
    nextError = error;
  });

  assert.equal(nextError, undefined);
  assert.equal(req.user.id, 42);
  assert.equal(req.user.organizationId, 'org_001');
  assert.equal(req.user.metaBusinessAccountId, 'waba_123');
  assert.equal(req.user.metaAppId, '1234567890');
  assert.equal(req.user.metaPhoneNumberId, '1098765432');
});

test('verifyToken returns error when token is missing', () => {
  const req = {
    headers: {},
  };

  let nextError = null;

  verifyToken(req, {}, (error) => {
    nextError = error;
  });

  assert.equal(nextError.statusCode, 401);
  assert.equal(nextError.code, 'AUTH_TOKEN_MISSING');
});

test('verifyToken returns error for invalid token', () => {
  const req = {
    headers: {
      authorization: 'Bearer invalid-token',
    },
  };

  let nextError = null;

  verifyToken(req, {}, (error) => {
    nextError = error;
  });

  assert.equal(nextError.statusCode, 401);
  assert.equal(nextError.code, 'AUTH_INVALID_TOKEN');
});

