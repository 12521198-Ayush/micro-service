import { cache } from '../config/redis.js';

/**
 * Middleware to attach WABA configuration to request
 * Fetches user's WhatsApp Business Account details
 */
export const attachWabaConfig = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user.userId;
    
    // Check cache first
    const cacheKey = `waba_config:${userId}`;
    let config = await cache.get(cacheKey);

    if (!config) {
      // For now, use environment variables
      // In production, this would fetch from user-service or database
      config = {
        wabaId: process.env.META_WABA_ID,
        phoneNumberId: process.env.META_PHONE_NUMBER_ID,
        accessToken: process.env.META_ACCESS_TOKEN
      };

      // If user has custom WABA settings, fetch them
      // This would typically involve calling user-service API
      if (userId) {
        try {
          // Placeholder for fetching user-specific WABA config
          // const userConfig = await fetchUserWabaConfig(userId);
          // if (userConfig) config = userConfig;
        } catch (error) {
          console.warn('Failed to fetch user WABA config, using defaults');
        }
      }

      // Cache for 1 hour
      await cache.set(cacheKey, config, 3600);
    }

    // Validate config
    if (!config.phoneNumberId || !config.accessToken) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp Business Account not configured. Please complete the embedded signup.'
      });
    }

    req.wabaConfig = config;
    next();
  } catch (error) {
    console.error('Error attaching WABA config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load WhatsApp configuration'
    });
  }
};

export default attachWabaConfig;
