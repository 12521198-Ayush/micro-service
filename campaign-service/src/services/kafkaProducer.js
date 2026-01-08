import { Kafka } from 'kafkajs';

// Kafka configuration
const kafka = new Kafka({
  clientId: 'campaign-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  retry: {
    initialRetryTime: 100,
    retries: 5
  }
});

const producer = kafka.producer();
let isConnected = false;

// Topics
const TOPICS = {
  CAMPAIGN_EVENTS: 'campaign.events',
  MESSAGE_QUEUE: 'message.queue',
  CAMPAIGN_ANALYTICS: 'campaign.analytics'
};

// Connect producer
export const connectProducer = async () => {
  if (!isConnected) {
    try {
      await producer.connect();
      isConnected = true;
      console.log('Kafka producer connected');
    } catch (error) {
      console.error('Failed to connect Kafka producer:', error);
      throw error;
    }
  }
};

// Disconnect producer
export const disconnectProducer = async () => {
  if (isConnected) {
    await producer.disconnect();
    isConnected = false;
    console.log('Kafka producer disconnected');
  }
};

// Produce message
export const produceMessage = async (topic, messages) => {
  if (!isConnected) {
    await connectProducer();
  }

  try {
    await producer.send({
      topic,
      messages: messages.map(msg => ({
        key: msg.key,
        value: typeof msg.value === 'string' ? msg.value : JSON.stringify(msg.value),
        headers: msg.headers
      }))
    });
  } catch (error) {
    console.error('Failed to produce message:', error);
    throw error;
  }
};

// Campaign-specific message producers
export const publishCampaignStarted = async (campaignId, data) => {
  await produceMessage(TOPICS.CAMPAIGN_EVENTS, [{
    key: campaignId.toString(),
    value: {
      event: 'campaign_started',
      campaignId,
      data,
      timestamp: Date.now()
    }
  }]);
};

export const publishCampaignPaused = async (campaignId) => {
  await produceMessage(TOPICS.CAMPAIGN_EVENTS, [{
    key: campaignId.toString(),
    value: {
      event: 'campaign_paused',
      campaignId,
      timestamp: Date.now()
    }
  }]);
};

export const publishCampaignResumed = async (campaignId) => {
  await produceMessage(TOPICS.CAMPAIGN_EVENTS, [{
    key: campaignId.toString(),
    value: {
      event: 'campaign_resumed',
      campaignId,
      timestamp: Date.now()
    }
  }]);
};

export const publishCampaignCancelled = async (campaignId) => {
  await produceMessage(TOPICS.CAMPAIGN_EVENTS, [{
    key: campaignId.toString(),
    value: {
      event: 'campaign_cancelled',
      campaignId,
      timestamp: Date.now()
    }
  }]);
};

export const queueCampaignMessages = async (campaignId, messages) => {
  // Batch messages for efficiency
  const batchSize = 100;
  
  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);
    
    await produceMessage(TOPICS.MESSAGE_QUEUE, batch.map(msg => ({
      key: msg.id,
      value: {
        ...msg,
        campaignId
      }
    })));
  }
};

export { TOPICS };
export default {
  connectProducer,
  disconnectProducer,
  produceMessage,
  publishCampaignStarted,
  publishCampaignPaused,
  publishCampaignResumed,
  publishCampaignCancelled,
  queueCampaignMessages,
  TOPICS
};
