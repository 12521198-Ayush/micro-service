import axios from 'axios';
import crypto from 'crypto';

const KAFKA_SERVICE_URL = process.env.KAFKA_SERVICE_URL || 'http://localhost:3007';
const WEBHOOK_VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN;

/**
 * @desc    Verify webhook (GET request from Meta)
 * @route   GET /api/whatsapp/webhook
 * @access  Public
 */
export const verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    console.log('Webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    console.error('Webhook verification failed');
    res.sendStatus(403);
  }
};

/**
 * @desc    Receive webhook events (POST from Meta)
 * @route   POST /api/whatsapp/webhook
 * @access  Public
 */
export const receiveWebhook = async (req, res) => {
  try {
    const body = req.body;

    // Verify webhook signature if configured
    if (process.env.META_APP_SECRET) {
      const signature = req.headers['x-hub-signature-256'];
      if (!verifySignature(req.rawBody, signature)) {
        console.error('Invalid webhook signature');
        return res.sendStatus(403);
      }
    }

    // Acknowledge receipt immediately (Meta expects 200 within 5 seconds)
    res.sendStatus(200);

    // Process the webhook asynchronously
    if (body.object === 'whatsapp_business_account') {
      await processWebhookPayload(body);
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Still return 200 to prevent retries
    res.sendStatus(200);
  }
};

/**
 * Verify webhook signature using app secret
 */
function verifySignature(payload, signature) {
  if (!signature) return false;

  const expectedSignature = crypto
    .createHmac('sha256', process.env.META_APP_SECRET)
    .update(payload)
    .digest('hex');

  return `sha256=${expectedSignature}` === signature;
}

/**
 * Process webhook payload - forward to Kafka service
 */
async function processWebhookPayload(payload) {
  try {
    // Forward to Kafka service for processing
    await axios.post(`${KAFKA_SERVICE_URL}/api/webhook-event`, payload);
    console.log('Webhook event forwarded to Kafka service');
  } catch (error) {
    console.error('Failed to forward webhook to Kafka:', error.message);
    // Store locally for retry if Kafka service is unavailable
    await storeFailedWebhook(payload);
  }
}

/**
 * Store failed webhook for later retry
 */
async function storeFailedWebhook(payload) {
  // In production, store to database or file for retry
  console.log('Storing failed webhook for retry:', JSON.stringify(payload).substring(0, 200));
}

/**
 * @desc    Get webhook status
 * @route   GET /api/whatsapp/webhook/status
 * @access  Private
 */
export const getWebhookStatus = async (req, res) => {
  try {
    const config = req.wabaConfig || {};
    
    res.json({
      success: true,
      data: {
        configured: !!WEBHOOK_VERIFY_TOKEN,
        wabaId: config.wabaId,
        subscribedFields: [
          'messages',
          'message_template_status_update',
          'account_update',
          'phone_number_quality_update',
          'template_category_update',
          'flows'
        ]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export default {
  verifyWebhook,
  receiveWebhook,
  getWebhookStatus
};
