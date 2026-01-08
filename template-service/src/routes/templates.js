import express from 'express';
import verifyToken from '../middleware/auth.js';
import {
  createTemplate,
  listTemplates,
  syncTemplates,
  updateTemplate,
} from '../controllers/templateController.js';

const router = express.Router();

// POST - Create a new template (saves to Meta API + Database)
router.post('/create', verifyToken, createTemplate);

// POST - List all templates with optional filters (status, name)
router.post('/list', verifyToken, listTemplates);

// POST - Sync templates from Meta API to Database
router.post('/sync', verifyToken, syncTemplates);

// POST - Update template in Meta API and Database
router.post('/update/:uuid', verifyToken, updateTemplate);

export default router;
