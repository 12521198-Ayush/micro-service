import AppError from '../../errors/AppError.js';
import env from '../../config/env.js';
import flowErrorCodes from '../constants/errorCodes.js';

export const verifyFlowWebhookSecret = (req, res, next) => {
  if (!env.flowWebhookSecret) {
    next();
    return;
  }

  const providedSecret = req.headers['x-flow-webhook-secret'];

  if (!providedSecret || String(providedSecret) !== env.flowWebhookSecret) {
    next(
      new AppError(401, 'Invalid flow webhook secret', {
        code: flowErrorCodes.WEBHOOK_UNAUTHORIZED,
      })
    );
    return;
  }

  next();
};

export default verifyFlowWebhookSecret;
