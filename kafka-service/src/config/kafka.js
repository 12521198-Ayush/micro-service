const { Kafka, logLevel } = require('kafkajs');
const config = require('./index');
const logger = require('../utils/logger');

// Create Kafka instance
const kafka = new Kafka({
  clientId: config.kafka.clientId,
  brokers: config.kafka.brokers,
  logLevel: logLevel.INFO,
  retry: {
    initialRetryTime: 100,
    retries: 8
  },
  connectionTimeout: 10000,
  authenticationTimeout: 10000
});

// Create producer
const producer = kafka.producer({
  allowAutoTopicCreation: config.kafka.producer.allowAutoTopicCreation,
  transactionTimeout: config.kafka.producer.transactionTimeout,
  maxInFlightRequests: config.kafka.producer.maxInFlightRequests,
  idempotent: config.kafka.producer.idempotent
});

// Create consumer
const consumer = kafka.consumer({
  groupId: config.kafka.groupId,
  sessionTimeout: config.kafka.consumer.sessionTimeout,
  heartbeatInterval: config.kafka.consumer.heartbeatInterval,
  maxBytesPerPartition: config.kafka.consumer.maxBytesPerPartition,
  minBytes: config.kafka.consumer.minBytes,
  maxBytes: config.kafka.consumer.maxBytes,
  maxWaitTimeInMs: config.kafka.consumer.maxWaitTimeInMs
});

// Admin client for topic management
const admin = kafka.admin();

// Topics configuration
const TOPICS = config.kafka.topics;

// Initialize Kafka
const initializeKafka = async () => {
  try {
    // Connect admin
    await admin.connect();
    logger.info('Kafka admin connected');

    // Create topics if they don't exist
    const existingTopics = await admin.listTopics();
    const topicsToCreate = Object.values(TOPICS).filter(
      topic => !existingTopics.includes(topic)
    );

    if (topicsToCreate.length > 0) {
      await admin.createTopics({
        topics: topicsToCreate.map(topic => ({
          topic,
          numPartitions: 3,
          replicationFactor: 1
        }))
      });
      logger.info(`Created topics: ${topicsToCreate.join(', ')}`);
    }

    await admin.disconnect();

    // Connect producer
    await producer.connect();
    logger.info('Kafka producer connected');

    // Connect consumer
    await consumer.connect();
    logger.info('Kafka consumer connected');

    return true;
  } catch (error) {
    logger.error('Failed to initialize Kafka:', error);
    throw error;
  }
};

// Subscribe to topics
const subscribeToTopics = async (topics) => {
  try {
    for (const topic of topics) {
      await consumer.subscribe({ topic, fromBeginning: false });
      logger.info(`Subscribed to topic: ${topic}`);
    }
  } catch (error) {
    logger.error('Failed to subscribe to topics:', error);
    throw error;
  }
};

// Produce message
const produceMessage = async (topic, messages) => {
  try {
    const result = await producer.send({
      topic,
      messages: Array.isArray(messages) ? messages : [messages]
    });
    return result;
  } catch (error) {
    logger.error(`Failed to produce message to ${topic}:`, error);
    throw error;
  }
};

// Produce message with key
const produceMessageWithKey = async (topic, key, value) => {
  try {
    const result = await producer.send({
      topic,
      messages: [
        {
          key,
          value: typeof value === 'string' ? value : JSON.stringify(value),
          timestamp: Date.now().toString()
        }
      ]
    });
    return result;
  } catch (error) {
    logger.error(`Failed to produce message to ${topic}:`, error);
    throw error;
  }
};

// Graceful shutdown
const shutdown = async () => {
  try {
    await consumer.disconnect();
    await producer.disconnect();
    logger.info('Kafka connections closed');
  } catch (error) {
    logger.error('Error during Kafka shutdown:', error);
  }
};

module.exports = {
  kafka,
  producer,
  consumer,
  admin,
  TOPICS,
  initializeKafka,
  subscribeToTopics,
  produceMessage,
  produceMessageWithKey,
  shutdown
};
