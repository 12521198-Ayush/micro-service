/**
 * Cache key generators for Campaign Service
 */
const cacheKeys = {
  // Campaign cache keys
  campaign: (userId, campaignId) => `campaign:${userId}:${campaignId}`,
  userCampaigns: (userId, status = '', page = 1, limit = 10) => 
    `campaigns:${userId}:s${status}:p${page}:l${limit}`,
  campaignStats: (campaignId) => `campaign:${campaignId}:stats`,

  // Pattern keys for bulk deletion
  patterns: {
    userCampaigns: (userId) => `campaigns:${userId}:*`,
    campaign: (userId, campaignId) => `campaign:${userId}:${campaignId}*`,
  }
};

export default cacheKeys;
