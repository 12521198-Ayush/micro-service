import axios from 'axios';
import pool from '../config/database.js';
import { cache } from '../config/redis.js';

const META_GRAPH_URL = 'https://graph.facebook.com/v24.0';

// Embedded Signup Configuration
const getEmbeddedSignupConfig = () => ({
  appId: process.env.META_APP_ID,
  appSecret: process.env.META_APP_SECRET,
  configId: process.env.META_EMBEDDED_SIGNUP_CONFIG_ID,
  redirectUri: process.env.META_REDIRECT_URI || 'https://your-domain.com/auth/facebook/callback'
});

class EmbeddedSignupController {
  /**
   * Initialize Embedded Signup Session
   * Returns the configuration needed for Facebook Login SDK
   */
  static async initializeSignup(req, res) {
    try {
      const config = getEmbeddedSignupConfig();
      const { userId, organizationId } = req.user;

      // Generate a unique session ID
      const sessionId = `es_${userId}_${Date.now()}`;

      // Store session in Redis
      await cache.set(`embedded_signup:${sessionId}`, {
        userId,
        organizationId,
        createdAt: Date.now(),
        status: 'initialized'
      }, 3600); // 1 hour TTL

      res.json({
        success: true,
        data: {
          sessionId,
          appId: config.appId,
          configId: config.configId,
          redirectUri: config.redirectUri,
          loginUrl: `https://www.facebook.com/v24.0/dialog/oauth?client_id=${config.appId}&redirect_uri=${encodeURIComponent(config.redirectUri)}&config_id=${config.configId}&response_type=code&override_default_response_type=true&extras=${encodeURIComponent(JSON.stringify({ setup: {}, featureType: '', sessionInfoVersion: 2 }))}`,
          sdkConfig: {
            scope: 'whatsapp_business_management,whatsapp_business_messaging',
            extras: {
              feature: 'whatsapp_embedded_signup',
              version: 2,
              sessionInfoVersion: 2
            }
          }
        }
      });
    } catch (error) {
      console.error('Initialize Embedded Signup Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to initialize embedded signup',
        details: error.message
      });
    }
  }

  /**
   * Handle OAuth Callback from Facebook
   * Exchange code for access token
   */
  static async handleCallback(req, res) {
    try {
      const { code, state, sessionId } = req.body;
      const config = getEmbeddedSignupConfig();

      if (!code) {
        return res.status(400).json({
          success: false,
          error: 'Authorization code is required'
        });
      }

      // Verify session
      const session = await cache.get(`embedded_signup:${sessionId}`);
      if (!session) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired session'
        });
      }

      // Exchange code for access token
      const tokenResponse = await axios.get(`${META_GRAPH_URL}/oauth/access_token`, {
        params: {
          client_id: config.appId,
          client_secret: config.appSecret,
          redirect_uri: config.redirectUri,
          code
        }
      });

      const { access_token, token_type, expires_in } = tokenResponse.data;

      // Debug token to get user/business info
      const debugResponse = await axios.get(`${META_GRAPH_URL}/debug_token`, {
        params: {
          input_token: access_token,
          access_token: `${config.appId}|${config.appSecret}`
        }
      });

      // Update session with token info
      await cache.set(`embedded_signup:${sessionId}`, {
        ...session,
        accessToken: access_token,
        expiresIn: expires_in,
        tokenType: token_type,
        status: 'authenticated'
      }, 3600);

      res.json({
        success: true,
        data: {
          sessionId,
          expiresIn: expires_in,
          tokenInfo: debugResponse.data.data
        }
      });
    } catch (error) {
      console.error('Handle Callback Error:', error.response?.data || error);
      res.status(500).json({
        success: false,
        error: 'Failed to exchange authorization code',
        details: error.response?.data?.error?.message || error.message
      });
    }
  }

  /**
   * Complete Embedded Signup - Get WABA and Phone Number Info
   * Called after user completes the signup flow on Facebook
   */
  static async completeSignup(req, res) {
    try {
      const { sessionId, wabaId, phoneNumberId } = req.body;

      // Get session
      const session = await cache.get(`embedded_signup:${sessionId}`);
      if (!session || !session.accessToken) {
        return res.status(400).json({
          success: false,
          error: 'Invalid session or not authenticated'
        });
      }

      const accessToken = session.accessToken;

      // Get WABA details
      const wabaResponse = await axios.get(`${META_GRAPH_URL}/${wabaId}`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,currency,timezone_id,message_template_namespace,account_review_status'
        }
      });

      // Get Phone Number details
      const phoneResponse = await axios.get(`${META_GRAPH_URL}/${phoneNumberId}`, {
        params: {
          access_token: accessToken,
          fields: 'id,display_phone_number,verified_name,quality_rating,platform_type,throughput,is_official_business_account,code_verification_status,name_status'
        }
      });

      // Subscribe WABA to webhooks
      await this.subscribeToWebhooks(wabaId, accessToken);

      // Register phone number for messaging
      await this.registerPhoneNumber(phoneNumberId, accessToken);

      // Save to database
      await this.saveWabaDetails(
        session.userId,
        session.organizationId,
        wabaResponse.data,
        phoneResponse.data,
        accessToken
      );

      // Update session status
      await cache.set(`embedded_signup:${sessionId}`, {
        ...session,
        wabaId,
        phoneNumberId,
        status: 'completed'
      }, 3600);

      res.json({
        success: true,
        message: 'WhatsApp Business Account successfully connected',
        data: {
          waba: {
            id: wabaResponse.data.id,
            name: wabaResponse.data.name,
            currency: wabaResponse.data.currency,
            timezoneId: wabaResponse.data.timezone_id,
            templateNamespace: wabaResponse.data.message_template_namespace,
            reviewStatus: wabaResponse.data.account_review_status
          },
          phoneNumber: {
            id: phoneResponse.data.id,
            displayPhoneNumber: phoneResponse.data.display_phone_number,
            verifiedName: phoneResponse.data.verified_name,
            qualityRating: phoneResponse.data.quality_rating,
            platformType: phoneResponse.data.platform_type
          }
        }
      });
    } catch (error) {
      console.error('Complete Signup Error:', error.response?.data || error);
      res.status(500).json({
        success: false,
        error: 'Failed to complete signup',
        details: error.response?.data?.error?.message || error.message
      });
    }
  }

  /**
   * Subscribe WABA to webhooks
   */
  static async subscribeToWebhooks(wabaId, accessToken) {
    try {
      await axios.post(`${META_GRAPH_URL}/${wabaId}/subscribed_apps`, null, {
        params: {
          access_token: accessToken
        }
      });
      console.log(`WABA ${wabaId} subscribed to webhooks`);
    } catch (error) {
      console.error('Failed to subscribe to webhooks:', error.response?.data || error);
      throw error;
    }
  }

  /**
   * Register phone number for messaging
   */
  static async registerPhoneNumber(phoneNumberId, accessToken) {
    try {
      await axios.post(`${META_GRAPH_URL}/${phoneNumberId}/register`, {
        messaging_product: 'whatsapp',
        pin: '123456' // 6-digit PIN for 2FA
      }, {
        params: {
          access_token: accessToken
        }
      });
      console.log(`Phone number ${phoneNumberId} registered`);
    } catch (error) {
      // Phone might already be registered
      console.warn('Register phone number warning:', error.response?.data?.error?.message);
    }
  }

  /**
   * Save WABA details to database
   */
  static async saveWabaDetails(userId, organizationId, wabaData, phoneData, accessToken) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Insert WABA account
      const wabaQuery = `
        INSERT INTO waba_accounts (
          user_id, organization_id, waba_id, business_name, currency,
          timezone_id, template_namespace, review_status, access_token, 
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          business_name = VALUES(business_name),
          currency = VALUES(currency),
          access_token = VALUES(access_token),
          updated_at = NOW()
      `;

      await connection.execute(wabaQuery, [
        userId,
        organizationId,
        wabaData.id,
        wabaData.name,
        wabaData.currency,
        wabaData.timezone_id,
        wabaData.message_template_namespace,
        wabaData.account_review_status,
        accessToken
      ]);

      // Insert phone number
      const phoneQuery = `
        INSERT INTO phone_numbers (
          waba_id, phone_number_id, display_phone_number, verified_name,
          quality_rating, platform_type, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'CONNECTED', NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          verified_name = VALUES(verified_name),
          quality_rating = VALUES(quality_rating),
          status = 'CONNECTED',
          updated_at = NOW()
      `;

      await connection.execute(phoneQuery, [
        wabaData.id,
        phoneData.id,
        phoneData.display_phone_number,
        phoneData.verified_name,
        phoneData.quality_rating,
        phoneData.platform_type
      ]);

      // Update user with WABA ID
      const userQuery = `
        UPDATE users SET meta_business_account_id = ? WHERE id = ?
      `;
      await connection.execute(userQuery, [wabaData.id, userId]);

      await connection.commit();

      // Invalidate user cache
      await cache.delete(`user_id:${userId}`);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get connected WABA accounts for user
   */
  static async getConnectedAccounts(req, res) {
    try {
      const { userId } = req.user;

      const connection = await pool.getConnection();
      try {
        const query = `
          SELECT 
            w.id, w.waba_id, w.business_name, w.currency, w.timezone_id,
            w.template_namespace, w.review_status, w.created_at,
            p.phone_number_id, p.display_phone_number, p.verified_name,
            p.quality_rating, p.platform_type, p.status as phone_status
          FROM waba_accounts w
          LEFT JOIN phone_numbers p ON w.waba_id = p.waba_id
          WHERE w.user_id = ?
          ORDER BY w.created_at DESC
        `;

        const [rows] = await connection.execute(query, [userId]);

        // Group phone numbers by WABA
        const accounts = {};
        rows.forEach(row => {
          if (!accounts[row.waba_id]) {
            accounts[row.waba_id] = {
              id: row.id,
              wabaId: row.waba_id,
              businessName: row.business_name,
              currency: row.currency,
              timezoneId: row.timezone_id,
              templateNamespace: row.template_namespace,
              reviewStatus: row.review_status,
              createdAt: row.created_at,
              phoneNumbers: []
            };
          }
          if (row.phone_number_id) {
            accounts[row.waba_id].phoneNumbers.push({
              phoneNumberId: row.phone_number_id,
              displayPhoneNumber: row.display_phone_number,
              verifiedName: row.verified_name,
              qualityRating: row.quality_rating,
              platformType: row.platform_type,
              status: row.phone_status
            });
          }
        });

        res.json({
          success: true,
          data: Object.values(accounts)
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Get Connected Accounts Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch connected accounts'
      });
    }
  }

  /**
   * Disconnect WABA account
   */
  static async disconnectAccount(req, res) {
    try {
      const { wabaId } = req.params;
      const { userId } = req.user;

      const connection = await pool.getConnection();
      try {
        // Verify ownership
        const [rows] = await connection.execute(
          'SELECT id FROM waba_accounts WHERE waba_id = ? AND user_id = ?',
          [wabaId, userId]
        );

        if (rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'WABA account not found'
          });
        }

        // Delete phone numbers first
        await connection.execute(
          'DELETE FROM phone_numbers WHERE waba_id = ?',
          [wabaId]
        );

        // Delete WABA account
        await connection.execute(
          'DELETE FROM waba_accounts WHERE waba_id = ?',
          [wabaId]
        );

        // Clear WABA from user if it's their default
        await connection.execute(
          'UPDATE users SET meta_business_account_id = NULL WHERE id = ? AND meta_business_account_id = ?',
          [userId, wabaId]
        );

        res.json({
          success: true,
          message: 'WhatsApp Business Account disconnected successfully'
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Disconnect Account Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to disconnect account'
      });
    }
  }

  /**
   * Refresh Access Token
   */
  static async refreshToken(req, res) {
    try {
      const { wabaId } = req.params;
      const { userId } = req.user;
      const config = getEmbeddedSignupConfig();

      const connection = await pool.getConnection();
      try {
        // Get current token
        const [rows] = await connection.execute(
          'SELECT access_token FROM waba_accounts WHERE waba_id = ? AND user_id = ?',
          [wabaId, userId]
        );

        if (rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'WABA account not found'
          });
        }

        const currentToken = rows[0].access_token;

        // Exchange for long-lived token
        const response = await axios.get(`${META_GRAPH_URL}/oauth/access_token`, {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: config.appId,
            client_secret: config.appSecret,
            fb_exchange_token: currentToken
          }
        });

        const newToken = response.data.access_token;

        // Update token in database
        await connection.execute(
          'UPDATE waba_accounts SET access_token = ?, updated_at = NOW() WHERE waba_id = ?',
          [newToken, wabaId]
        );

        res.json({
          success: true,
          message: 'Access token refreshed successfully',
          expiresIn: response.data.expires_in
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Refresh Token Error:', error.response?.data || error);
      res.status(500).json({
        success: false,
        error: 'Failed to refresh access token',
        details: error.response?.data?.error?.message || error.message
      });
    }
  }

  /**
   * Get Phone Number Quality and Limits
   */
  static async getPhoneNumberStatus(req, res) {
    try {
      const { phoneNumberId } = req.params;
      const { userId } = req.user;

      const connection = await pool.getConnection();
      try {
        // Get access token for this phone number
        const [rows] = await connection.execute(`
          SELECT w.access_token 
          FROM waba_accounts w
          JOIN phone_numbers p ON w.waba_id = p.waba_id
          WHERE p.phone_number_id = ? AND w.user_id = ?
        `, [phoneNumberId, userId]);

        if (rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Phone number not found'
          });
        }

        const accessToken = rows[0].access_token;

        // Get phone number details from Meta API
        const response = await axios.get(`${META_GRAPH_URL}/${phoneNumberId}`, {
          params: {
            access_token: accessToken,
            fields: 'id,display_phone_number,verified_name,quality_rating,messaging_limit_tier,current_limit,max_daily_conversation_per_phone,max_phone_numbers_per_business'
          }
        });

        res.json({
          success: true,
          data: {
            phoneNumberId: response.data.id,
            displayPhoneNumber: response.data.display_phone_number,
            verifiedName: response.data.verified_name,
            qualityRating: response.data.quality_rating,
            messagingLimitTier: response.data.messaging_limit_tier,
            currentLimit: response.data.current_limit,
            maxDailyConversations: response.data.max_daily_conversation_per_phone
          }
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Get Phone Status Error:', error.response?.data || error);
      res.status(500).json({
        success: false,
        error: 'Failed to get phone number status'
      });
    }
  }

  /**
   * Verify Business (for official business account)
   */
  static async initializeBusinessVerification(req, res) {
    try {
      const { wabaId } = req.params;
      const { userId } = req.user;

      const connection = await pool.getConnection();
      try {
        const [rows] = await connection.execute(
          'SELECT access_token FROM waba_accounts WHERE waba_id = ? AND user_id = ?',
          [wabaId, userId]
        );

        if (rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'WABA account not found'
          });
        }

        const accessToken = rows[0].access_token;

        // Get business verification status
        const response = await axios.get(`${META_GRAPH_URL}/${wabaId}`, {
          params: {
            access_token: accessToken,
            fields: 'account_review_status,business_verification_status'
          }
        });

        res.json({
          success: true,
          data: {
            wabaId,
            accountReviewStatus: response.data.account_review_status,
            businessVerificationStatus: response.data.business_verification_status,
            verificationUrl: `https://business.facebook.com/settings/security/?business_id=${wabaId}`
          }
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Business Verification Error:', error.response?.data || error);
      res.status(500).json({
        success: false,
        error: 'Failed to get business verification status'
      });
    }
  }
}

export default EmbeddedSignupController;
