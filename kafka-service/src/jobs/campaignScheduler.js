const cron = require('node-cron');
const { MySQLPool } = require('../config/database');
const { produceMessage, TOPICS } = require('../config/kafka');
const logger = require('../utils/logger');
const config = require('../config');

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
    const query = `
      SELECT 
        c.id, c.name, c.user_id, c.organization_id,
        c.template_id, c.group_id, c.scheduled_at,
        t.name as template_name, t.language as template_language,
        p.phone_number_id, w.access_token
      FROM campaigns c
      JOIN templates t ON c.template_id = t.id
      JOIN waba_accounts w ON c.organization_id = w.organization_id
      LEFT JOIN phone_numbers p ON w.waba_id = p.waba_id
      WHERE c.status = 'scheduled' 
        AND c.scheduled_at <= NOW()
        AND c.scheduled_at > NOW() - INTERVAL 5 MINUTE
      FOR UPDATE SKIP LOCKED
    `;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(query);

      for (const campaign of result.rows) {
        await this.triggerCampaign(client, campaign);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async triggerCampaign(client, campaign) {
    try {
      logger.info(`Triggering scheduled campaign: ${campaign.id} - ${campaign.name}`);

      // Get contacts from group
      const contactsQuery = `
        SELECT c.phone_number, c.name, c.custom_fields
        FROM contacts c
        JOIN contact_groups cg ON c.id = cg.contact_id
        WHERE cg.group_id = $1
      `;
      const contactsResult = await client.query(contactsQuery, [campaign.group_id]);
      const contacts = contactsResult.rows;

      if (contacts.length === 0) {
        logger.warn(`No contacts found for campaign ${campaign.id}`);
        await this.updateCampaignStatus(client, campaign.id, 'failed', 'No contacts in group');
        return;
      }

      // Update campaign status to running
      await this.updateCampaignStatus(client, campaign.id, 'running', null, contacts.length);

      // Prepare recipients
      const recipients = contacts.map(contact => ({
        phone: contact.phone_number,
        name: contact.name,
        variables: {
          name: contact.name,
          ...(contact.custom_fields || {})
        }
      }));

      // Publish campaign started event to Kafka
      await produceMessage(TOPICS.CAMPAIGN_EVENTS, [{
        key: campaign.id.toString(),
        value: JSON.stringify({
          event: 'campaign_started',
          campaignId: campaign.id,
          data: {
            phoneNumberId: campaign.phone_number_id,
            accessToken: campaign.access_token,
            templateName: campaign.template_name,
            language: campaign.template_language || 'en',
            recipients
          },
          timestamp: Date.now()
        })
      }]);

      logger.info(`Campaign ${campaign.id} triggered with ${recipients.length} recipients`);
    } catch (error) {
      logger.error(`Failed to trigger campaign ${campaign.id}:`, error);
      await this.updateCampaignStatus(client, campaign.id, 'failed', error.message);
    }
  }

  async updateCampaignStatus(client, campaignId, status, errorMessage = null, totalRecipients = null) {
    const query = `
      UPDATE campaigns 
      SET status = $1, 
          error_message = $2,
          total_recipients = COALESCE($3, total_recipients),
          started_at = CASE WHEN $1 = 'running' THEN NOW() ELSE started_at END,
          updated_at = NOW()
      WHERE id = $4
    `;
    await client.query(query, [status, errorMessage, totalRecipients, campaignId]);
  }

  async stop() {
    await this.pool.end();
    logger.info('Campaign scheduler stopped');
  }
}

module.exports = new CampaignScheduler();
