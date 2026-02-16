/**
 * Flow Service
 * Handles CRUD operations for automation flows
 * Replicates FlowService from nyife-dev
 */
import Flow from '../models/Flow.js';
import FlowMedia from '../models/FlowMedia.js';
import FlowValidator from './FlowValidator.js';
import path from 'path';
import fs from 'fs';

class FlowService {
  /**
   * Get flows with analytics for a user
   */
  async getRows(userId, { search = '', page = 1, limit = 10 } = {}) {
    const flows = await Flow.listByUser(userId, { search, page, limit });
    const analytics = await Flow.getAnalytics(userId);

    return {
      flows,
      analytics
    };
  }

  /**
   * Create a new flow
   */
  async createFlow(data) {
    return Flow.create({
      organization_id: data.organization_id,
      user_id: data.user_id,
      name: data.name,
      description: data.description || null
    });
  }

  /**
   * Update a flow (save/publish/unpublish)
   */
  async updateFlow(uuid, data, publish) {
    const validator = new FlowValidator();
    let flow = await Flow.findByUuid(uuid);
    if (!flow) throw new Error('Flow not found');

    // Validate existing metadata
    if (flow.metadata) {
      const metadataArray = JSON.parse(flow.metadata);
      const result = validator.validateMessageNodes(metadataArray);
      if (typeof result === 'object' && result !== true) {
        data.status = 'inactive';
      }
    }

    // Update basic fields
    const updateData = {
      name: data.name !== undefined ? data.name : flow.name,
      description: data.description !== undefined ? data.description : flow.description,
      metadata: data.metadata !== undefined ? data.metadata : flow.metadata
    };

    await Flow.update(uuid, updateData);

    // Re-read flow after update
    flow = await Flow.findByUuid(uuid);

    // Extract trigger and keywords from metadata
    if (flow.metadata) {
      const metadataArray = JSON.parse(flow.metadata);
      const trigger = metadataArray.nodes?.[0]?.data?.metadata?.fields?.type || null;
      const keywords = metadataArray.nodes?.[0]?.data?.metadata?.fields?.keywords || null;

      const result = validator.validateMessageNodes(metadataArray);
      const triggerUpdate = { trigger, keywords: Array.isArray(keywords) ? keywords.join(',') : keywords };
      if (typeof result === 'object' && result !== true) {
        triggerUpdate.status = 'inactive';
      }

      await Flow.update(uuid, triggerUpdate);
    }

    // Handle publish/unpublish
    if (publish !== undefined && publish !== null) {
      const status = publish ? 'active' : 'inactive';

      if (publish) {
        if (!flow.metadata) {
          return {
            success: false,
            errors: { general: 'Flow has no metadata to publish.' },
            status: 'inactive'
          };
        }

        const metadataArray = JSON.parse(flow.metadata);
        const result = validator.validateMessageNodes(metadataArray);

        if (result === true) {
          await Flow.update(uuid, { status });
          return {
            success: true,
            message: 'Flow saved & published successfully!',
            status: 'active'
          };
        } else {
          return {
            success: false,
            errors: result,
            status: 'inactive'
          };
        }
      } else {
        await Flow.update(uuid, { status });
        return {
          success: true,
          message: 'Flow saved & unpublished successfully!',
          status: 'inactive'
        };
      }
    }

    return {
      success: true,
      message: 'Flow saved successfully!',
      status: flow.status
    };
  }

  /**
   * Duplicate a flow
   */
  async duplicateFlow(uuid) {
    return Flow.duplicate(uuid);
  }

  /**
   * Upload media for a flow step
   */
  async uploadMedia(file, uuid, stepId) {
    const flow = await Flow.findByUuid(uuid);
    if (!flow) throw new Error('Flow not found');

    // Save file locally
    const uploadsDir = path.join(process.cwd(), 'uploads', 'flow-media');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, file.buffer);

    const mediaUrl = `${process.env.APP_URL || 'http://localhost:3008'}/uploads/flow-media/${fileName}`;

    const flowMedia = await FlowMedia.create({
      flow_id: flow.id,
      step_id: stepId,
      path: mediaUrl,
      location: 'local',
      metadata: JSON.stringify({
        name: file.originalname,
        extension: file.mimetype,
        size: file.size
      })
    });

    return flowMedia;
  }

  /**
   * Delete a flow (soft delete)
   */
  async deleteFlow(uuid) {
    return Flow.delete(uuid);
  }
}

export default FlowService;
