import AppError from '../../errors/AppError.js';
import flowErrorCodes from '../constants/errorCodes.js';
import FlowTemplateRepository from '../repositories/flowTemplateRepository.js';
import FlowSubmissionRepository from '../repositories/flowSubmissionRepository.js';
import { toFlowSubmissionDto } from '../dto/flowSubmissionDto.js';
import { applyWebhookMapping } from '../utils/webhookMapper.js';
import { validateAndNormalizeFlowSubmissionPayload } from '../validators/flowSubmissionValidator.js';
import WebhookEventService from '../../webhooks/services/webhookEventService.js';

const isMissingAnswer = (value) => {
  if (value === undefined || value === null) {
    return true;
  }

  if (typeof value === 'string' && value.trim().length === 0) {
    return true;
  }

  if (Array.isArray(value) && value.length === 0) {
    return true;
  }

  return false;
};

class FlowSubmissionService {
  static async processWebhookSubmission(payload) {
    const validation = validateAndNormalizeFlowSubmissionPayload(payload);

    if (!validation.isValid) {
      throw new AppError(422, 'Flow submission payload validation failed', {
        code: flowErrorCodes.FLOW_SUBMISSION_VALIDATION_FAILED,
        details: validation.errors,
      });
    }

    const normalized = validation.normalizedPayload;
    const tenant = {
      organizationId: normalized.organizationId,
      metaBusinessAccountId: normalized.metaBusinessAccountId,
      metaAppId: normalized.metaAppId,
    };

    const template = await FlowTemplateRepository.getTemplateByUuid(
      tenant,
      normalized.flowId
    );

    if (!template) {
      throw new AppError(404, 'Flow not found for tenant', {
        code: flowErrorCodes.FLOW_NOT_FOUND,
      });
    }

    const version = normalized.version
      ? await FlowTemplateRepository.getVersionByNumber(template.id, normalized.version)
      : template.currentPublishedVersionId
      ? await FlowTemplateRepository.getVersionById(
          template.id,
          template.currentPublishedVersionId
        )
      : template.currentDraftVersionId
      ? await FlowTemplateRepository.getVersionById(template.id, template.currentDraftVersionId)
      : await FlowTemplateRepository.getLatestVersion(template.id);

    if (!version) {
      throw new AppError(404, 'Flow version not found for submission', {
        code: flowErrorCodes.FLOW_VERSION_NOT_FOUND,
      });
    }

    const requiredVariables =
      await FlowSubmissionRepository.getRequiredVariablesByVersionId(version.id);

    const missingVariables = requiredVariables.filter((variableKey) =>
      isMissingAnswer(normalized.answers[variableKey])
    );

    if (missingVariables.length > 0) {
      throw new AppError(422, 'Submission is missing required answers', {
        code: flowErrorCodes.FLOW_SUBMISSION_VALIDATION_FAILED,
        details: {
          missingVariables,
        },
      });
    }

    const context = {
      flow: {
        id: template.uuid,
        templateKey: template.templateKey,
        category: template.category,
        version: version.versionNumber,
      },
      tenant: {
        organization_id: tenant.organizationId,
        meta_business_account_id: tenant.metaBusinessAccountId,
        meta_app_id: tenant.metaAppId,
      },
      user_phone: normalized.userPhone,
      answers: normalized.answers,
      timestamp: new Date().toISOString(),
    };

    const mappedResponse = applyWebhookMapping(version.webhookMapping, context);

    const submission = await FlowSubmissionRepository.createSubmission({
      flowTemplateId: template.id,
      flowVersionId: version.id,
      flowUuid: template.uuid,
      versionNumber: version.versionNumber,
      tenant,
      userPhone: normalized.userPhone,
      answers: normalized.answers,
      mappedResponse,
      status: normalized.status,
      source: normalized.source,
      externalReference: normalized.externalReference,
      errorMessage: null,
    });

    await WebhookEventService.enqueueTenantEvent({
      tenant,
      eventType: 'flow.submission.received',
      eventKey: `flow.submission:${submission.uuid}`,
      payload: {
        submissionId: submission.uuid,
        flowId: template.uuid,
        version: version.versionNumber,
        userPhone: normalized.userPhone,
        status: submission.status,
        answers: normalized.answers,
        mappedResponse,
      },
    });

    return {
      submission: toFlowSubmissionDto(submission),
      mappedResponse,
    };
  }
}

export default FlowSubmissionService;
