/**
 * Cache key generators for Template Service
 */
const cacheKeys = {
  // Template cache keys
  template: (userId, templateUuid) => `template:${userId}:${templateUuid}`,
  userTemplates: (userId, status = '', name = '') => `templates:${userId}:s${status}:n${name}`,
  templateByName: (userId, name) => `template:${userId}:name:${name}`,

  // Pattern keys for bulk deletion
  patterns: {
    userTemplates: (userId) => `templates:${userId}:*`,
    template: (userId, templateUuid) => `template:${userId}:${templateUuid}`,
  }
};

export default cacheKeys;
