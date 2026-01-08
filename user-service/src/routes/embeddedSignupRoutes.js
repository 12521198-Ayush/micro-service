import express from 'express';
import EmbeddedSignupController from '../controllers/embeddedSignupController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /user-service/api/embedded-signup/initialize
 * @desc    Initialize Embedded Signup session
 * @access  Private
 */
router.post('/initialize', authenticate, EmbeddedSignupController.initializeSignup);

/**
 * @route   POST /user-service/api/embedded-signup/callback
 * @desc    Handle OAuth callback from Facebook
 * @access  Private
 */
router.post('/callback', authenticate, EmbeddedSignupController.handleCallback);

/**
 * @route   POST /user-service/api/embedded-signup/complete
 * @desc    Complete Embedded Signup with WABA and Phone details
 * @access  Private
 */
router.post('/complete', authenticate, EmbeddedSignupController.completeSignup);

/**
 * @route   GET /user-service/api/embedded-signup/accounts
 * @desc    Get all connected WABA accounts
 * @access  Private
 */
router.get('/accounts', authenticate, EmbeddedSignupController.getConnectedAccounts);

/**
 * @route   DELETE /user-service/api/embedded-signup/accounts/:wabaId
 * @desc    Disconnect a WABA account
 * @access  Private
 */
router.delete('/accounts/:wabaId', authenticate, EmbeddedSignupController.disconnectAccount);

/**
 * @route   POST /user-service/api/embedded-signup/accounts/:wabaId/refresh-token
 * @desc    Refresh access token for a WABA account
 * @access  Private
 */
router.post('/accounts/:wabaId/refresh-token', authenticate, EmbeddedSignupController.refreshToken);

/**
 * @route   GET /user-service/api/embedded-signup/phone/:phoneNumberId/status
 * @desc    Get phone number status and quality
 * @access  Private
 */
router.get('/phone/:phoneNumberId/status', authenticate, EmbeddedSignupController.getPhoneNumberStatus);

/**
 * @route   GET /user-service/api/embedded-signup/accounts/:wabaId/verification
 * @desc    Get business verification status
 * @access  Private
 */
router.get('/accounts/:wabaId/verification', authenticate, EmbeddedSignupController.initializeBusinessVerification);

export default router;
