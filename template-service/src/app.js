import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import templatesRouter from './routes/templates.js';
import flowsRouter from './flows/routes/flows.js';
import flowWebhooksRouter from './flows/routes/flowWebhooks.js';
import metaWebhooksRouter from './routes/metaWebhooks.js';
import webhookConfigRouter from './webhooks/routes/webhookConfigRoutes.js';
import webhookTestRouter from './webhooks/routes/webhookTestRoutes.js';
import requestContext from './middleware/requestContext.js';
import notFoundHandler from './middleware/notFound.js';
import errorHandler from './middleware/errorHandler.js';
import { checkDatabaseHealth } from './config/database.js';
import { isRedisReady } from './config/redis.js';

const app = express();

app.disable('x-powered-by');

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(requestContext);
app.use(express.json({ limit: '2mb' }));

app.get('/health', async (req, res) => {
  let database = 'up';

  try {
    await checkDatabaseHealth();
  } catch (error) {
    database = 'down';
  }

  res.status(database === 'up' ? 200 : 503).json({
    success: database === 'up',
    service: 'template-service',
    timestamp: new Date().toISOString(),
    dependencies: {
      database,
      redis: isRedisReady() ? 'up' : 'degraded',
    },
  });
});

app.use('/api/templates', templatesRouter);
app.use('/flows', flowsRouter);
app.use('/webhooks', flowWebhooksRouter);
app.use('/webhooks', metaWebhooksRouter);
app.use('/webhooks', webhookTestRouter);
app.use('/api/webhooks', webhookConfigRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
