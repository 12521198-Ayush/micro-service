import express from 'express';
import verifyToken from '../middleware/auth.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { uploadTemplateMediaFile } from '../middleware/upload.js';
import {
  createTemplate,
  deleteTemplate,
  getTemplateByUuid,
  getTemplateCapabilities,
  listTemplates,
  syncTemplates,
  uploadTemplateMedia,
  updateTemplate,
  validateTemplatePayloadController,
} from '../controllers/templateController.js';

const router = express.Router();

router.use(verifyToken);

router.get('/capabilities', asyncHandler(getTemplateCapabilities));
router.post('/validate', asyncHandler(validateTemplatePayloadController));
router.post('/sync', asyncHandler(syncTemplates));
router.post(
  '/media/upload',
  uploadTemplateMediaFile,
  asyncHandler(uploadTemplateMedia)
);

router.post('/create', asyncHandler(createTemplate));
router.post('/list', asyncHandler(listTemplates));
router.post('/update/:uuid', asyncHandler(updateTemplate));

router.get('/', asyncHandler(listTemplates));
router.post('/', asyncHandler(createTemplate));
router.get('/:uuid', asyncHandler(getTemplateByUuid));
router.patch('/:uuid', asyncHandler(updateTemplate));
router.delete('/:uuid', asyncHandler(deleteTemplate));

export default router;
