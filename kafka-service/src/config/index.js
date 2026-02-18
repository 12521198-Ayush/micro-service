require('dotenv').config();

module.exports = {
  kafka: {
    clientId: process.env.KAFKA_CLIENT_ID || 'whatsapp-platform',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    groupId: process.env.KAFKA_GROUP_ID || 'message-processor-group',
    
    // Topics
    topics: {
      CAMPAIGN_EVENTS: 'campaign.events',
      MESSAGE_QUEUE: 'message.queue',
      MESSAGE_STATUS: 'message.status',
      WEBHOOK_EVENTS: 'webhook.events',
      CAMPAIGN_ANALYTICS: 'campaign.analytics',
      DEAD_LETTER: 'dead-letter.queue'
    },
    
    // Consumer configuration
    consumer: {
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      maxBytesPerPartition: 1048576, // 1MB
      minBytes: 1,
      maxBytes: 10485760, // 10MB
      maxWaitTimeInMs: 1000
    },
    
    // Producer configuration
    producer: {
      allowAutoTopicCreation: true,
      transactionTimeout: 60000,
      maxInFlightRequests: 5,
      idempotent: true,
      acks: -1 // Wait for all replicas
    }
  },
  
  // Rate limiting configuration
  rateLimit: {
    // WhatsApp Cloud API limits
    messagesPerSecond: 80, // Per phone number
    pairRateLimit: {
      messagesPerPeriod: 1,
      periodSeconds: 6
    },
    burstLimit: 45,
    
    // Retry configuration
    retry: {
      maxRetries: 5,
      initialDelayMs: 1000,
      maxDelayMs: 60000,
      backoffMultiplier: 4,
      retryableErrorCodes: [
        130429, // Rate limit exceeded
        131048, // Spam rate limit
        131056, // Pair rate limit
        500,    // Internal error
        503     // Service unavailable
      ]
    }
  },
  
  // Message batching
  batching: {
    maxBatchSize: 50,
    flushIntervalMs: 1000,
    maxQueueSize: 10000
  },
  
  // Database (MySQL)
  database: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT) || 3308,
    database: process.env.DB_NAME || 'kafka_service',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    connectionLimit: 20
  },
  
  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  
  // WhatsApp API
  whatsapp: {
    apiVersion: process.env.META_GRAPH_API_VERSION || 'v24.0',
    baseUrl: 'https://graph.facebook.com'
  },
  
  // Service
  service: {
    port: process.env.PORT || 3007,
    environment: process.env.NODE_ENV || 'development'
  }
};
