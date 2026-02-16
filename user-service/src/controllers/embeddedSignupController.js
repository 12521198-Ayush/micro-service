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

      // Try to subscribe WABA to webhooks (non-blocking - can fail)
      try {
        await this.subscribeToWebhooks(wabaId, accessToken);
      } catch (webhookError) {
        console.warn('Webhook subscription skipped:', webhookError.message);
        // Continue - webhook can be configured later
      }

      // Try to register phone number for messaging (non-blocking - may already be registered)
      try {
        await this.registerPhoneNumber(phoneNumberId, accessToken);
      } catch (registerError) {
        console.warn('Phone registration skipped:', registerError.message);
        // Continue - phone may already be registered
      }

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

      // Set default WABA ID only if user doesn't have one yet
      const userQuery = `
        UPDATE users SET meta_business_account_id = COALESCE(meta_business_account_id, ?) WHERE id = ?
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
      const userId = req.user?.id || req.user?.userId;

      const connection = await pool.getConnection();
      try {
        const query = `
          SELECT 
            w.id, w.waba_id, w.business_name, w.currency, w.timezone_id,
            w.template_namespace, w.review_status, w.business_verification_status,
            w.organization_id, w.status as waba_status, w.created_at,
            p.phone_number_id, p.display_phone_number, p.verified_name,
            p.quality_rating, p.platform_type, p.status as phone_status,
            p.messaging_limit_tier, p.code_verification_status, p.name_status
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
              businessVerificationStatus: row.business_verification_status,
              organizationId: row.organization_id,
              status: row.waba_status,
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
              status: row.phone_status,
              messagingLimitTier: row.messaging_limit_tier,
              codeVerificationStatus: row.code_verification_status,
              nameStatus: row.name_status
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
      const userId = req.user?.id || req.user?.userId;

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
      const userId = req.user?.id || req.user?.userId;
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
      const userId = req.user?.id || req.user?.userId;

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
      const userId = req.user?.id || req.user?.userId;

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

  /**
   * Override WABA Webhook Callback URL
   * Sets a custom webhook URL for the WABA account
   */
  static async overrideWebhookCallback(req, res) {
    try {
      const { wabaId } = req.params;
      const { callbackUrl, verifyToken } = req.body;
      const { userId, organizationId } = req.user;

      const connection = await pool.getConnection();
      try {
        // Get access token
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

        // Determine callback URL and verify token
        const webhookUrl = callbackUrl || `${process.env.WEBHOOK_BASE_URL}/webhook/whatsapp/${organizationId}`;
        const webhookToken = verifyToken || `org_${organizationId}_${Date.now()}`;

        // Override callback URL on Meta
        const response = await axios.post(
          `${META_GRAPH_URL}/${wabaId}/subscribed_apps`,
          {
            override_callback_uri: webhookUrl,
            verify_token: webhookToken
          },
          {
            params: { access_token: accessToken }
          }
        );

        // Save webhook settings to database
        await connection.execute(`
          INSERT INTO webhook_subscriptions (waba_id, webhook_url, verify_token, is_active)
          VALUES (?, ?, ?, TRUE)
          ON DUPLICATE KEY UPDATE
            webhook_url = VALUES(webhook_url),
            verify_token = VALUES(verify_token),
            is_active = TRUE,
            updated_at = NOW()
        `, [wabaId, webhookUrl, webhookToken]);

        res.json({
          success: true,
          message: 'Webhook callback URL updated successfully',
          data: {
            wabaId,
            webhookUrl,
            verifyToken: webhookToken
          }
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Override Webhook Callback Error:', error.response?.data || error);
      res.status(500).json({
        success: false,
        error: 'Failed to override webhook callback URL',
        details: error.response?.data?.error?.message || error.message
      });
    }
  }

  /**
   * Get Business Profile for a phone number
   */
  static async getBusinessProfile(req, res) {
    try {
      const { phoneNumberId } = req.params;
      const userId = req.user?.id || req.user?.userId;

      const connection = await pool.getConnection();
      try {
        // Get access token
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

        // Get business profile from Meta API
        const response = await axios.get(
          `${META_GRAPH_URL}/${phoneNumberId}/whatsapp_business_profile`,
          {
            params: {
              access_token: accessToken,
              fields: 'about,address,description,email,profile_picture_url,websites,vertical'
            }
          }
        );

        const profile = response.data.data?.[0] || {};

        res.json({
          success: true,
          data: {
            phoneNumberId,
            about: profile.about || null,
            address: profile.address || null,
            description: profile.description || null,
            email: profile.email || null,
            profilePictureUrl: profile.profile_picture_url || null,
            websites: profile.websites || [],
            industry: profile.vertical || null
          }
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Get Business Profile Error:', error.response?.data || error);
      res.status(500).json({
        success: false,
        error: 'Failed to get business profile',
        details: error.response?.data?.error?.message || error.message
      });
    }
  }

  /**
   * Update Business Profile for a phone number
   */
  static async updateBusinessProfile(req, res) {
    try {
      const { phoneNumberId } = req.params;
      const { about, address, description, email, websites, industry, profilePictureUrl } = req.body;
      const userId = req.user?.id || req.user?.userId;

      const connection = await pool.getConnection();
      try {
        // Get access token
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

        // Build profile update data
        const profileData = {
          messaging_product: 'whatsapp'
        };

        if (about !== undefined) profileData.about = about;
        if (address !== undefined) profileData.address = address;
        if (description !== undefined) profileData.description = description;
        if (email !== undefined) profileData.email = email;
        if (websites !== undefined) profileData.websites = websites;
        if (industry !== undefined) profileData.vertical = industry;
        if (profilePictureUrl !== undefined) profileData.profile_picture_url = profilePictureUrl;

        // Update business profile on Meta API
        const response = await axios.post(
          `${META_GRAPH_URL}/${phoneNumberId}/whatsapp_business_profile`,
          profileData,
          {
            params: { access_token: accessToken }
          }
        );

        res.json({
          success: true,
          message: 'Business profile updated successfully',
          data: response.data
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Update Business Profile Error:', error.response?.data || error);
      res.status(500).json({
        success: false,
        error: 'Failed to update business profile',
        details: error.response?.data?.error?.message || error.message
      });
    }
  }

  /**
   * Sync Templates from Meta to local database
   */
  static async syncTemplates(req, res) {
    try {
      const { wabaId } = req.params;
      const { userId, organizationId } = req.user;

      const connection = await pool.getConnection();
      try {
        // Get access token
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
        let allTemplates = [];
        let nextUrl = `${META_GRAPH_URL}/${wabaId}/message_templates`;

        // Paginate through all templates
        do {
          const response = await axios.get(nextUrl, {
            params: {
              access_token: accessToken,
              limit: 100
            }
          });

          const templates = response.data.data || [];
          allTemplates = allTemplates.concat(templates);

          nextUrl = response.data.paging?.next || null;
        } while (nextUrl);

        // Sync templates to database (call template service or store locally)
        const syncResults = await EmbeddedSignupController.saveTemplates(
          organizationId,
          userId,
          wabaId,
          allTemplates,
          connection
        );

        res.json({
          success: true,
          message: 'Templates synced successfully',
          data: {
            totalSynced: allTemplates.length,
            created: syncResults.created,
            updated: syncResults.updated
          }
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Sync Templates Error:', error.response?.data || error);
      res.status(500).json({
        success: false,
        error: 'Failed to sync templates',
        details: error.response?.data?.error?.message || error.message
      });
    }
  }

  /**
   * Save templates to database
   */
  static async saveTemplates(organizationId, userId, wabaId, templates, connection) {
    let created = 0;
    let updated = 0;

    for (const template of templates) {
      try {
        // Check if template exists
        const [existing] = await connection.execute(
          'SELECT id FROM synced_templates WHERE organization_id = ? AND meta_id = ?',
          [organizationId, template.id]
        );

        if (existing.length > 0) {
          // Update existing template
          await connection.execute(`
            UPDATE synced_templates 
            SET name = ?, category = ?, language = ?, status = ?, 
                metadata = ?, updated_at = NOW()
            WHERE organization_id = ? AND meta_id = ?
          `, [
            template.name,
            template.category,
            template.language,
            template.status,
            JSON.stringify(template),
            organizationId,
            template.id
          ]);
          updated++;
        } else {
          // Create new template
          await connection.execute(`
            INSERT INTO synced_templates 
            (organization_id, waba_id, meta_id, name, category, language, status, metadata, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
          `, [
            organizationId,
            wabaId,
            template.id,
            template.name,
            template.category,
            template.language,
            template.status,
            JSON.stringify(template),
            userId
          ]);
          created++;
        }
      } catch (err) {
        console.error(`Failed to save template ${template.id}:`, err.message);
      }
    }

    return { created, updated };
  }

  /**
   * Get Account Review Status
   */
  static async getAccountReviewStatus(req, res) {
    try {
      const { wabaId } = req.params;
      const userId = req.user?.id || req.user?.userId;

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

        // Get account review status from Meta API
        const response = await axios.get(`${META_GRAPH_URL}/${wabaId}`, {
          params: {
            access_token: accessToken,
            fields: 'id,name,account_review_status,business_verification_status,currency,timezone_id'
          }
        });

        // Update local database with latest status
        await connection.execute(`
          UPDATE waba_accounts 
          SET review_status = ?, business_verification_status = ?, updated_at = NOW()
          WHERE waba_id = ?
        `, [
          response.data.account_review_status,
          response.data.business_verification_status,
          wabaId
        ]);

        res.json({
          success: true,
          data: {
            wabaId: response.data.id,
            name: response.data.name,
            accountReviewStatus: response.data.account_review_status,
            businessVerificationStatus: response.data.business_verification_status,
            currency: response.data.currency,
            timezoneId: response.data.timezone_id
          }
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Get Account Review Status Error:', error.response?.data || error);
      res.status(500).json({
        success: false,
        error: 'Failed to get account review status',
        details: error.response?.data?.error?.message || error.message
      });
    }
  }

  /**
   * Get detailed phone number information
   */
  static async getPhoneNumberDetails(req, res) {
    try {
      const { phoneNumberId } = req.params;
      const userId = req.user?.id || req.user?.userId;

      const connection = await pool.getConnection();
      try {
        // Get access token
        const [rows] = await connection.execute(`
          SELECT w.access_token, p.waba_id 
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

        const { access_token: accessToken, waba_id: wabaId } = rows[0];

        // Get detailed phone number info from Meta API
        const response = await axios.get(`${META_GRAPH_URL}/${phoneNumberId}`, {
          params: {
            access_token: accessToken,
            fields: 'id,display_phone_number,verified_name,quality_rating,name_status,' +
                    'code_verification_status,messaging_limit_tier,status,throughput,' +
                    'is_official_business_account,certificate,new_certificate,new_name_status'
          }
        });

        // Update phone number in database
        await connection.execute(`
          UPDATE phone_numbers 
          SET verified_name = ?, quality_rating = ?, name_status = ?, 
              code_verification_status = ?, messaging_limit_tier = ?,
              is_official_business_account = ?, updated_at = NOW()
          WHERE phone_number_id = ?
        `, [
          response.data.verified_name,
          response.data.quality_rating,
          response.data.name_status,
          response.data.code_verification_status,
          response.data.messaging_limit_tier,
          response.data.is_official_business_account || false,
          phoneNumberId
        ]);

        res.json({
          success: true,
          data: {
            phoneNumberId: response.data.id,
            displayPhoneNumber: response.data.display_phone_number,
            verifiedName: response.data.verified_name,
            qualityRating: response.data.quality_rating,
            nameStatus: response.data.name_status,
            codeVerificationStatus: response.data.code_verification_status,
            messagingLimitTier: response.data.messaging_limit_tier,
            status: response.data.status,
            throughput: response.data.throughput,
            isOfficialBusinessAccount: response.data.is_official_business_account
          }
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Get Phone Number Details Error:', error.response?.data || error);
      res.status(500).json({
        success: false,
        error: 'Failed to get phone number details',
        details: error.response?.data?.error?.message || error.message
      });
    }
  }

  /**
   * Handle Exchange Code - Main embedded signup flow
   * Called after user completes the Facebook login
   */
  static async handleExchangeCode(req, res) {
    try {
      const { code } = req.body;
      const userId = req.user?.id || req.user?.userId;
      const organizationId = req.user?.organizationId || req.user?.organization_id || null;
      const config = getEmbeddedSignupConfig();

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      if (!code) {
        return res.status(400).json({
          success: false,
          error: 'Authorization code is required'
        });
      }

      console.log('Exchange code for user:', { userId, organizationId });

      // 1. Exchange code for access token
      const tokenResponse = await axios.get(`${META_GRAPH_URL}/oauth/access_token`, {
        params: {
          client_id: config.appId,
          client_secret: config.appSecret,
          code
        }
      });

      const accessToken = tokenResponse.data.access_token;

      // 2. Debug token to get WABA ID
      const debugResponse = await axios.get(`${META_GRAPH_URL}/debug_token`, {
        params: {
          input_token: accessToken,
          access_token: `${config.appId}|${config.appSecret}`
        }
      });

      const debugData = debugResponse.data.data;
      let wabaId = null;
      const appId = debugData.app_id;

      // Extract WABA ID from granular scopes
      if (debugData.granular_scopes) {
        for (const scope of debugData.granular_scopes) {
          if (scope.scope === 'whatsapp_business_management' && scope.target_ids?.[0]) {
            wabaId = scope.target_ids[0];
            break;
          }
        }
      }

      if (!wabaId) {
        return res.status(400).json({
          success: false,
          error: 'Could not find WABA ID in token. Please complete the signup again.'
        });
      }

      // 3. Get phone number ID from WABA
      const phoneResponse = await axios.get(`${META_GRAPH_URL}/${wabaId}/phone_numbers`, {
        params: {
          access_token: accessToken,
          fields: 'id,display_phone_number,verified_name,quality_rating,name_status,messaging_limit_tier'
        }
      });

      const phoneData = phoneResponse.data.data?.[0];
      if (!phoneData) {
        return res.status(400).json({
          success: false,
          error: 'No phone number found in WABA. Please add a phone number during signup.'
        });
      }

      // 4. Get phone number status
      const phoneStatusResponse = await axios.get(`${META_GRAPH_URL}/${phoneData.id}`, {
        params: {
          access_token: accessToken,
          fields: 'status,code_verification_status'
        }
      });

      // 5. Get account review status
      const accountResponse = await axios.get(`${META_GRAPH_URL}/${wabaId}`, {
        params: {
          access_token: accessToken,
          fields: 'account_review_status,business_verification_status,name,currency,timezone_id,message_template_namespace'
        }
      });

      // 6. Register phone number
      try {
        await axios.post(`${META_GRAPH_URL}/${phoneData.id}/register`, {
          messaging_product: 'whatsapp',
          pin: '123456'
        }, {
          params: { access_token: accessToken }
        });
      } catch (regError) {
        console.warn('Phone registration warning:', regError.response?.data?.error?.message);
      }

      // 7. Subscribe to WABA webhooks (non-blocking - webhook can be configured later)
      let webhookSubscribed = false;
      try {
        await axios.post(`${META_GRAPH_URL}/${wabaId}/subscribed_apps`, null, {
          params: { access_token: accessToken }
        });
        webhookSubscribed = true;
        console.log('WABA webhook subscription successful');
      } catch (webhookError) {
        console.warn('Webhook subscription skipped:', webhookError.response?.data?.error?.message || webhookError.message);
        // Continue - webhook can be configured manually later
      }

      // 8. Override webhook callback URL (only if subscription succeeded)
      if (webhookSubscribed && process.env.WEBHOOK_BASE_URL) {
        try {
          const webhookUrl = `${process.env.WEBHOOK_BASE_URL}/webhook/whatsapp/${organizationId}`;
          const webhookToken = `org_${organizationId}`;

          await axios.post(`${META_GRAPH_URL}/${wabaId}/subscribed_apps`, {
            override_callback_uri: webhookUrl,
            verify_token: webhookToken
          }, {
            params: { access_token: accessToken }
          });
          console.log('Webhook callback URL override successful');
        } catch (overrideError) {
          console.warn('Webhook override skipped:', overrideError.response?.data?.error?.message || overrideError.message);
        }
      }

      // 9. Get business profile
      let businessProfile = {};
      try {
        const profileResponse = await axios.get(`${META_GRAPH_URL}/${phoneData.id}/whatsapp_business_profile`, {
          params: {
            access_token: accessToken,
            fields: 'about,address,description,email,profile_picture_url,websites,vertical'
          }
        });
        businessProfile = profileResponse.data.data?.[0] || {};
      } catch (profileError) {
        console.warn('Failed to get business profile:', profileError.message);
      }

      // 10. Save to database
      const webhookUrl = process.env.WEBHOOK_BASE_URL ? `${process.env.WEBHOOK_BASE_URL}/webhook/whatsapp/${organizationId}` : null;
      const webhookToken = `org_${organizationId}`;
      
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        // Insert/Update WABA account - use null for undefined values
        await connection.execute(`
          INSERT INTO waba_accounts (
            user_id, organization_id, waba_id, business_name, currency,
            timezone_id, template_namespace, review_status, business_verification_status,
            access_token, webhook_subscribed, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', NOW(), NOW())
          ON DUPLICATE KEY UPDATE
            business_name = VALUES(business_name),
            access_token = VALUES(access_token),
            review_status = VALUES(review_status),
            business_verification_status = VALUES(business_verification_status),
            webhook_subscribed = VALUES(webhook_subscribed),
            updated_at = NOW()
        `, [
          userId,
          organizationId || null,
          wabaId,
          accountResponse.data.name || null,
          accountResponse.data.currency || null,
          accountResponse.data.timezone_id || null,
          accountResponse.data.message_template_namespace || null,
          accountResponse.data.account_review_status || null,
          accountResponse.data.business_verification_status || null,
          accessToken,
          webhookSubscribed
        ]);

        // Insert/Update phone number - use null for undefined values
        await connection.execute(`
          INSERT INTO phone_numbers (
            waba_id, phone_number_id, display_phone_number, verified_name,
            quality_rating, messaging_limit_tier, name_status, code_verification_status,
            status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'CONNECTED', NOW(), NOW())
          ON DUPLICATE KEY UPDATE
            verified_name = VALUES(verified_name),
            quality_rating = VALUES(quality_rating),
            name_status = VALUES(name_status),
            code_verification_status = VALUES(code_verification_status),
            status = 'CONNECTED',
            updated_at = NOW()
        `, [
          wabaId,
          phoneData.id,
          phoneData.display_phone_number || null,
          phoneData.verified_name || null,
          phoneData.quality_rating || null,
          phoneData.messaging_limit_tier || null,
          phoneData.name_status || null,
          phoneStatusResponse.data?.code_verification_status || null
        ]);

        // Save webhook subscription only if URL exists
        if (webhookUrl) {
          await connection.execute(`
            INSERT INTO webhook_subscriptions (waba_id, webhook_url, verify_token, is_active)
            VALUES (?, ?, ?, TRUE)
            ON DUPLICATE KEY UPDATE
              webhook_url = VALUES(webhook_url),
              verify_token = VALUES(verify_token),
              is_active = TRUE,
              updated_at = NOW()
          `, [wabaId, webhookUrl, webhookToken]);
        }

        // Update user's default WABA only if not set
        await connection.execute(
          'UPDATE users SET meta_business_account_id = COALESCE(meta_business_account_id, ?) WHERE id = ?',
          [wabaId, userId]
        );

        await connection.commit();

        // Invalidate user cache
        await cache.delete(`user_id:${userId}`);

        res.json({
          success: true,
          message: 'WhatsApp Business Account connected successfully!',
          data: {
            wabaId,
            businessName: accountResponse.data.name,
            phoneNumberId: phoneData.id,
            displayPhoneNumber: phoneData.display_phone_number,
            verifiedName: phoneData.verified_name,
            qualityRating: phoneData.quality_rating,
            nameStatus: phoneData.name_status,
            messagingLimitTier: phoneData.messaging_limit_tier,
            codeVerificationStatus: phoneStatusResponse.data.code_verification_status,
            accountReviewStatus: accountResponse.data.account_review_status,
            businessVerificationStatus: accountResponse.data.business_verification_status,
            businessProfile: {
              about: businessProfile.about || null,
              address: businessProfile.address || null,
              description: businessProfile.description || null,
              email: businessProfile.email || null,
              profilePictureUrl: businessProfile.profile_picture_url || null,
              industry: businessProfile.vertical || null
            },
            webhookUrl,
            webhookToken
          }
        });
      } catch (dbError) {
        await connection.rollback();
        throw dbError;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Handle Exchange Code Error:', error.response?.data || error);
      res.status(500).json({
        success: false,
        error: 'Failed to complete WhatsApp setup',
        details: error.response?.data?.error?.message || error.message
      });
    }
  }

  /**
   * Refresh all WABA data from Meta
   */
  static async refreshWabaData(req, res) {
    try {
      const { wabaId } = req.params;
      const userId = req.user?.id || req.user?.userId;

      const connection = await pool.getConnection();
      try {
        const [rows] = await connection.execute(
          'SELECT access_token, organization_id FROM waba_accounts WHERE waba_id = ? AND user_id = ?',
          [wabaId, userId]
        );

        if (rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'WABA account not found'
          });
        }

        const { access_token: accessToken, organization_id: organizationId } = rows[0];

        // Get updated WABA info
        const wabaResponse = await axios.get(`${META_GRAPH_URL}/${wabaId}`, {
          params: {
            access_token: accessToken,
            fields: 'id,name,account_review_status,business_verification_status,currency,timezone_id,message_template_namespace'
          }
        });

        // Get phone numbers
        const phoneResponse = await axios.get(`${META_GRAPH_URL}/${wabaId}/phone_numbers`, {
          params: {
            access_token: accessToken,
            fields: 'id,display_phone_number,verified_name,quality_rating,name_status,messaging_limit_tier,status,code_verification_status'
          }
        });

        // Update WABA in database
        await connection.execute(`
          UPDATE waba_accounts 
          SET business_name = ?, review_status = ?, business_verification_status = ?,
              currency = ?, timezone_id = ?, template_namespace = ?, updated_at = NOW()
          WHERE waba_id = ?
        `, [
          wabaResponse.data.name,
          wabaResponse.data.account_review_status,
          wabaResponse.data.business_verification_status,
          wabaResponse.data.currency,
          wabaResponse.data.timezone_id,
          wabaResponse.data.message_template_namespace,
          wabaId
        ]);

        // Update phone numbers
        for (const phone of phoneResponse.data.data || []) {
          await connection.execute(`
            INSERT INTO phone_numbers (
              waba_id, phone_number_id, display_phone_number, verified_name,
              quality_rating, messaging_limit_tier, name_status, code_verification_status,
              status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ON DUPLICATE KEY UPDATE
              display_phone_number = VALUES(display_phone_number),
              verified_name = VALUES(verified_name),
              quality_rating = VALUES(quality_rating),
              messaging_limit_tier = VALUES(messaging_limit_tier),
              name_status = VALUES(name_status),
              code_verification_status = VALUES(code_verification_status),
              status = VALUES(status),
              updated_at = NOW()
          `, [
            wabaId,
            phone.id,
            phone.display_phone_number,
            phone.verified_name,
            phone.quality_rating,
            phone.messaging_limit_tier,
            phone.name_status,
            phone.code_verification_status,
            phone.status || 'CONNECTED'
          ]);
        }

        res.json({
          success: true,
          message: 'WABA data refreshed successfully',
          data: {
            waba: wabaResponse.data,
            phoneNumbers: phoneResponse.data.data
          }
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Refresh WABA Data Error:', error.response?.data || error);
      res.status(500).json({
        success: false,
        error: 'Failed to refresh WABA data',
        details: error.response?.data?.error?.message || error.message
      });
    }
  }
}

export default EmbeddedSignupController;
