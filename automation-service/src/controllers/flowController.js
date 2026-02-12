/**
 * Flow Controller
 * Handles HTTP requests for automation flows CRUD operations
 */
import FlowService from '../services/FlowService.js';
import FlowExecutionService from '../services/FlowExecutionService.js';
import Flow from '../models/Flow.js';
import { actionsConfig } from '../config/actions.js';
import { cache } from '../config/redis.js';
import axios from 'axios';

const flowService = new FlowService();

const CONTACT_SERVICE_URL = process.env.CONTACT_SERVICE_URL || 'http://localhost:3002';

/**
 * Get all flows for the user's organization with analytics
 */
export const getFlows = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { search, page, limit } = req.query;

    const result = await flowService.getRows(userId, {
      search: search || '',
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10
    });

    res.json({
      success: true,
      data: result.flows,
      analytics: result.analytics
    });
  } catch (error) {
    console.error('Error getting flows:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get a single flow by UUID
 */
export const getFlow = async (req, res) => {
  try {
    const { uuid } = req.params;
    const flow = await Flow.findByUuid(uuid);

    if (!flow) {
      return res.status(404).json({ success: false, error: 'Flow not found' });
    }

    // Get contact groups from contact-service
    let contactGroups = [];
    let contactFields = [];
    try {
      const authToken = req.headers['authorization'];
      const groupsResponse = await axios.get(
        `${CONTACT_SERVICE_URL}/api/groups`,
        { headers: { Authorization: authToken } }
      );
      contactGroups = (groupsResponse.data?.data || groupsResponse.data || []).map(g => ({
        value: g.id,
        label: g.name
      }));
    } catch (err) {
      console.warn('Could not fetch contact groups:', err.message);
    }

    // Get available actions from config
    const availableActions = Object.entries(actionsConfig)
      .filter(([, enabled]) => enabled)
      .map(([action]) => action);

    res.json({
      success: true,
      data: {
        flow,
        contactGroups,
        contactFields,
        availableActions
      }
    });
  } catch (error) {
    console.error('Error getting flow:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Create a new flow
 */
export const createFlow = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const flow = await flowService.createFlow({
      organization_id: userId,
      user_id: userId,
      name,
      description
    });

    await cache.deletePattern(`flows:user:${userId}:*`);

    res.status(201).json({
      success: true,
      message: 'Flow automation created successfully!',
      data: flow
    });
  } catch (error) {
    console.error('Error creating flow:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Update a flow (save metadata, publish/unpublish)
 */
export const updateFlow = async (req, res) => {
  try {
    const { uuid } = req.params;
    const userId = req.user.id || req.user.userId;
    const { name, description, metadata, publish } = req.body;

    const result = await flowService.updateFlow(uuid, { name, description, metadata }, publish);

    await cache.deletePattern(`flows:user:${userId}:*`);

    res.json(result);
  } catch (error) {
    console.error('Error updating flow:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Duplicate a flow
 */
export const duplicateFlow = async (req, res) => {
  try {
    const { uuid } = req.params;
    const userId = req.user.id || req.user.userId;

    const flow = await flowService.duplicateFlow(uuid);

    await cache.deletePattern(`flows:user:${userId}:*`);

    res.json({
      success: true,
      message: 'Flow copied successfully!',
      data: flow
    });
  } catch (error) {
    console.error('Error duplicating flow:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Upload media for a flow step
 */
export const uploadMedia = async (req, res) => {
  try {
    const { uuid, stepId } = req.params;

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const flowMedia = await flowService.uploadMedia(req.file, uuid, stepId);

    res.json({
      success: true,
      data: flowMedia
    });
  } catch (error) {
    console.error('Error uploading media:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Delete a flow
 */
export const deleteFlow = async (req, res) => {
  try {
    const { uuid } = req.params;
    const userId = req.user.id || req.user.userId;

    await flowService.deleteFlow(uuid);

    await cache.deletePattern(`flows:user:${userId}:*`);

    res.json({
      success: true,
      message: 'Flow automation deleted successfully!'
    });
  } catch (error) {
    console.error('Error deleting flow:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Execute flow for an incoming message (called by webhook/kafka)
 */
export const executeFlow = async (req, res) => {
  try {
    const { contactId, organizationId, message, isNewContact } = req.body;
    const authToken = req.headers['authorization']?.replace('Bearer ', '');

    const executionService = new FlowExecutionService(organizationId, authToken);
    const chat = { contact_id: contactId, organization_id: organizationId };
    const result = await executionService.executeFlow(chat, isNewContact || false, message || '');

    res.json({ success: true, executed: result });
  } catch (error) {
    console.error('Error executing flow:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Continue a delayed flow (internal endpoint)
 */
export const continueDelayedFlow = async (req, res) => {
  try {
    const internalKey = req.headers['x-internal-key'];
    if (internalKey !== (process.env.INTERNAL_API_KEY || 'internal-secret')) {
      return res.status(403).json({ error: 'Unauthorized internal call' });
    }

    const { contactId, flowId, currentStep, organizationId } = req.body;
    const authToken = req.headers['authorization']?.replace('Bearer ', '');

    const executionService = new FlowExecutionService(organizationId, authToken);
    await executionService.continueDelayedFlow(contactId, flowId, currentStep);

    res.json({ success: true });
  } catch (error) {
    console.error('Error continuing delayed flow:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Check if contact has active flow
 */
export const checkActiveFlow = async (req, res) => {
  try {
    const { contactId } = req.params;
    const userId = req.user.id || req.user.userId;
    const authToken = req.headers['authorization']?.replace('Bearer ', '');

    const executionService = new FlowExecutionService(userId, authToken);
    const hasActive = await executionService.hasActiveFlow(contactId);

    res.json({ success: true, hasActiveFlow: hasActive });
  } catch (error) {
    console.error('Error checking active flow:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export default {
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
};
