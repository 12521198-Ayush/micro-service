const cron = require('node-cron');
const { MySQLPool } = require('../config/database');
const logger = require('../utils/logger');
const config = require('../config');
const jwt = require('jsonwebtoken');
const http = require('http');

const CAMPAIGN_SERVICE_URL = process.env.CAMPAIGN_SERVICE_URL || 'http://localhost:3003';
const JWT_SECRET = process.env.JWT_SECRET || 'nyife_jwt_secret_key_2024_super_secure';

class CampaignScheduler {
  constructor() {
    this.pool = new MySQLPool(config.database);
    this.isRunning = false;
  }

  async start() {
    // Run every minute to check for scheduled campaigns
    cron.schedule('* * * * *', async () => {
      if (this.isRunning) {
        logger.warn('Previous scheduler run still in progress, skipping');
        return;
      }

      this.isRunning = true;
      try {
        await this.checkScheduledCampaigns();
      } catch (error) {
        logger.error('Campaign scheduler error:', error);
      } finally {
        this.isRunning = false;
      }
    });

    logger.info('Campaign scheduler started');
  }

  async checkScheduledCampaigns() {
    // Query the campaign_service database directly (cross-DB) for due campaigns
    const query = `
      SELECT id, name, user_id
      FROM campaign_service.campaigns
      WHERE status = 'scheduled'
        AND scheduled_at <= NOW()
        AND scheduled_at > NOW() - INTERVAL 10 MINUTE
    `;

    const result = await this.pool.query(query);
    const campaigns = result.rows;

    if (campaigns.length === 0) return;

    logger.info(`Found ${campaigns.length} scheduled campaign(s) due for execution`);

    for (const campaign of campaigns) {
      await this.triggerCampaign(campaign);
    }
  }

  async triggerCampaign(campaign) {
    try {
      logger.info(`Triggering scheduled campaign: ${campaign.id} - ${campaign.name}`);

      // Generate a service JWT for the campaign owner so the execute endpoint can authenticate
      const serviceToken = jwt.sign(
        { id: campaign.user_id, email: 'scheduler@system', service: 'campaign-scheduler' },
        JWT_SECRET,
        { expiresIn: '5m' }
      );

      // Call the campaign-service execute endpoint (reuses all existing logic)
      const response = await this.httpPost(
        `${CAMPAIGN_SERVICE_URL}/api/campaigns/${campaign.id}/execute`,
        {},
        { Authorization: `Bearer ${serviceToken}` }
      );

      if (response.success) {
        logger.info(`Campaign ${campaign.id} triggered successfully via execute API`);
      } else {
        logger.error(`Campaign ${campaign.id} execute API returned error: ${response.error || JSON.stringify(response)}`);
      }
    } catch (error) {
      logger.error(`Failed to trigger campaign ${campaign.id}:`, error.message || error);

      // Mark campaign as failed in the DB so it's not retried endlessly
      try {
        await this.pool.query(
          `UPDATE campaign_service.campaigns SET status = 'failed', updated_at = NOW() WHERE id = ? AND status = 'scheduled'`,
          [campaign.id]
        );
      } catch (dbErr) {
        logger.error(`Failed to mark campaign ${campaign.id} as failed:`, dbErr.message);
      }
    }
  }

  /**
   * Simple HTTP POST helper (no external dependencies needed)
   */
  httpPost(url, body, headers) {
    return new Promise((resolve, reject) => {
      const parsed = new URL(url);
      const postData = JSON.stringify(body);

      const options = {
        hostname: parsed.hostname,
        port: parsed.port || 80,
        path: parsed.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          ...headers
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve({ success: false, error: data });
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(30000, () => {
        req.destroy(new Error('Request timeout'));
      });
      req.write(postData);
      req.end();
    });
  }

  async stop() {
    await this.pool.end();
    logger.info('Campaign scheduler stopped');
  }
}

module.exports = new CampaignScheduler();
