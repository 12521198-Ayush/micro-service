import axios from 'axios';
import TemplateModel from '../models/templateModel.js';
import { cache } from '../config/redis.js';
import cacheKeys from '../utils/cacheKeys.js';

/**
 * Meta WhatsApp API Configuration
 */
const META_API_CONFIG = {
  baseURL: 'https://graph.facebook.com',
  version: process.env.META_API_VERSION || 'v20.0',
  accessToken: process.env.META_ACCESS_TOKEN,
};

/**
 * Initialize Axios instance for Meta API calls
 */
const metaApiClient = axios.create({
  baseURL: `${META_API_CONFIG.baseURL}/${META_API_CONFIG.version}`,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${META_API_CONFIG.accessToken}`,
  },
});


/**
 * Create WhatsApp Message Template
 * POST /api/templates/create
 *
 * @param {Object} req - Express request object
 * @param {Object} req.body - Template payload
 * @param {Object} res - Express response object
 */
export const createTemplate = async (req, res) => {
  try {
    const payload = req.body;
    const userId = req.user?.id || req.user?.userId;
    const businessAccountId = req.user?.metaBusinessAccountId;

    // Validate business account ID
    if (!businessAccountId) {
      return res.status(400).json({
        error: 'metaBusinessAccountId not found in token'
      });
    }

    // Call Meta API directly with user payload
    const metaResponse = await metaApiClient.post(
      `/${businessAccountId}/message_templates`,
      payload
    );

    // Save to database on successful Meta API response
    let dbResult;
    try {
      dbResult = await TemplateModel.createTemplate(
        {
          metaTemplateId: metaResponse.data.id,
          name: payload.name,
          category: payload.category,
          language: payload.language,
          components: payload.components,
          parameterFormat: payload.parameter_format,
          status: metaResponse.data.status || 'Pending'
        },
        userId
      );
    } catch (dbError) {
      console.error('Database save error (non-critical):', dbError.message);
    }

    // Invalidate user templates cache
    await cache.deletePattern(cacheKeys.patterns.userTemplates(userId));

    // Return Meta API response
    return res.status(201).json({
      ...metaResponse.data,
      databaseId: dbResult?.id,
      uuid: dbResult?.uuid
    });
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({
      error: error.message
    });
  }
};


/**
 * List all templates with optional filters
 * POST /api/templates/list
 *
 * @param {Object} req - Express request object
 * @param {Object} req.body - Filter parameters (optional)
 * @param {string} req.body.status - Optional status filter (Pending, approve, rejected)
 * @param {string} req.body.name - Optional name filter (partial match)
 * @param {Object} res - Express response object
 */
export const listTemplates = async (req, res) => {
  try {
    const { status = '', name = '' } = req.body;
    const userId = req.user?.id || req.user?.userId;
    
    // Check cache first
    const cacheKey = cacheKeys.userTemplates(userId, status, name);
    const cachedData = await cache.get(cacheKey);
    
    if (cachedData) {
      return res.status(200).json({
        ...cachedData,
        cached: true
      });
    }
    
    // Get templates from database with optional filters
    const templates = await TemplateModel.getAllTemplates({ status, name });

    const responseData = {
      success: true,
      count: templates.length,
      data: templates
    };

    // Cache the result for 5 minutes
    await cache.set(cacheKey, responseData, 300);

    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Error listing templates:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};


/**
 * Update WhatsApp Message Template
 * POST /api/templates/update/:uuid
 *
 * @param {Object} req - Express request object
 * @param {string} req.params.uuid - Template UUID
 * @param {Object} req.body - Update payload
 * @param {Object} res - Express response object
 */
export const updateTemplate = async (req, res) => {
  try {
    const { uuid } = req.params;
    const userId = req.user?.id || req.user?.userId;
    const payload = req.body;

    // Get existing template from database
    const template = await TemplateModel.getTemplateByUuid(uuid, userId);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // Build update request data
    const requestData = {
      category: template.status === 'approve' ? template.category : payload.category
    };

    // Add message TTL if provided
    if (payload.customize_ttl && payload.message_send_ttl_seconds) {
      requestData.message_send_ttl_seconds = payload.message_send_ttl_seconds;
    }

    // Initialize components array
    if (!requestData.components) {
      requestData.components = [];
    }

    // Handle HEADER component
    if (payload.category !== 'AUTHENTICATION') {
      if (payload.header?.format === 'TEXT') {
        if (payload.header.text) {
          const headerComponent = {
            type: "HEADER",
            format: payload.header.format,
            text: payload.header.text
          };

          if (payload.header.example && payload.header.example.length > 0) {
            headerComponent.example = { header_text: payload.header.example };
          }

          requestData.components.push(headerComponent);
        }
      } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(payload.header?.format)) {
        if (payload.header.example) {
          // Use existing header from metadata if no new example provided
          requestData.components.push({
            type: "HEADER",
            format: payload.header.format,
            example: {
              header_handle: [payload.header.example]
            }
          });
        } else {
          // Extract existing header from metadata
          const metadata = template.metadata;
          if (metadata?.components) {
            const existingHeader = metadata.components.find(c => c.type === 'HEADER');
            if (existingHeader) {
              requestData.components.push(existingHeader);
            }
          }
        }
      }
    }

    // Handle BODY component
    if (payload.category === 'AUTHENTICATION') {
      requestData.components.push({
        type: "BODY",
        add_security_recommendation: payload.body?.add_security_recommendation
      });
    } else {
      if (payload.body?.text) {
        const bodyComponent = {
          type: "BODY",
          text: payload.body.text
        };

        if (payload.body.example && payload.body.example.length > 0) {
          bodyComponent.example = { body_text: [payload.body.example] };
        }

        requestData.components.push(bodyComponent);
      }
    }

    // Handle FOOTER component
    if (payload.footer) {
      if (payload.category !== 'AUTHENTICATION') {
        if (payload.footer.text) {
          requestData.components.push({
            type: "FOOTER",
            text: payload.footer.text
          });
        }
      } else {
        requestData.components.push({
          type: "FOOTER",
          code_expiration_minutes: payload.footer.code_expiration_minutes
        });
      }
    }

    // Handle BUTTONS component
    if (payload.category !== 'AUTHENTICATION') {
      if (payload.buttons && payload.buttons.length > 0) {
        const buttonsComponent = {
          type: 'BUTTONS',
          buttons: []
        };

        const quickReplyButtons = [];
        const otherButtons = [];

        payload.buttons.forEach(button => {
          if (button.type === 'QUICK_REPLY') {
            quickReplyButtons.push({
              type: button.type,
              text: button.text
            });
          } else if (button.type === 'URL') {
            otherButtons.push({
              type: button.type,
              text: button.text,
              url: button.url
            });
          } else if (button.type === 'PHONE_NUMBER') {
            otherButtons.push({
              type: button.type,
              text: button.text,
              phone_number: (button.country || '') + button.phone_number
            });
          } else if (button.type === 'COPY_CODE') {
            otherButtons.push({
              type: button.type,
              example: button.example
            });
          }
        });

        // Quick reply buttons first, then other buttons
        buttonsComponent.buttons = [...quickReplyButtons, ...otherButtons];
        requestData.components.push(buttonsComponent);
      }
    } else {
      // Authentication button
      if (payload.authentication_button) {
        const button = {
          type: payload.authentication_button.type,
          otp_type: payload.authentication_button.otp_type,
          text: payload.authentication_button.text
        };

        if (payload.authentication_button.otp_type !== 'copy_code') {
          button.autofill_text = payload.authentication_button.autofill_text;
          button.supported_apps = payload.authentication_button.supported_apps;
        }

        if (payload.authentication_button.otp_type === 'zero_tap') {
          button.zero_tap_terms_accepted = payload.authentication_button.zero_tap_terms_accepted;
        }

        requestData.components.push({
          type: 'BUTTONS',
          buttons: [button]
        });
      }
    }

    // Call Meta API to update template
    const metaResponse = await metaApiClient.post(
      `/${template.metaTemplateId}`,
      requestData
    );

    // Update template in database
    const updatedTemplate = await TemplateModel.updateTemplate(
      uuid,
      {
        category: template.status === 'approve' ? template.category : payload.category,
        metadata: requestData.components,
        status: 'Pending' // Reset to Pending after update
      },
      userId
    );

    return res.status(200).json({
      success: true,
      message: 'Template updated successfully',
      data: {
        ...metaResponse.data,
        template: updatedTemplate
      }
    });
  } catch (error) {
    console.error('Error updating template:', error);
    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        error: error.response.data
      });
    }
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};


/**
 * Sync templates from Meta API to Database
 * POST /api/templates/sync
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const syncTemplates = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const businessAccountId = req.user?.metaBusinessAccountId;

    // Validate business account ID
    if (!businessAccountId) {
      return res.status(400).json({
        success: false,
        error: 'metaBusinessAccountId not found in token'
      });
    }

    let allTemplates = [];
    let url = `/${businessAccountId}/message_templates`;
    let hasNextPage = true;

    // Fetch all templates from Meta API with pagination
    while (hasNextPage) {
      try {
        const response = await metaApiClient.get(url);
        const { data, paging } = response.data;

        if (data && data.length > 0) {
          allTemplates = allTemplates.concat(data);
        }

        // Check if there's a next page
        if (paging && paging.next) {
          // Extract the URL path after the base URL
          const nextUrl = new URL(paging.next);
          url = nextUrl.pathname.replace(`/${META_API_CONFIG.version}`, '') + nextUrl.search;
        } else {
          hasNextPage = false;
        }
      } catch (error) {
        console.error('Error fetching templates from Meta API:', error);
        hasNextPage = false;
      }
    }

    // Sync templates to database
    const syncResults = {
      total: allTemplates.length,
      synced: 0,
      skipped: 0,
      failed: 0,
      details: []
    };

    // Map Meta status to database status
    const mapMetaStatus = (metaStatus) => {
      const statusMap = {
        'APPROVED': 'approve',
        'REJECTED': 'rejected',
        'PENDING': 'Pending',
        'PAUSED': 'Pending',
        'DISABLED': 'rejected'
      };
      return statusMap[metaStatus] || 'Pending';
    };

    for (const template of allTemplates) {
      try {
        // Check if template already exists in database
        const existingTemplate = await TemplateModel.getTemplateByMetaId(template.id);

        if (existingTemplate) {
          // Template already exists, skip
          syncResults.skipped++;
          syncResults.details.push({
            metaId: template.id,
            name: template.name,
            status: 'skipped',
            reason: 'Already exists in database'
          });
        } else {
          // Create new template in database
          const dbResult = await TemplateModel.createTemplate(
            {
              metaTemplateId: template.id,
              name: template.name,
              category: template.category,
              language: template.language,
              components: template.components,
              parameterFormat: template.parameter_format,
              status: mapMetaStatus(template.status)
            },
            userId
          );

          syncResults.synced++;
          syncResults.details.push({
            metaId: template.id,
            name: template.name,
            category: template.category,
            language: template.language,
            metaStatus: template.status,
            dbStatus: mapMetaStatus(template.status),
            status: 'synced',
            databaseId: dbResult.id,
            uuid: dbResult.uuid,
            metadata: {
              components: template.components,
              parameter_format: template.parameter_format
            },
            createdAt: dbResult.createdAt
          });
        }
      } catch (error) {
        syncResults.failed++;
        syncResults.details.push({
          metaId: template.id,
          name: template.name,
          status: 'failed',
          error: error.message
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Template sync completed',
      results: syncResults
    });
  } catch (error) {
    console.error('Error syncing templates:', error);
    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        error: error.response.data
      });
    }
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

