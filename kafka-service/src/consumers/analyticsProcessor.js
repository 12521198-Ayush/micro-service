const { consumer, TOPICS, kafka } = require('../config/kafka');
const logger = require('../utils/logger');
const config = require('../config');
const { MySQLPool } = require('../config/database');

class AnalyticsProcessor {
  constructor() {
    this.pool = new MySQLPool(config.database);
    this.analyticsBuffer = new Map();
    this.flushInterval = 10000; // Flush every 10 seconds
  }

  async start() {
    // Create separate consumer for analytics
    const analyticsConsumer = kafka.consumer({ 
      groupId: 'analytics-processor-group' 
    });

    await analyticsConsumer.connect();
    await analyticsConsumer.subscribe({ 
      topic: TOPICS.CAMPAIGN_ANALYTICS, 
      fromBeginning: false 
    });

    // Start periodic flush
    this.flushTimer = setInterval(() => this.flushAnalytics(), this.flushInterval);

    await analyticsConsumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const payload = JSON.parse(message.value.toString());
          await this.processAnalyticsEvent(payload);
        } catch (error) {
          logger.error('Error processing analytics:', error);
        }
      }
    });

    logger.info('Analytics processor started');
  }

  async processAnalyticsEvent(payload) {
    const { campaignId, event, timestamp } = payload;

    if (!campaignId) return;

    // Initialize campaign analytics buffer if not exists
    if (!this.analyticsBuffer.has(campaignId)) {
      this.analyticsBuffer.set(campaignId, {
        sent: 0,
        delivered: 0,
        read: 0,
        failed: 0,
        clicked: 0,
        replied: 0,
        lastUpdated: timestamp
      });
    }

    const analytics = this.analyticsBuffer.get(campaignId);

    // Update counters based on event
    switch (event) {
      case 'message_sent':
        analytics.sent++;
        break;
      case 'message_delivered':
        analytics.delivered++;
        break;
      case 'message_read':
        analytics.read++;
        break;
      case 'message_failed':
        analytics.failed++;
        break;
      case 'message_clicked':
        analytics.clicked++;
        break;
      case 'message_replied':
        analytics.replied++;
        break;
    }

    analytics.lastUpdated = timestamp;
  }

  async flushAnalytics() {
    if (this.analyticsBuffer.size === 0) return;

    logger.info(`Flushing analytics for ${this.analyticsBuffer.size} campaigns`);

    for (const [campaignId, analytics] of this.analyticsBuffer) {
      try {
        await this.updateCampaignAnalytics(campaignId, analytics);
      } catch (error) {
        logger.error(`Failed to flush analytics for campaign ${campaignId}:`, error);
      }
    }

    // Clear buffer after flush
    this.analyticsBuffer.clear();
  }

  async updateCampaignAnalytics(campaignId, analytics) {
    const query = `
      INSERT INTO campaign_analytics (
        campaign_id, sent_count, delivered_count, read_count, 
        failed_count, clicked_count, replied_count, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE 
        sent_count = sent_count + ?,
        delivered_count = delivered_count + ?,
        read_count = read_count + ?,
        failed_count = failed_count + ?,
        clicked_count = clicked_count + ?,
        replied_count = replied_count + ?,
        updated_at = NOW()
    `;

    await this.pool.query(query, [
      campaignId,
      analytics.sent,
      analytics.delivered,
      analytics.read,
      analytics.failed,
      analytics.clicked,
      analytics.replied,
      analytics.sent,
      analytics.delivered,
      analytics.read,
      analytics.failed,
      analytics.clicked,
      analytics.replied
    ]);

    // Also update the campaign summary
    await this.updateCampaignSummary(campaignId);
  }

  async updateCampaignSummary(campaignId) {
    const query = `
      UPDATE campaigns c
      SET 
        sent_count = COALESCE((SELECT sent_count FROM campaign_analytics WHERE campaign_id = c.id), 0),
        delivered_count = COALESCE((SELECT delivered_count FROM campaign_analytics WHERE campaign_id = c.id), 0),
        read_count = COALESCE((SELECT read_count FROM campaign_analytics WHERE campaign_id = c.id), 0),
        failed_count = COALESCE((SELECT failed_count FROM campaign_analytics WHERE campaign_id = c.id), 0),
        updated_at = NOW()
      WHERE id = $1
    `;

    await this.pool.query(query, [campaignId]);
  }

  async generateDailyReport(campaignId) {
    const query = `
      SELECT 
        DATE(created_at) as date,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN delivery_status = 'delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN delivery_status = 'read' THEN 1 ELSE 0 END) as read_count,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      ORDER BY date DESC
    `;

    const result = await this.pool.query(query, [campaignId]);
    return result.rows;
  }

  async generateHourlyReport(campaignId, date) {
    const query = `
      SELECT 
        HOUR(created_at) as hour,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN delivery_status = 'delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN delivery_status = 'read' THEN 1 ELSE 0 END) as read_count,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      GROUP BY HOUR(created_at)
      ORDER BY hour
    `;

    const result = await this.pool.query(query, [campaignId, date]);
    return result.rows;
  }

  async getCampaignPerformanceMetrics(campaignId) {
    const query = `
      SELECT 
        c.id,
        c.name,
        c.status,
        c.total_recipients,
        ca.sent_count,
        ca.delivered_count,
        ca.read_count,
        ca.failed_count,
        ca.clicked_count,
        ca.replied_count,
        CASE WHEN ca.sent_count > 0 
          THEN ROUND((ca.delivered_count / ca.sent_count) * 100, 2) 
          ELSE 0 
        END as delivery_rate,
        CASE WHEN ca.delivered_count > 0 
          THEN ROUND((ca.read_count / ca.delivered_count) * 100, 2) 
          ELSE 0 
        END as read_rate,
        CASE WHEN ca.read_count > 0 
          THEN ROUND((ca.clicked_count / ca.read_count) * 100, 2) 
          ELSE 0 
        END as click_rate,
        CASE WHEN ca.read_count > 0 
          THEN ROUND((ca.replied_count / ca.read_count) * 100, 2) 
          ELSE 0 
        END as reply_rate
      FROM campaigns c
      LEFT JOIN campaign_analytics ca ON c.id = ca.campaign_id
      WHERE c.id = $1
    `;

    const result = await this.pool.query(query, [campaignId]);
    return result.rows[0];
  }

  async getOrganizationAnalytics(organizationId, startDate, endDate) {
    const query = `
      SELECT 
        DATE(m.created_at) as date,
        COUNT(*) as total_messages,
        SUM(CASE WHEN m.status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN m.delivery_status = 'delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN m.delivery_status = 'read' THEN 1 ELSE 0 END) as read_count,
        SUM(CASE WHEN m.status = 'failed' THEN 1 ELSE 0 END) as failed,
        COUNT(DISTINCT m.campaign_id) as campaigns
      FROM messages m
      JOIN campaigns c ON m.campaign_id = c.id
      WHERE c.organization_id = $1 
        AND m.created_at >= $2 
        AND m.created_at <= $3
      GROUP BY DATE(m.created_at)
      ORDER BY date DESC
    `;

    const result = await this.pool.query(query, [organizationId, startDate, endDate]);
    return result.rows;
  }

  async stop() {
    clearInterval(this.flushTimer);
    await this.flushAnalytics(); // Final flush
    await this.pool.end();
    logger.info('Analytics processor stopped');
  }
}

module.exports = new AnalyticsProcessor();
