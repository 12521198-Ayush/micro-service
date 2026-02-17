import AppError from '../../errors/AppError.js';
import env from '../../config/env.js';
import { metaTemplateApi } from '../../config/metaApi.js';
import flowErrorCodes from '../constants/errorCodes.js';
import FlowTemplateRepository from '../repositories/flowTemplateRepository.js';
import {
  normalizeFlowListFilters,
  validateAndNormalizeFlowPayload,
  validateClonePayload,
  validatePublishPayload,
} from '../validators/flowTemplateValidator.js';
import {
  toFlowTemplateDetailDto,
  toFlowTemplateListItemDto,
} from '../dto/flowTemplateDto.js';
import { slugify } from '../utils/flowHelpers.js';
import { mapInternalFlowToMetaFlowJson } from '../utils/metaFlowJsonMapper.js';

const toFlowValidationError = (errors) => {
  return new AppError(422, 'Flow payload validation failed', {
    code: flowErrorCodes.FLOW_VALIDATION_FAILED,
    details: errors,
  });
};

const resolveMetaFlowId = (metaResponse) => {
  const candidate =
    metaResponse?.id ||
    metaResponse?.flow_id ||
    metaResponse?.flowId ||
    metaResponse?.data?.id ||
    metaResponse?.data?.flow_id ||
    null;

  return candidate ? String(candidate).trim() : null;
};

const ensureMetaFlowSyncSucceeded = (syncResult, metaFlowId) => {
  const validationErrors =
    syncResult?.validation_errors ||
    syncResult?.validationErrors ||
    syncResult?.errors ||
    null;

  if (Array.isArray(validationErrors) && validationErrors.length > 0) {
    throw new AppError(422, 'Meta flow json validation failed', {
      code: flowErrorCodes.FLOW_META_SYNC_FAILED,
      details: {
        metaFlowId,
        validationErrors,
      },
    });
  }
};

const resolveVersion = async ({ template, versionNumber }) => {
  if (versionNumber) {
    const version = await FlowTemplateRepository.getVersionByNumber(
      template.id,
      versionNumber
    );

    if (!version) {
      throw new AppError(404, `Flow version '${versionNumber}' not found`, {
        code: flowErrorCodes.FLOW_VERSION_NOT_FOUND,
      });
    }

    return version;
  }

  if (template.currentDraftVersionId) {
    const draftVersion = await FlowTemplateRepository.getVersionById(
      template.id,
      template.currentDraftVersionId
    );

    if (draftVersion) {
      return draftVersion;
    }
  }

  if (template.currentPublishedVersionId) {
    const publishedVersion = await FlowTemplateRepository.getVersionById(
      template.id,
      template.currentPublishedVersionId
    );

    if (publishedVersion) {
      return publishedVersion;
    }
  }

  const latestVersion = await FlowTemplateRepository.getLatestVersion(template.id);

  if (!latestVersion) {
    throw new AppError(404, 'No versions found for flow', {
      code: flowErrorCodes.FLOW_VERSION_NOT_FOUND,
    });
  }

  return latestVersion;
};

const getTemplateOrThrow = async (tenant, flowId) => {
  const template = await FlowTemplateRepository.getTemplateByUuid(tenant, flowId);

  if (!template) {
    throw new AppError(404, 'Flow not found', {
      code: flowErrorCodes.FLOW_NOT_FOUND,
    });
  }

  return template;
};

class FlowTemplateService {
  static async createFlow({ tenant, userId, payload }) {
    const [allowedComponentTypes, allowedActionTypes] = await Promise.all([
      FlowTemplateRepository.getActiveComponentTypes(),
      FlowTemplateRepository.getActiveActionTypes(),
    ]);

    const validation = validateAndNormalizeFlowPayload(payload, {
      allowedComponentTypes,
      allowedActionTypes,
    });

    if (!validation.isValid) {
      throw toFlowValidationError(validation.errors);
    }

    try {
      const metaFlow = await metaTemplateApi.createFlow(tenant.metaBusinessAccountId, {
        name: validation.normalizedPayload.name,
        categories: ['OTHER'],
        endpointUri: env.metaFlowEndpointUri || undefined,
      });
      const metaFlowId = resolveMetaFlowId(metaFlow);

      if (!metaFlowId) {
        throw new AppError(502, 'Meta flow creation did not return a flow id', {
          code: flowErrorCodes.FLOW_CREATION_FAILED,
          details: metaFlow,
        });
      }

      const creation = await FlowTemplateRepository.createTemplateWithVersion({
        tenant,
        userId,
        payload: {
          ...validation.normalizedPayload,
          flowId: metaFlowId,
        },
      });

      const createdTemplate = await FlowTemplateRepository.getTemplateByUuid(
        tenant,
        creation.templateUuid
      );
      const createdVersion = await FlowTemplateRepository.getVersionByNumber(
        createdTemplate.id,
        creation.versionNumber
      );
      const createdVersionGraph = await FlowTemplateRepository.getVersionGraph(
        createdVersion.id
      );
      const metaFlowJson = mapInternalFlowToMetaFlowJson({
        template: createdTemplate,
        versionGraph: createdVersionGraph,
      });
      const syncResult = await metaTemplateApi.updateFlowJson(metaFlowId, metaFlowJson);
      ensureMetaFlowSyncSucceeded(syncResult, metaFlowId);

      return this.getFlowById({
        tenant,
        flowId: creation.templateUuid,
      });
    } catch (error) {
      if (FlowTemplateRepository.isConflictError(error)) {
        throw new AppError(
          409,
          'Flow template key or name already exists for this tenant',
          {
            code: flowErrorCodes.FLOW_CONFLICT,
          }
        );
      }

      throw error;
    }
  }

  static async listFlows({ tenant, rawFilters }) {
    let filters;

    try {
      filters = normalizeFlowListFilters(rawFilters);
    } catch (error) {
      throw new AppError(400, error.message, {
        code: flowErrorCodes.FLOW_VALIDATION_FAILED,
      });
    }

    const result = await FlowTemplateRepository.listTemplatesByTenant(tenant, filters);

    return {
      data: result.data.map(toFlowTemplateListItemDto),
      pagination: result.pagination,
    };
  }

  static async getFlowById({ tenant, flowId, versionNumber = null }) {
    const template = await getTemplateOrThrow(tenant, flowId);
    const versions = await FlowTemplateRepository.getVersionsByTemplateId(template.id);
    const activeVersion = await resolveVersion({
      template,
      versionNumber,
    });
    const versionGraph = await FlowTemplateRepository.getVersionGraph(activeVersion.id);

    return toFlowTemplateDetailDto({
      template,
      version: versionGraph,
      versions,
    });
  }

  static async updateFlow({ tenant, userId, flowId, payload }) {
    const template = await getTemplateOrThrow(tenant, flowId);

    const [allowedComponentTypes, allowedActionTypes] = await Promise.all([
      FlowTemplateRepository.getActiveComponentTypes(),
      FlowTemplateRepository.getActiveActionTypes(),
    ]);

    const validation = validateAndNormalizeFlowPayload(payload, {
      allowedComponentTypes,
      allowedActionTypes,
      forUpdate: true,
    });

    if (!validation.isValid) {
      throw toFlowValidationError(validation.errors);
    }

    try {
      const draftVersion = await FlowTemplateRepository.createDraftVersion({
        templateId: template.id,
        userId,
        payload: validation.normalizedPayload,
      });

      if (template.metaFlowId && draftVersion?.id) {
        const refreshedTemplate = await FlowTemplateRepository.getTemplateByUuid(tenant, flowId);
        const versionGraph = await FlowTemplateRepository.getVersionGraph(draftVersion.id);
        const metaFlowJson = mapInternalFlowToMetaFlowJson({
          template: refreshedTemplate || template,
          versionGraph,
        });
        const syncResult = await metaTemplateApi.updateFlowJson(
          template.metaFlowId,
          metaFlowJson
        );
        ensureMetaFlowSyncSucceeded(syncResult, template.metaFlowId);
      }
    } catch (error) {
      if (FlowTemplateRepository.isConflictError(error)) {
        throw new AppError(
          409,
          'Flow template key or name already exists for this tenant',
          {
            code: flowErrorCodes.FLOW_CONFLICT,
          }
        );
      }

      throw error;
    }

    return this.getFlowById({
      tenant,
      flowId,
    });
  }

  static async deleteFlow({ tenant, userId, flowId }) {
    const template = await getTemplateOrThrow(tenant, flowId);

    if (template.metaFlowId) {
      await metaTemplateApi.deleteFlow(template.metaFlowId);
    } else {
      throw new AppError(409, 'Flow is missing Meta flow id and cannot be deleted', {
        code: flowErrorCodes.FLOW_DELETE_FAILED,
      });
    }

    const deleted = await FlowTemplateRepository.softDeleteTemplate(
      tenant,
      flowId,
      userId || null
    );

    if (!deleted) {
      throw new AppError(404, 'Flow not found', {
        code: flowErrorCodes.FLOW_NOT_FOUND,
      });
    }

    return {
      id: flowId,
      deleted: true,
    };
  }

  static async publishFlow({ tenant, userId, flowId, payload }) {
    const template = await getTemplateOrThrow(tenant, flowId);

    const publishValidation = validatePublishPayload(payload);

    if (!publishValidation.isValid) {
      throw new AppError(422, 'Publish payload validation failed', {
        code: flowErrorCodes.FLOW_VALIDATION_FAILED,
        details: publishValidation.errors,
      });
    }

    const requestedVersionNumber = publishValidation.normalizedPayload.version;

    const targetVersion = requestedVersionNumber
      ? await FlowTemplateRepository.getVersionByNumber(
          template.id,
          requestedVersionNumber
        )
      : template.currentDraftVersionId
      ? await FlowTemplateRepository.getVersionById(
          template.id,
          template.currentDraftVersionId
        )
      : await FlowTemplateRepository.getLatestVersion(template.id);

    if (!targetVersion) {
      throw new AppError(404, 'Version to publish was not found', {
        code: flowErrorCodes.FLOW_VERSION_NOT_FOUND,
      });
    }

    if (!template.metaFlowId) {
      throw new AppError(409, 'Flow is missing Meta flow id and cannot be published to Meta', {
        code: flowErrorCodes.FLOW_PUBLISH_FAILED,
      });
    }

    const versionGraph = await FlowTemplateRepository.getVersionGraph(targetVersion.id);
    const metaFlowJson = mapInternalFlowToMetaFlowJson({
      template,
      versionGraph,
    });
    const syncResult = await metaTemplateApi.updateFlowJson(template.metaFlowId, metaFlowJson);
    ensureMetaFlowSyncSucceeded(syncResult, template.metaFlowId);

    await metaTemplateApi.publishFlow(template.metaFlowId);

    await FlowTemplateRepository.publishVersion({
      templateId: template.id,
      versionId: targetVersion.id,
      approvedBy: userId || null,
      approvalNotes: publishValidation.normalizedPayload.notes || null,
    });

    return this.getFlowById({
      tenant,
      flowId,
      versionNumber: targetVersion.versionNumber,
    });
  }

  static async cloneFlow({ tenant, userId, flowId, payload }) {
    const sourceTemplate = await getTemplateOrThrow(tenant, flowId);

    const cloneValidation = validateClonePayload(payload);

    if (!cloneValidation.isValid) {
      throw new AppError(422, 'Clone payload validation failed', {
        code: flowErrorCodes.FLOW_VALIDATION_FAILED,
        details: cloneValidation.errors,
      });
    }

    const sourceVersion = sourceTemplate.currentPublishedVersionId
      ? await FlowTemplateRepository.getVersionById(
          sourceTemplate.id,
          sourceTemplate.currentPublishedVersionId
        )
      : sourceTemplate.currentDraftVersionId
      ? await FlowTemplateRepository.getVersionById(
          sourceTemplate.id,
          sourceTemplate.currentDraftVersionId
        )
      : await FlowTemplateRepository.getLatestVersion(sourceTemplate.id);

    if (!sourceVersion) {
      throw new AppError(404, 'Source flow version not found for clone', {
        code: flowErrorCodes.FLOW_VERSION_NOT_FOUND,
      });
    }

    const sourceVersionGraph = await FlowTemplateRepository.getVersionGraph(
      sourceVersion.id
    );

    const cloneName =
      cloneValidation.normalizedPayload.name || `${sourceTemplate.name} Copy`;
    const cloneTemplateKey =
      cloneValidation.normalizedPayload.templateKey ||
      `${slugify(sourceTemplate.templateKey)}_clone`;

    try {
      const clone = await FlowTemplateRepository.cloneTemplateFromVersion({
        tenant,
        userId,
        sourceTemplate,
        sourceVersionGraph,
        cloneName,
        cloneTemplateKey,
      });

      return this.getFlowById({
        tenant,
        flowId: clone.templateUuid,
      });
    } catch (error) {
      if (FlowTemplateRepository.isConflictError(error)) {
        throw new AppError(409, 'Clone name/template_key conflicts with existing flow', {
          code: flowErrorCodes.FLOW_CONFLICT,
        });
      }

      throw error;
    }
  }
}

export default FlowTemplateService;
