import express from 'express';
import verifyToken from '../../middleware/auth.js';
import asyncHandler from '../../middleware/asyncHandler.js';
import attachTenantContext from '../middlewares/tenantContext.js';
import {
  cloneFlow,
  createFlow,
  deleteFlow,
  getFlowById,
  listFlows,
  publishFlow,
  retireFlow,
  syncFlowStatus,
  syncTenantFlowStatuses,
  updateFlow,
} from '../controllers/flowController.js';

const router = express.Router();

router.use(verifyToken);
router.use(attachTenantContext);

router.post('/', asyncHandler(createFlow));
router.get('/', asyncHandler(listFlows));
router.post('/sync-status', asyncHandler(syncTenantFlowStatuses));
router.get('/:id', asyncHandler(getFlowById));
router.put('/:id', asyncHandler(updateFlow));
router.delete('/:id', asyncHandler(deleteFlow));
router.post('/:id/publish', asyncHandler(publishFlow));
router.post('/:id/retire', asyncHandler(retireFlow));
router.post('/:id/sync-status', asyncHandler(syncFlowStatus));
router.post('/:id/clone', asyncHandler(cloneFlow));

export default router;
