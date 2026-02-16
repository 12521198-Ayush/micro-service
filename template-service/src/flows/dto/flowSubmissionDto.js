export const toFlowSubmissionDto = (submission) => {
  return {
    id: submission.uuid,
    flowId: submission.flowUuid,
    version: submission.versionNumber,
    organizationId: submission.organizationId,
    metaBusinessAccountId: submission.metaBusinessAccountId,
    metaAppId: submission.metaAppId,
    userPhone: submission.userPhone,
    answers: submission.answers,
    mappedResponse: submission.mappedResponse,
    status: submission.status,
    source: submission.source,
    submittedAt: submission.submittedAt,
    createdAt: submission.createdAt,
    updatedAt: submission.updatedAt,
  };
};

export default {
  toFlowSubmissionDto,
};
