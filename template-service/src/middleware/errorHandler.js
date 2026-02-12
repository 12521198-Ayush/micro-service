import AppError from '../errors/AppError.js';
import logger from '../config/logger.js';

const buildErrorResponse = (err, requestId) => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const code = err instanceof AppError ? err.code : 'INTERNAL_SERVER_ERROR';
  const exposeMessage = err instanceof AppError ? err.expose : false;

  return {
    statusCode,
    body: {
      success: false,
      error: {
        code,
        message: exposeMessage ? err.message : 'Internal server error',
        details: err instanceof AppError ? err.details : null,
        requestId,
      },
    },
  };
};

export const errorHandler = (err, req, res, next) => {
  const requestId = req.requestId || null;
  const { statusCode, body } = buildErrorResponse(err, requestId);

  logger.error('Request failed', {
    requestId,
    method: req.method,
    path: req.originalUrl,
    statusCode,
    code: body.error.code,
    message: err.message,
    stack: err.stack,
    details: body.error.details,
  });

  res.status(statusCode).json(body);
};

export default errorHandler;
