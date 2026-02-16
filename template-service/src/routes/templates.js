import express from 'express';
import verifyToken from '../middleware/auth.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { uploadTemplateMediaFile } from '../middleware/upload.js';
import { requireTenantContext } from '../middleware/tenantContext.js';
import {
  createTemplate,
  deleteTemplate,
  getTemplateByUuid,
  getTemplateCapabilities,
  listTemplates,
  publishTemplate,
  syncTemplates,
  uploadTemplateMedia,
  updateTemplate,
  validateTemplatePayloadController,
} from '../controllers/templateController.js';

const router = express.Router();

router.use(verifyToken);
router.use(
  requireTenantContext({
    requireOrganizationId: true,
    requireMetaBusinessAccountId: true,
    requireMetaAppId: true,
  })
);

router.get('/capabilities', asyncHandler(getTemplateCapabilities));
router.post('/validate', asyncHandler(validateTemplatePayloadController));
router.post('/sync', asyncHandler(syncTemplates));
router.post(
  '/media/upload',
  uploadTemplateMediaFile,
  asyncHandler(uploadTemplateMedia)
);

router.get('/', asyncHandler(listTemplates));
router.post('/', asyncHandler(createTemplate));
router.get('/:uuid', asyncHandler(getTemplateByUuid));
router.put('/:uuid', asyncHandler(updateTemplate));
router.patch('/:uuid', asyncHandler(updateTemplate));
router.post('/:uuid/publish', asyncHandler(publishTemplate));
router.delete('/:uuid', asyncHandler(deleteTemplate));

export default router;
