import FlowSubmissionService from '../services/flowSubmissionService.js';

export const receiveFlowSubmissionWebhook = async (req, res) => {
  const result = await FlowSubmissionService.processWebhookSubmission(req.body);

  res.status(202).json({
    success: true,
    message: 'Flow submission received',
    data: result,
  });
};

export default {
  receiveFlowSubmissionWebhook,
};
