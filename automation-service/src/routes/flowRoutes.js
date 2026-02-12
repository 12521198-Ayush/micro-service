import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth.js';
import {
  getFlows,
  getFlow,
  createFlow,
  updateFlow,
  duplicateFlow,
  uploadMedia,
  deleteFlow,
  executeFlow,
  continueDelayedFlow,
  checkActiveFlow
} from '../controllers/flowController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB

// Authenticated CRUD routes
router.use(authenticateToken);

router.get('/', getFlows);
router.get('/:uuid', getFlow);
router.post('/', createFlow);
router.put('/:uuid', updateFlow);
router.get('/duplicate/:uuid', duplicateFlow);
router.post('/upload-media/:uuid/:stepId', upload.single('file'), uploadMedia);
router.delete('/:uuid', deleteFlow);

// Flow execution routes (called by other services)
router.post('/execute', executeFlow);
router.get('/active/:contactId', checkActiveFlow);

// Internal routes
router.post('/internal/continue-delayed', continueDelayedFlow);

export default router;
