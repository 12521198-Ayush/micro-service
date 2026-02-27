import Campaign from '../models/Campaign.js';
import { cache } from '../config/redis.js';
import cacheKeys from '../utils/cacheKeys.js';
import {
  publishCampaignStarted,
  publishCampaignPaused,
  publishCampaignResumed,
  publishCampaignCancelled,
  queueCampaignMessages
} from '../services/kafkaProducer.js';
import axios from 'axios';

// Service URLs
const CONTACT_SERVICE_URL = process.env.CONTACT_SERVICE_URL || 'http://localhost:3002';
const TEMPLATE_SERVICE_URL = process.env.TEMPLATE_SERVICE_URL || 'http://localhost:3004';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3000';

// @desc    Start/Execute a campaign
// @route   POST /api/campaigns/:id/execute
// @access  Private
export const executeCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user.userId;
    const authToken = req.headers.authorization;

    // Get campaign details
    const campaign = await Campaign.findById(id, userId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Validate campaign status
    if (campaign.status === 'running') {
      return res.status(400).json({
        success: false,
        error: 'Campaign is already running'
      });
    }

    if (campaign.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Campaign has already been executed'
      });
    }

    // Get template details (use internal endpoint - scoped by org only, not WABA)
    const templateResponse = await axios.get(
      `${TEMPLATE_SERVICE_URL}/api/internal/templates/${campaign.template_id}`,
      { headers: { Authorization: authToken } }
    );
    const template = templateResponse.data.data;

    // Get group contacts - use the contacts/group endpoint which queries the direct group_id FK
    const contactsResponse = await axios.get(
      `${CONTACT_SERVICE_URL}/api/contacts/group/${campaign.group_id}?limit=10000`,
      { headers: { Authorization: authToken } }
    );
    const contacts = contactsResponse.data.data || [];

    if (contacts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No contacts found in the selected group'
      });
    }

    // Parse campaign metadata once
    const campaignMetadata = campaign.metadata
      ? (typeof campaign.metadata === 'string' ? JSON.parse(campaign.metadata) : campaign.metadata)
      : {};
    const selectedWabaId = campaignMetadata.wabaId || campaignMetadata.waba_id || null;
    const selectedPhoneNumberId = campaignMetadata.phoneNumberId || campaignMetadata.phone_number_id || null;

    // Get user's WABA details
    const userResponse = await axios.get(
      `${USER_SERVICE_URL}/user-service/api/embedded-signup/accounts`,
      { headers: { Authorization: authToken } }
    );
    const wabaAccounts = userResponse.data.data || [];

    if (wabaAccounts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No WhatsApp Business Account connected. Please complete the embedded signup first.'
      });
    }

    // Match WABA account based on selected WABA or template WABA
    const templateWabaId = template.meta_business_account_id || template.metaBusinessAccountId || template.waba_id;
    let wabaAccount = null;

    if (selectedWabaId) {
      wabaAccount = wabaAccounts.find(a => a.wabaId === selectedWabaId);
      if (!wabaAccount) {
        return res.status(400).json({
          success: false,
          error: 'Selected WABA account is not connected'
        });
      }
    } else if (templateWabaId) {
      wabaAccount = wabaAccounts.find(a => a.wabaId === templateWabaId);
    }

    // Fallback to first account if no match
    if (!wabaAccount) {
      wabaAccount = wabaAccounts[0];
      console.warn(`Could not match template WABA ${templateWabaId} to user accounts, using first account ${wabaAccount.wabaId}`);
    }

    let phoneNumber = null;
    if (selectedPhoneNumberId) {
      phoneNumber = wabaAccount.phoneNumbers?.find(p => p.phoneNumberId === selectedPhoneNumberId);
      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          error: 'Selected phone number is not connected to the chosen WABA account'
        });
      }
    } else {
      phoneNumber = wabaAccount.phoneNumbers?.[0];
    }
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'No phone number connected to the WhatsApp Business Account'
      });
    }

    console.log(`Campaign ${id}: Using WABA ${wabaAccount.wabaId}, phone ${phoneNumber.phoneNumberId} for template "${template.name}" (lang: ${template.language})`);

    // Update campaign status to running with template/WABA details
    await Campaign.update(id, userId, {
      status: 'running',
      total_recipients: contacts.length,
      started_at: new Date(),
      template_name: template.name || null
    });

    // Create campaign logs for each contact
    for (const contact of contacts) {
      await Campaign.createLog({
        campaignId: id,
        contactId: contact.id,
        contactName: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
        phoneNumber: `${contact.countryCode || ''}${contact.phone || contact.phone_number || ''}`,
        status: 'pending'
      });
    }

    // Parse campaign metadata for template parameters

    // Prepare recipients for Kafka
    const recipients = contacts.map(contact => ({
      phone: `${contact.countryCode || ''}${contact.phone || contact.phone_number || ''}`,
      name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
      contactId: contact.id,
      variables: {
        name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
        first_name: contact.firstName || '',
        last_name: contact.lastName || '',
        phone: contact.phone || contact.phone_number || '',
        email: contact.email || '',
        ...(campaignMetadata.bodyParameters || {})
      }
    }));

    // Get access token for the matched WABA
    const accessToken = await getAccessToken(wabaAccount.wabaId, userId, authToken);

    // Use the exact language from the template (e.g. "en_US", not "en")
    const templateLanguage = template.language || 'en_US';

    // Publish campaign started event to Kafka
    await publishCampaignStarted(id, {
      phoneNumberId: phoneNumber.phoneNumberId,
      wabaId: wabaAccount.wabaId,
      accessToken,
      templateName: template.name,
      language: templateLanguage,
      // Pass the pre-built components from campaign metadata (built by the UI)
      // These are the actual WhatsApp API component parameters (header, body, buttons)
      components: campaignMetadata.components || [],
      // Also pass the full template components definition for reference
      templateComponents: template.components || [],
      recipients
    });

    // Invalidate caches
    await cache.delete(cacheKeys.campaign(userId, id));
    await cache.deletePattern(cacheKeys.patterns.userCampaigns(userId));

    res.json({
      success: true,
      message: 'Campaign execution started',
      data: {
        campaignId: id,
        totalRecipients: contacts.length,
        status: 'running'
      }
    });
  } catch (error) {
    console.error('Error executing campaign:', error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error || error.message
    });
  }
};

// @desc    Pause a running campaign
// @route   POST /api/campaigns/:id/pause
// @access  Private
export const pauseCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user.userId;

    const campaign = await Campaign.findById(id, userId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    if (campaign.status !== 'running') {
      return res.status(400).json({
        success: false,
        error: 'Campaign is not running'
      });
    }

    // Update status
    await Campaign.update(id, userId, { status: 'paused' });

    // Publish pause event to Kafka
    await publishCampaignPaused(id);

    // Invalidate caches
    await cache.delete(cacheKeys.campaign(userId, id));
    await cache.deletePattern(cacheKeys.patterns.userCampaigns(userId));

    res.json({
      success: true,
      message: 'Campaign paused successfully'
    });
  } catch (error) {
    console.error('Error pausing campaign:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Resume a paused campaign
// @route   POST /api/campaigns/:id/resume
// @access  Private
export const resumeCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user.userId;

    const campaign = await Campaign.findById(id, userId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    if (campaign.status !== 'paused') {
      return res.status(400).json({
        success: false,
        error: 'Campaign is not paused'
      });
    }

    // Update status
    await Campaign.update(id, userId, { status: 'running' });

    // Publish resume event to Kafka
    await publishCampaignResumed(id);

    // Invalidate caches
    await cache.delete(cacheKeys.campaign(userId, id));
    await cache.deletePattern(cacheKeys.patterns.userCampaigns(userId));

    res.json({
      success: true,
      message: 'Campaign resumed successfully'
    });
  } catch (error) {
    console.error('Error resuming campaign:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Cancel a campaign
// @route   POST /api/campaigns/:id/cancel
// @access  Private
export const cancelCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user.userId;

    const campaign = await Campaign.findById(id, userId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    if (!['running', 'paused', 'scheduled'].includes(campaign.status)) {
      return res.status(400).json({
        success: false,
        error: 'Campaign cannot be cancelled'
      });
    }

    // Update status
    await Campaign.update(id, userId, { status: 'cancelled' });

    // Publish cancel event to Kafka
    await publishCampaignCancelled(id);

    // Invalidate caches
    await cache.delete(cacheKeys.campaign(userId, id));
    await cache.deletePattern(cacheKeys.patterns.userCampaigns(userId));

    res.json({
      success: true,
      message: 'Campaign cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling campaign:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get campaign analytics
// @route   GET /api/campaigns/:id/analytics
// @access  Private
export const getCampaignAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user.userId;

    // Check cache first
    const cacheKey = `campaign_analytics:${userId}:${id}`;
    const cachedData = await cache.get(cacheKey);

    if (cachedData) {
      return res.json({
        success: true,
        data: cachedData,
        cached: true
      });
    }

    const campaign = await Campaign.findById(id, userId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Get analytics from database
    const analytics = await Campaign.getAnalytics(id);

    const responseData = {
      campaignId: id,
      campaignName: campaign.name,
      status: campaign.status,
      totalRecipients: campaign.total_recipients || 0,
      ...analytics,
      deliveryRate: analytics.sent_count > 0 
        ? ((analytics.delivered_count / analytics.sent_count) * 100).toFixed(2) 
        : 0,
      readRate: analytics.delivered_count > 0 
        ? ((analytics.read_count / analytics.delivered_count) * 100).toFixed(2) 
        : 0,
      failureRate: analytics.sent_count > 0 
        ? ((analytics.failed_count / analytics.sent_count) * 100).toFixed(2) 
        : 0
    };

    // Cache for 1 minute (analytics data changes frequently)
    await cache.set(cacheKey, responseData, 60);

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Error fetching campaign analytics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get campaign message log
// @route   GET /api/campaigns/:id/messages
// @access  Private
export const getCampaignMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user.userId;
    const { status, page = 1, limit = 50 } = req.query;

    const campaign = await Campaign.findById(id, userId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const messages = await Campaign.getMessages(id, {
      status,
      limit: parseInt(limit),
      offset
    });

    const total = await Campaign.getMessagesCount(id, status);

    res.json({
      success: true,
      count: messages.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: messages
    });
  } catch (error) {
    console.error('Error fetching campaign messages:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Schedule a campaign
// @route   POST /api/campaigns/:id/schedule
// @access  Private
export const scheduleCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user.userId;
    const { scheduledAt } = req.body;

    if (!scheduledAt) {
      return res.status(400).json({
        success: false,
        error: 'Scheduled date/time is required'
      });
    }

    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate <= new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Scheduled time must be in the future'
      });
    }

    const campaign = await Campaign.findById(id, userId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    if (!['draft', 'scheduled'].includes(campaign.status)) {
      return res.status(400).json({
        success: false,
        error: 'Only draft or scheduled campaigns can be rescheduled'
      });
    }

    // Update campaign
    await Campaign.update(id, userId, {
      status: 'scheduled',
      scheduled_at: scheduledDate
    });

    // Invalidate caches
    await cache.delete(cacheKeys.campaign(userId, id));
    await cache.deletePattern(cacheKeys.patterns.userCampaigns(userId));

    res.json({
      success: true,
      message: 'Campaign scheduled successfully',
      data: {
        campaignId: id,
        scheduledAt: scheduledDate
      }
    });
  } catch (error) {
    console.error('Error scheduling campaign:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Helper function to get access token for a WABA
async function getAccessToken(wabaId, userId, authToken) {
  // Query the user_service DB directly for the stored access token
  try {
    const pool = (await import('../config/database.js')).default;
    const [rows] = await pool.execute(
      'SELECT access_token FROM user_service.waba_accounts WHERE waba_id = ? AND user_id = ?',
      [wabaId, userId]
    );
    if (rows.length > 0 && rows[0].access_token) {
      return rows[0].access_token;
    }
  } catch (dbError) {
    console.error('Error fetching access token from DB:', dbError.message);
  }

  // Fallback: try environment variable
  if (process.env.WHATSAPP_ACCESS_TOKEN) {
    return process.env.WHATSAPP_ACCESS_TOKEN;
  }

  throw new Error('Unable to retrieve WhatsApp access token for WABA: ' + wabaId);
}

export default {
  executeCampaign,
  pauseCampaign,
  resumeCampaign,
  cancelCampaign,
  getCampaignAnalytics,
  getCampaignMessages,
  scheduleCampaign
};
