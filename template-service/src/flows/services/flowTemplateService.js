import AppError from '../../errors/AppError.js';
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

const toFlowValidationError = (errors) => {
  return new AppError(422, 'Flow payload validation failed', {
    code: flowErrorCodes.FLOW_VALIDATION_FAILED,
    details: errors,
  });
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
      const creation = await FlowTemplateRepository.createTemplateWithVersion({
        tenant,
        userId,
        payload: validation.normalizedPayload,
      });

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
      await FlowTemplateRepository.createDraftVersion({
        templateId: template.id,
        userId,
        payload: validation.normalizedPayload,
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

    return this.getFlowById({
      tenant,
      flowId,
    });
  }

  static async deleteFlow({ tenant, userId, flowId }) {
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
