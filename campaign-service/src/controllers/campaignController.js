import Campaign from '../models/Campaign.js';
import { cache } from '../config/redis.js';
import cacheKeys from '../utils/cacheKeys.js';

// @desc    Create a new campaign
// @route   POST /api/campaigns
// @access  Private
export const createCampaign = async (req, res) => {
  try {
    const { name, description, templateId, groupId, scheduledAt, status } = req.body;
    const userId = req.user.id || req.user.userId;

    const campaign = await Campaign.create({
      userId,
      name,
      description,
      templateId,
      groupId,
      scheduledAt,
      status: status || 'draft'
    });

    // Invalidate user campaigns cache
    await cache.deletePattern(cacheKeys.patterns.userCampaigns(userId));

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      data: campaign
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get all campaigns for a user
// @route   GET /api/campaigns
// @access  Private
export const getCampaigns = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { status = '', page = 1, limit = 10 } = req.query;

    // Check cache first
    const cacheKey = cacheKeys.userCampaigns(userId, status, page, limit);
    const cachedData = await cache.get(cacheKey);

    if (cachedData) {
      return res.json({
        ...cachedData,
        cached: true
      });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const campaigns = await Campaign.findByUserId(userId, {
      status: status || undefined,
      limit: parseInt(limit),
      offset
    });

    const total = await Campaign.count(userId, status || null);

    const responseData = {
      success: true,
      count: campaigns.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: campaigns
    };

    // Cache for 5 minutes
    await cache.set(cacheKey, responseData, 300);

    res.json(responseData);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get single campaign by ID
// @route   GET /api/campaigns/:id
// @access  Private
export const getCampaignById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user.userId;

    // Check cache first
    const cacheKey = cacheKeys.campaign(userId, id);
    const cachedCampaign = await cache.get(cacheKey);

    if (cachedCampaign) {
      return res.json({
        success: true,
        data: cachedCampaign,
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

    // Cache for 10 minutes
    await cache.set(cacheKey, campaign, 600);

    res.json({
      success: true,
      data: campaign
    });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update campaign
// @route   PUT /api/campaigns/:id
// @access  Private
export const updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user.userId;
    const updateData = req.body;

    const updated = await Campaign.update(id, userId, updateData);

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Invalidate caches
    await cache.delete(cacheKeys.campaign(userId, id));
    await cache.deletePattern(cacheKeys.patterns.userCampaigns(userId));

    const campaign = await Campaign.findById(id, userId);

    res.json({
      success: true,
      message: 'Campaign updated successfully',
      data: campaign
    });
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Delete campaign
// @route   DELETE /api/campaigns/:id
// @access  Private
export const deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user.userId;

    const deleted = await Campaign.delete(id, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Invalidate caches
    await cache.delete(cacheKeys.campaign(userId, id));
    await cache.deletePattern(cacheKeys.patterns.userCampaigns(userId));

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export default {
  createCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign
};
