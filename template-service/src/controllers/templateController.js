import env from '../config/env.js';
import logger from '../config/logger.js';
import { cache } from '../config/redis.js';
import { metaTemplateApi } from '../config/metaApi.js';
import AppError from '../errors/AppError.js';
import TemplateModel from '../models/templateModel.js';
import cacheKeys from '../utils/cacheKeys.js';
import {
  SUPPORTED_TEMPLATE_MEDIA_MIME_TYPES,
  ensureFileNameHasExtension,
  isSupportedTemplateMediaType,
  normalizeMimeType,
  sanitizeUploadFileName,
} from '../utils/mediaUpload.js';
import { removeUndefinedDeep } from '../utils/object.js';
import {
  normalizeTemplatePayload,
  validateAndNormalizeTemplatePayload,
} from '../utils/templateValidator.js';
import { deriveTemplateType } from '../utils/templateType.js';
import {
  normalizeInternalStatus,
  normalizeMetaStatus,
} from '../utils/templateStatus.js';
import WebhookEventService from '../webhooks/services/webhookEventService.js';

const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 100;
const DEFAULT_MEDIA_FILE_NAME = 'template_media';

const serializeFilters = (filters) => {
  const ordered = Object.keys(filters)
    .sort()
    .reduce((result, key) => {
      result[key] = filters[key];
      return result;
    }, {});

  return JSON.stringify(ordered);
};

const getUserId = (req) => {
  const userId = req.user?.id || req.user?.userId;

  if (!userId) {
    throw new AppError(401, 'Authenticated user id is required', {
      code: 'AUTH_USER_CONTEXT_MISSING',
    });
  }

  return userId;
};

const getTenant = (req) => {
  if (!req.tenant) {
    throw new AppError(400, 'Tenant context is required', {
      code: 'TENANT_CONTEXT_MISSING',
    });
  }

  return req.tenant;
};

const buildTenantCacheKey = (tenant) => {
  return `${tenant.organizationId}:${tenant.metaBusinessAccountId}:${tenant.metaAppId}`;
};

const normalizeListFilters = (raw = {}) => {
  const normalizedStatus = raw.status ? normalizeInternalStatus(raw.status) : null;

  if (raw.status && !normalizedStatus) {
    throw new AppError(400, `Invalid status filter: ${raw.status}`, {
      code: 'INVALID_STATUS_FILTER',
    });
  }

  return {
    status: normalizedStatus,
    category: raw.category ? String(raw.category).toUpperCase() : null,
    templateType: raw.templateType
      ? String(raw.templateType).toUpperCase()
      : raw.type
        ? String(raw.type).toUpperCase()
        : null,
    language: raw.language ? String(raw.language) : null,
    search: raw.search
      ? String(raw.search)
      : raw.name
        ? String(raw.name)
        : null,
    limit: Math.min(
      Math.max(Number.parseInt(raw.limit, 10) || DEFAULT_PAGE_LIMIT, 1),
      MAX_PAGE_LIMIT
    ),
    offset: Math.max(Number.parseInt(raw.offset, 10) || 0, 0),
  };
};

const invalidateTenantTemplateCache = async (tenant) => {
  const tenantKey = buildTenantCacheKey(tenant);
  await cache.deletePattern(cacheKeys.patterns.tenantTemplates(tenantKey));
};

const buildTemplatePayloadFromMeta = (metaTemplate) => {
  const category = String(metaTemplate.category || '').toUpperCase() || 'UTILITY';
  const components = Array.isArray(metaTemplate.components)
    ? metaTemplate.components
    : [];

  const templateType = deriveTemplateType({
    category,
    components,
  });

  return {
    metaTemplateId: metaTemplate.id,
    name: metaTemplate.name,
    language: metaTemplate.language,
    category,
    templateType,
    status: normalizeMetaStatus(metaTemplate.status),
    qualityScore: metaTemplate.quality_score || null,
    components,
    parameterFormat: metaTemplate.parameter_format || null,
    rawMetaResponse: metaTemplate,
    lastSyncedAt: new Date(),
  };
};

export const createTemplate = async (req, res) => {
  const userId = getUserId(req);
  const tenant = getTenant(req);

  const validation = validateAndNormalizeTemplatePayload(req.body, {
    forUpdate: false,
  });

  if (!validation.isValid) {
    throw new AppError(422, 'Template payload validation failed', {
      code: 'INVALID_TEMPLATE_PAYLOAD',
      details: validation.errors,
    });
  }

  const payload = validation.normalizedPayload;

  const metaResponse = await metaTemplateApi.createTemplate(
    tenant.metaBusinessAccountId,
    payload
  );

  const status = normalizeMetaStatus(metaResponse.status);

  const template = await TemplateModel.createTemplate({
    tenant,
    userId,
    metaTemplateId: metaResponse.id,
    name: payload.name,
    language: payload.language,
    category: payload.category,
    templateType: validation.templateType,
    status,
    qualityScore: metaResponse.quality_score || null,
    components: payload.components,
    parameterFormat: payload.parameter_format || null,
    rawPayload: payload,
    rawMetaResponse: metaResponse,
    lastSyncedAt: new Date(),
  });

  await invalidateTenantTemplateCache(tenant);

  await WebhookEventService.enqueueTenantEvent({
    tenant,
    eventType: 'template.created',
    eventKey: `template.created:${template.uuid}`,
    payload: {
      templateId: template.uuid,
      templateName: template.name,
      templateType: template.templateType,
      category: template.category,
      status: template.status,
      metaTemplateId: template.metaTemplateId,
      createdBy: userId,
    },
  });

  res.status(201).json({
    success: true,
    data: {
      template,
      meta: metaResponse,
    },
  });
};

export const uploadTemplateMedia = async (req, res) => {
  const userId = getUserId(req);
  const tenant = getTenant(req);
  const metaAppId = tenant.metaAppId;

  const uploadedFile = req.file;
  if (!uploadedFile) {
    throw new AppError(422, "Multipart field 'file' is required.", {
      code: 'MEDIA_FILE_REQUIRED',
      details: {
        expectedField: 'file',
      },
    });
  }

  const fileBuffer = uploadedFile.buffer;
  const fileSize = fileBuffer?.length || 0;

  if (fileSize <= 0) {
    throw new AppError(422, 'Uploaded file is empty.', {
      code: 'EMPTY_MEDIA_FILE',
    });
  }

  const mimeType =
    normalizeMimeType(req.body?.fileType) ||
    normalizeMimeType(uploadedFile.mimetype);

  if (!mimeType) {
    throw new AppError(422, 'Unable to determine file MIME type. Provide fileType.', {
      code: 'MEDIA_TYPE_REQUIRED',
    });
  }

  if (!isSupportedTemplateMediaType(mimeType)) {
    throw new AppError(422, `Unsupported fileType '${mimeType}'.`, {
      code: 'UNSUPPORTED_MEDIA_TYPE',
      details: {
        supportedMimeTypes: SUPPORTED_TEMPLATE_MEDIA_MIME_TYPES,
      },
    });
  }

  const preferredFileName =
    req.body?.fileName || uploadedFile.originalname || DEFAULT_MEDIA_FILE_NAME;
  const sanitizedFileName = sanitizeUploadFileName(
    preferredFileName,
    DEFAULT_MEDIA_FILE_NAME
  );
  const fileName = ensureFileNameHasExtension(sanitizedFileName, mimeType);

  const uploadSession = await metaTemplateApi.createUploadSession(metaAppId, {
    fileName,
    fileLength: fileSize,
    fileType: mimeType,
  });

  const uploadSessionId = uploadSession?.id || uploadSession?.upload_session_id;

  if (!uploadSessionId) {
    throw new AppError(502, 'Meta upload session did not return an id.', {
      code: 'META_UPLOAD_SESSION_INVALID',
      details: uploadSession,
    });
  }

  const uploadResult = await metaTemplateApi.uploadFileChunk(
    uploadSessionId,
    fileBuffer,
    0
  );
  const headerHandle = uploadResult?.h || uploadResult?.handle || null;

  if (!headerHandle) {
    throw new AppError(502, 'Meta upload did not return a media handle.', {
      code: 'META_MEDIA_HANDLE_MISSING',
      details: uploadResult,
    });
  }

  logger.info('Template media upload completed', {
    userId,
    tenant,
    fileName,
    fileSize,
    mimeType,
  });

  res.status(201).json({
    success: true,
    data: {
      headerHandle,
      header_handle: headerHandle,
      example: {
        header_handle: [headerHandle],
      },
      mimeType,
      fileName,
      fileSize,
      uploadSessionId,
    },
  });
};

export const listTemplates = async (req, res) => {
  const tenant = getTenant(req);

  const rawFilters = req.method === 'GET' ? req.query : req.body || {};
  const filters = normalizeListFilters(rawFilters);

  const tenantKey = buildTenantCacheKey(tenant);
  const cacheKey = cacheKeys.templateList(tenantKey, serializeFilters(filters));
  const cached = await cache.get(cacheKey);

  if (cached) {
    res.status(200).json({
      ...cached,
      cached: true,
    });
    return;
  }

  const result = await TemplateModel.listTemplates(tenant, filters);

  const response = {
    success: true,
    count: result.data.length,
    pagination: result.pagination,
    data: result.data,
  };

  await cache.set(cacheKey, response, 300);

  res.status(200).json(response);
};

export const getTemplateByUuid = async (req, res) => {
  const tenant = getTenant(req);
  const { uuid } = req.params;

  const tenantKey = buildTenantCacheKey(tenant);
  const cacheKey = cacheKeys.templateByUuid(tenantKey, uuid);
  const cached = await cache.get(cacheKey);

  if (cached) {
    res.status(200).json({
      success: true,
      data: cached,
      cached: true,
    });
    return;
  }

  const template = await TemplateModel.getTemplateByUuid(uuid, tenant);

  if (!template) {
    throw new AppError(404, 'Template not found', {
      code: 'TEMPLATE_NOT_FOUND',
    });
  }

  await cache.set(cacheKey, template, 300);

  res.status(200).json({
    success: true,
    data: template,
  });
};

export const updateTemplate = async (req, res) => {
  const userId = getUserId(req);
  const tenant = getTenant(req);
  const { uuid } = req.params;

  const existingTemplate = await TemplateModel.getTemplateByUuid(uuid, tenant);

  if (!existingTemplate) {
    throw new AppError(404, 'Template not found', {
      code: 'TEMPLATE_NOT_FOUND',
    });
  }

  if (!existingTemplate.metaTemplateId) {
    throw new AppError(409, 'Template is missing Meta template id and cannot be updated', {
      code: 'META_TEMPLATE_ID_MISSING',
    });
  }

  const validation = validateAndNormalizeTemplatePayload(req.body, {
    forUpdate: true,
  });

  if (!validation.isValid) {
    throw new AppError(422, 'Template payload validation failed', {
      code: 'INVALID_TEMPLATE_PAYLOAD',
      details: validation.errors,
    });
  }

  const normalizedPatch = validation.normalizedPayload;

  const metaPayload = removeUndefinedDeep({
    category: normalizedPatch.category,
    components: normalizedPatch.components,
    message_send_ttl_seconds: normalizedPatch.message_send_ttl_seconds,
  });

  if (Object.keys(metaPayload).length === 0) {
    throw new AppError(400, 'Nothing to update. Provide category and/or components.', {
      code: 'EMPTY_UPDATE_PAYLOAD',
    });
  }

  const metaResponse = await metaTemplateApi.updateTemplate(
    existingTemplate.metaTemplateId,
    metaPayload
  );

  const mergedCategory = normalizedPatch.category || existingTemplate.category;
  const mergedComponents = normalizedPatch.components || existingTemplate.components;

  const updatedTemplate = await TemplateModel.updateTemplate(uuid, tenant, {
    category: mergedCategory,
    templateType: deriveTemplateType({
      category: mergedCategory,
      components: mergedComponents,
    }),
    status: 'PENDING',
    components: mergedComponents,
    parameterFormat:
      normalizedPatch.parameter_format || existingTemplate.parameterFormat,
    rawPayload: removeUndefinedDeep({
      ...existingTemplate.rawPayload,
      ...normalizedPatch,
    }),
    rawMetaResponse: metaResponse,
    lastSyncedAt: new Date(),
    updatedBy: userId,
  });

  await invalidateTenantTemplateCache(tenant);

  await WebhookEventService.enqueueTenantEvent({
    tenant,
    eventType: 'template.updated',
    eventKey: `template.updated:${updatedTemplate.uuid}:${updatedTemplate.updatedAt}`,
    payload: {
      templateId: updatedTemplate.uuid,
      templateName: updatedTemplate.name,
      templateType: updatedTemplate.templateType,
      category: updatedTemplate.category,
      status: updatedTemplate.status,
      updatedBy: userId,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Template updated successfully',
    data: {
      template: updatedTemplate,
      meta: metaResponse,
    },
  });
};

export const publishTemplate = async (req, res) => {
  const userId = getUserId(req);
  const tenant = getTenant(req);
  const { uuid } = req.params;

  const existingTemplate = await TemplateModel.getTemplateByUuid(uuid, tenant);

  if (!existingTemplate) {
    throw new AppError(404, 'Template not found', {
      code: 'TEMPLATE_NOT_FOUND',
    });
  }

  if (!existingTemplate.metaTemplateId) {
    throw new AppError(409, 'Template is missing Meta template id', {
      code: 'META_TEMPLATE_ID_MISSING',
    });
  }

  const metaTemplate = await metaTemplateApi.getTemplateByMetaId(
    existingTemplate.metaTemplateId
  );

  const normalizedStatus = normalizeMetaStatus(metaTemplate.status);

  const updatedTemplate = await TemplateModel.updateTemplate(uuid, tenant, {
    status: normalizedStatus,
    qualityScore: metaTemplate.quality_score || existingTemplate.qualityScore,
    rawMetaResponse: metaTemplate,
    lastSyncedAt: new Date(),
    updatedBy: userId,
  });

  await invalidateTenantTemplateCache(tenant);

  await WebhookEventService.enqueueTenantEvent({
    tenant,
    eventType: 'template.synced',
    eventKey: `template.synced:${updatedTemplate.uuid}:${updatedTemplate.updatedAt}`,
    payload: {
      templateId: updatedTemplate.uuid,
      metaTemplateId: updatedTemplate.metaTemplateId,
      status: updatedTemplate.status,
      qualityScore: updatedTemplate.qualityScore,
      syncedBy: userId,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Template status synchronized from Meta',
    data: {
      template: updatedTemplate,
      meta: metaTemplate,
    },
  });
};

export const deleteTemplate = async (req, res) => {
  const userId = getUserId(req);
  const tenant = getTenant(req);
  const { uuid } = req.params;

  const template = await TemplateModel.getTemplateByUuid(uuid, tenant);

  if (!template) {
    throw new AppError(404, 'Template not found', {
      code: 'TEMPLATE_NOT_FOUND',
    });
  }

  let metaResponse = null;
  let deleteMode = 'id';

  if (!template.metaTemplateId) {
    throw new AppError(409, 'Template is missing Meta template id and cannot be deleted', {
      code: 'META_TEMPLATE_ID_MISSING',
    });
  }

  try {
    metaResponse = await metaTemplateApi.deleteTemplateByMetaId(
      template.metaTemplateId
    );
  } catch (metaDeleteByIdError) {
    deleteMode = 'name';
    metaResponse = await metaTemplateApi.deleteTemplateByName(
      tenant.metaBusinessAccountId,
      {
        name: template.name,
        language: template.language,
        metaTemplateId: template.metaTemplateId,
      }
    );
  }

  if (!metaResponse) {
    throw new AppError(502, 'Meta template deletion did not return a response', {
      code: 'META_TEMPLATE_DELETE_FAILED',
    });
  }

  const deleted = await TemplateModel.softDeleteTemplate(uuid, tenant, userId);

  if (!deleted) {
    throw new AppError(404, 'Template already deleted', {
      code: 'TEMPLATE_ALREADY_DELETED',
    });
  }

  await invalidateTenantTemplateCache(tenant);

  await WebhookEventService.enqueueTenantEvent({
    tenant,
    eventType: 'template.deleted',
    eventKey: `template.deleted:${uuid}`,
    payload: {
      templateId: uuid,
      templateName: template.name,
      templateType: template.templateType,
      deletedBy: userId,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Template deleted successfully',
    data: {
      uuid,
      deleteMode,
      meta: metaResponse,
    },
  });
};

export const syncTemplates = async (req, res) => {
  const userId = getUserId(req);
  const tenant = getTenant(req);

  const summary = {
    fetched: 0,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  };

  let after = null;
  let hasNextPage = true;

  console.log("userId : ", userId);
  console.log("tenant : ", tenant);

  while (hasNextPage) {
    const response = await metaTemplateApi.listTemplates(
      tenant.metaBusinessAccountId,
      {
        after,
        limit: 50,
      }
    );

    const templates = Array.isArray(response.data) ? response.data : [];
    summary.fetched += templates.length;

    for (const metaTemplate of templates) {
      try {
        const mapped = buildTemplatePayloadFromMeta(metaTemplate);

        const result = await TemplateModel.upsertFromMeta({
          tenant,
          userId,
          ...mapped,
        });

        if (result.action === 'created') {
          summary.created += 1;
        } else {
          summary.updated += 1;
        }
      } catch (error) {
        summary.failed += 1;
        summary.errors.push({
          metaTemplateId: metaTemplate.id,
          name: metaTemplate.name,
          message: error.message,
        });
      }
    }

    after = response.paging?.cursors?.after || null;
    hasNextPage = Boolean(response.paging?.next && after);
  }

  await invalidateTenantTemplateCache(tenant);

  await WebhookEventService.enqueueTenantEvent({
    tenant,
    eventType: 'template.synced',
    eventKey: `template.synced.batch:${Date.now()}`,
    payload: {
      ...summary,
      syncedBy: userId,
    },
  });

  logger.info('Template sync completed', {
    tenant,
    ...summary,
  });

  res.status(200).json({
    success: true,
    message: 'Template sync completed',
    data: summary,
  });
};

export const validateTemplatePayloadController = async (req, res) => {
  const validation = validateAndNormalizeTemplatePayload(req.body, {
    forUpdate: Boolean(req.query.forUpdate === 'true' || req.body?.forUpdate),
  });

  res.status(validation.isValid ? 200 : 422).json({
    success: validation.isValid,
    ...validation,
  });
};

export const getTemplateCapabilities = async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      categories: ['MARKETING', 'UTILITY', 'AUTHENTICATION'],
      templateTypes: ['STANDARD', 'CAROUSEL', 'FLOW', 'AUTHENTICATION'],
      components: [
        'HEADER',
        'BODY',
        'FOOTER',
        'BUTTONS',
        'CAROUSEL',
        'LIMITED_TIME_OFFER',
      ],
      headerFormats: ['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'LOCATION'],
      buttonTypes: [
        'QUICK_REPLY',
        'URL',
        'PHONE_NUMBER',
        'COPY_CODE',
        'OTP',
        'FLOW',
        'FLOW_ACTION',
        'CATALOG',
        'SPM',
      ],
      mediaUpload: {
        endpoint: '/api/templates/media/upload',
        method: 'POST',
        contentType: 'multipart/form-data',
        fieldName: 'file',
        supportedMimeTypes: SUPPORTED_TEMPLATE_MEDIA_MIME_TYPES,
        maxBytes: env.templateMediaMaxBytes,
      },
      notes: [
        'Unknown/new component types are accepted and passed through to Meta API when structurally valid.',
        'Flow templates are inferred from BUTTONS containing FLOW/FLOW_ACTION types.',
        'Carousel templates are inferred from CAROUSEL components.',
        'Carousel templates must include one top-level BODY component and each carousel card must include HEADER + BODY components.',
        'Carousel card HEADER format must be IMAGE or VIDEO, with example.header_handle.',
        'Upload media with multipart form-data on /api/templates/media/upload and use returned header_handle in template examples.',
      ],
    },
  });
};

export const normalizeIncomingTemplatePayload = (payload) => {
  return normalizeTemplatePayload(payload, { forUpdate: false });
};
