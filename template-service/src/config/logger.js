import env from './env.js';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLogLevel = levels[env.logLevel] ?? levels.info;

const writeLog = (level, message, metadata = {}) => {
  if (levels[level] > currentLogLevel) {
    return;
  }

  const payload = {
    timestamp: new Date().toISOString(),
    level,
    service: 'template-service',
    message,
    ...metadata,
  };

  const serialized = JSON.stringify(payload);

  if (level === 'error') {
    console.error(serialized);
    return;
  }

  if (level === 'warn') {
    console.warn(serialized);
    return;
  }

  console.log(serialized);
};

const logger = {
  error: (message, metadata) => writeLog('error', message, metadata),
  warn: (message, metadata) => writeLog('warn', message, metadata),
  info: (message, metadata) => writeLog('info', message, metadata),
  debug: (message, metadata) => writeLog('debug', message, metadata),
};

export default logger;
