import express from 'express';
import verifyToken from '../../middleware/auth.js';
import asyncHandler from '../../middleware/asyncHandler.js';
import { requireTenantContext } from '../../middleware/tenantContext.js';
import {
  disableTenantWebhookConfig,
  getTenantWebhookConfig,
  listTenantWebhookEvents,
  retryTenantWebhookEvent,
  upsertTenantWebhookConfig,
} from '../controllers/webhookConfigController.js';

const router = express.Router();

router.use(verifyToken);
router.use(
  requireTenantContext({
    requireOrganizationId: true,
    requireMetaBusinessAccountId: true,
    requireMetaAppId: true,
  })
);

router.get('/config', asyncHandler(getTenantWebhookConfig));
router.put('/config', asyncHandler(upsertTenantWebhookConfig));
router.delete('/config', asyncHandler(disableTenantWebhookConfig));

router.get('/events', asyncHandler(listTenantWebhookEvents));
router.post('/events/:eventId/retry', asyncHandler(retryTenantWebhookEvent));

export default router;
