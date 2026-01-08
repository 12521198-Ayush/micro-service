const express = require('express');
const cors = require('cors');
const config = require('./config');
const logger = require('./utils/logger');
const { initializeKafka, disconnectKafka, TOPICS } = require('./config/kafka');
const messageProcessor = require('./consumers/messageProcessor');
const webhookProcessor = require('./consumers/webhookProcessor');
const analyticsProcessor = require('./consumers/analyticsProcessor');
const campaignScheduler = require('./jobs/campaignScheduler');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'kafka-service',
    timestamp: new Date().toISOString(),
    topics: Object.values(TOPICS)
  });
});

// Metrics endpoint for monitoring
app.get('/metrics', async (req, res) => {
  try {
    // Return basic metrics
    res.json({
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API to manually trigger campaign message processing (for testing)
app.post('/api/trigger-campaign', async (req, res) => {
  try {
    const { produceMessage } = require('./config/kafka');
    
    await produceMessage(TOPICS.CAMPAIGN_EVENTS, [{
      key: req.body.campaignId,
      value: JSON.stringify({
        event: 'campaign_started',
        campaignId: req.body.campaignId,
        data: req.body
      })
    }]);

    res.json({ success: true, message: 'Campaign trigger queued' });
  } catch (error) {
    logger.error('Failed to trigger campaign:', error);
    res.status(500).json({ error: error.message });
  }
});

// API to queue a single message (for testing)
app.post('/api/queue-message', async (req, res) => {
  try {
    const { produceMessage } = require('./config/kafka');
    const { v4: uuidv4 } = require('uuid');

    const messageId = uuidv4();
    await produceMessage(TOPICS.MESSAGE_QUEUE, [{
      key: messageId,
      value: JSON.stringify({
        id: messageId,
        ...req.body
      })
    }]);

    res.json({ success: true, messageId });
  } catch (error) {
    logger.error('Failed to queue message:', error);
    res.status(500).json({ error: error.message });
  }
});

// API to process webhook events (from WhatsApp service)
app.post('/api/webhook-event', async (req, res) => {
  try {
    const { produceMessage } = require('./config/kafka');

    await produceMessage(TOPICS.WEBHOOK_EVENTS, [{
      key: Date.now().toString(),
      value: JSON.stringify(req.body)
    }]);

    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to queue webhook event:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// Graceful shutdown
async function gracefulShutdown() {
  logger.info('Shutting down gracefully...');
  
  try {
    await messageProcessor.stop();
    await webhookProcessor.stop();
    await analyticsProcessor.stop();
    await disconnectKafka();
    
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
async function startServer() {
  try {
    // Initialize Kafka
    logger.info('Initializing Kafka...');
    await initializeKafka();
    logger.info('Kafka initialized');

    // Start message processor
    logger.info('Starting message processor...');
    await messageProcessor.start();
    
    // Start webhook processor
    logger.info('Starting webhook processor...');
    await webhookProcessor.start();
    
    // Start analytics processor
    logger.info('Starting analytics processor...');
    await analyticsProcessor.start();

    // Start campaign scheduler
    logger.info('Starting campaign scheduler...');
    await campaignScheduler.start();

    // Start HTTP server
    const port = config.port || 3007;
    app.listen(port, () => {
      logger.info(`Kafka service running on port ${port}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
