import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGS_DIR = path.resolve(__dirname, '..', 'logs');

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

/**
 * Get today's date string for log file rotation (YYYY-MM-DD)
 */
const getDateStr = () => new Date().toISOString().slice(0, 10);

/**
 * Create a write stream that rotates daily per service.
 * File pattern: logs/{serviceName}-{date}.log
 */
const createRotatingStream = (serviceName) => {
  let currentDate = getDateStr();
  let stream = fs.createWriteStream(
    path.join(LOGS_DIR, `${serviceName}-${currentDate}.log`),
    { flags: 'a' }
  );

  return {
    write(line) {
      const today = getDateStr();
      if (today !== currentDate) {
        stream.end();
        currentDate = today;
        stream = fs.createWriteStream(
          path.join(LOGS_DIR, `${serviceName}-${currentDate}.log`),
          { flags: 'a' }
        );
      }
      stream.write(line);
    },
  };
};

/**
 * Middleware that captures response body for logging.
 */
const captureResponseBody = (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    res.__logBody = typeof body === 'string' ? body : JSON.stringify(body);
    return originalJson(body);
  };
  next();
};

/**
 * Creates the traffic logger middleware stack for a service.
 * Morgan is passed in from the calling service to avoid cross-module resolution issues.
 *
 * @param {string} serviceName - e.g. 'campaign-service'
 * @param {Function} morgan - The morgan module from the calling service
 * @returns {Function[]} Array of two middlewares [captureResponseBody, morganFileLogger]
 */
export const createTrafficLogger = (serviceName, morgan) => {
  const stream = createRotatingStream(serviceName);

  // Register custom tokens
  morgan.token('timestamp', () => new Date().toISOString());
  morgan.token('service', () => serviceName.toUpperCase());
  morgan.token('user-id', (req) => req.user?.id || req.user?.userId || '-');

  morgan.token('req-body', (req) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      const body = JSON.stringify(req.body);
      return body.length > 2000 ? body.slice(0, 2000) + '...[truncated]' : body;
    }
    return '-';
  });

  morgan.token('res-body', (req, res) => {
    if (res.__logBody) {
      return res.__logBody.length > 2000
        ? res.__logBody.slice(0, 2000) + '...[truncated]'
        : res.__logBody;
    }
    return '-';
  });

  const LOG_FORMAT = '[:timestamp] :service | :method :url :status :response-time ms | :remote-addr | User\\: :user-id\n  >> ReqBody\\: :req-body\n  << ResBody\\: :res-body\n---';

  const morganMiddleware = morgan(LOG_FORMAT, { stream });

  return [captureResponseBody, morganMiddleware];
};

export default createTrafficLogger;
