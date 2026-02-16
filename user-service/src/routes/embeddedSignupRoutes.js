import express from 'express';
import EmbeddedSignupController from '../controllers/embeddedSignupController.js';
import verifyToken from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /user-service/api/embedded-signup/initialize
 * @desc    Initialize Embedded Signup session
 * @access  Private
 */
router.post('/initialize', verifyToken, EmbeddedSignupController.initializeSignup);

/**
 * @route   POST /user-service/api/embedded-signup/callback
 * @desc    Handle OAuth callback from Facebook
 * @access  Private
 */
router.post('/callback', verifyToken, EmbeddedSignupController.handleCallback);

/**
 * @route   POST /user-service/api/embedded-signup/exchange-code
 * @desc    Exchange authorization code and complete full signup (like nyife-dev)
 * @access  Private
 */
router.post('/exchange-code', verifyToken, EmbeddedSignupController.handleExchangeCode);

/**
 * @route   POST /user-service/api/embedded-signup/complete
 * @desc    Complete Embedded Signup with WABA and Phone details
 * @access  Private
 */
router.post('/complete', verifyToken, EmbeddedSignupController.completeSignup);

/**
 * @route   GET /user-service/api/embedded-signup/accounts
 * @desc    Get all connected WABA accounts
 * @access  Private
 */
router.get('/accounts', verifyToken, EmbeddedSignupController.getConnectedAccounts);

/**
 * @route   DELETE /user-service/api/embedded-signup/accounts/:wabaId
 * @desc    Disconnect a WABA account
 * @access  Private
 */
router.delete('/accounts/:wabaId', verifyToken, EmbeddedSignupController.disconnectAccount);

/**
 * @route   POST /user-service/api/embedded-signup/accounts/:wabaId/refresh-token
 * @desc    Refresh access token for a WABA account
 * @access  Private
 */
router.post('/accounts/:wabaId/refresh-token', verifyToken, EmbeddedSignupController.refreshToken);

/**
 * @route   POST /user-service/api/embedded-signup/accounts/:wabaId/refresh
 * @desc    Refresh all WABA data from Meta
 * @access  Private
 */
router.post('/accounts/:wabaId/refresh', verifyToken, EmbeddedSignupController.refreshWabaData);

/**
 * @route   GET /user-service/api/embedded-signup/accounts/:wabaId/review-status
 * @desc    Get account review status
 * @access  Private
 */
router.get('/accounts/:wabaId/review-status', verifyToken, EmbeddedSignupController.getAccountReviewStatus);

/**
 * @route   POST /user-service/api/embedded-signup/accounts/:wabaId/webhook
 * @desc    Override webhook callback URL
 * @access  Private
 */
router.post('/accounts/:wabaId/webhook', verifyToken, EmbeddedSignupController.overrideWebhookCallback);

/**
 * @route   POST /user-service/api/embedded-signup/accounts/:wabaId/sync-templates
 * @desc    Sync templates from Meta
 * @access  Private
 */
router.post('/accounts/:wabaId/sync-templates', verifyToken, EmbeddedSignupController.syncTemplates);

/**
 * @route   GET /user-service/api/embedded-signup/phone/:phoneNumberId/status
 * @desc    Get phone number status and quality
 * @access  Private
 */
router.get('/phone/:phoneNumberId/status', verifyToken, EmbeddedSignupController.getPhoneNumberStatus);

/**
 * @route   GET /user-service/api/embedded-signup/phone/:phoneNumberId/details
 * @desc    Get detailed phone number information
 * @access  Private
 */
router.get('/phone/:phoneNumberId/details', verifyToken, EmbeddedSignupController.getPhoneNumberDetails);

/**
 * @route   GET /user-service/api/embedded-signup/phone/:phoneNumberId/business-profile
 * @desc    Get business profile for phone number
 * @access  Private
 */
router.get('/phone/:phoneNumberId/business-profile', verifyToken, EmbeddedSignupController.getBusinessProfile);

/**
 * @route   POST /user-service/api/embedded-signup/phone/:phoneNumberId/business-profile
 * @desc    Update business profile for phone number
 * @access  Private
 */
router.post('/phone/:phoneNumberId/business-profile', verifyToken, EmbeddedSignupController.updateBusinessProfile);

/**
 * @route   GET /user-service/api/embedded-signup/accounts/:wabaId/verification
 * @desc    Get business verification status
 * @access  Private
 */
router.get('/accounts/:wabaId/verification', verifyToken, EmbeddedSignupController.initializeBusinessVerification);

export default router;
