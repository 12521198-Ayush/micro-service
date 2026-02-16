import { randomUUID } from 'node:crypto';

export const requestContext = (req, res, next) => {
  req.requestId = req.headers['x-request-id'] || randomUUID();
  req.requestStart = Date.now();

  res.setHeader('x-request-id', req.requestId);
  next();
};

export default requestContext;
