import app from './app.js';
import env from './config/env.js';
import logger from './config/logger.js';
import { connectRedis, closeRedis } from './config/redis.js';
import { closeDatabasePool } from './config/database.js';

let server;

const shutdown = async (signal) => {
  logger.info('Shutdown signal received', { signal });

  if (server) {
    await new Promise((resolve) => {
      server.close(() => resolve());
    });
  }

  await closeRedis();
  await closeDatabasePool();

  process.exit(0);
};

const bootstrap = async () => {
  await connectRedis();

  server = app.listen(env.port, () => {
    logger.info('Template service started', {
      port: env.port,
      nodeEnv: env.nodeEnv,
    });
  });

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

bootstrap().catch((error) => {
  logger.error('Failed to start template service', {
    message: error.message,
    stack: error.stack,
  });

  process.exit(1);
});
