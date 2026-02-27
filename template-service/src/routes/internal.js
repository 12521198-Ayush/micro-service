import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { pool } from '../config/database.js';

const router = express.Router();

// Internal routes for service-to-service communication
// These only require auth token, no tenant context headers needed

router.use(verifyToken);

/**
 * GET /api/internal/templates/:uuid
 * Fetch a template by UUID without tenant context scoping.
 * Used by campaign-service to get template details for execution.
 */
router.get(
  '/templates/:uuid',
  asyncHandler(async (req, res) => {
    const { uuid } = req.params;

    const [rows] = await pool.execute(
      `SELECT * FROM whatsapp_templates WHERE uuid = ? AND deleted_at IS NULL LIMIT 1`,
      [uuid]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'TEMPLATE_NOT_FOUND', message: 'Template not found' },
      });
    }

    const template = rows[0];

    res.status(200).json({
      success: true,
      data: template,
    });
  })
);

export default router;
