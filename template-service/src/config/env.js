import dotenv from 'dotenv';

dotenv.config();

const parseInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeNodeEnv = (value) => {
  if (!value) {
    return 'development';
  }

  return value.trim().toLowerCase();
};

const nodeEnv = normalizeNodeEnv(process.env.NODE_ENV);
const isProduction = nodeEnv === 'production';

const env = {
  nodeEnv,
  isProduction,
  port: parseInteger(process.env.PORT, 3003),
  logLevel: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),

  jwtSecret: process.env.JWT_SECRET || 'development_jwt_secret_change_me',

  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInteger(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'template_service',
    connectionLimit: parseInteger(process.env.DB_CONNECTION_LIMIT, 10),
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
    password: process.env.REDIS_PASSWORD || undefined,
  },

  metaApiVersion: process.env.META_API_VERSION || 'v20.0',
  metaAccessToken: process.env.META_ACCESS_TOKEN || '',
  metaApiTimeoutMs: parseInteger(process.env.META_API_TIMEOUT_MS, 20000),
  metaFlowEndpointUri: process.env.META_FLOW_ENDPOINT_URI || '',
  flowWebhookSecret: process.env.FLOW_WEBHOOK_SECRET || '',
  metaWebhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN || '',
  webhookDispatchIntervalMs: parseInteger(
    process.env.WEBHOOK_DISPATCH_INTERVAL_MS,
    5000
  ),
  webhookDispatchBatchSize: parseInteger(
    process.env.WEBHOOK_DISPATCH_BATCH_SIZE,
    50
  ),
  templateMediaMaxBytes: parseInteger(
    process.env.TEMPLATE_MEDIA_MAX_BYTES,
    25 * 1024 * 1024
  ),
};

const startupWarnings = [];

if (!process.env.JWT_SECRET) {
  startupWarnings.push('JWT_SECRET is not set. Using a development fallback secret.');
}

if (!process.env.META_ACCESS_TOKEN) {
  startupWarnings.push('META_ACCESS_TOKEN is not set. Meta API calls will fail until configured.');
}

if (env.isProduction && startupWarnings.length > 0) {
  const message = `Invalid production configuration: ${startupWarnings.join(' ')}`;
  throw new Error(message);
}

if (!env.isProduction && startupWarnings.length > 0) {
  startupWarnings.forEach((warning) => {
    console.warn(`[config] ${warning}`);
  });
}

export default env;
