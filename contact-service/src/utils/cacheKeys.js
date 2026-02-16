/**
 * Cache key generators for Contact Service
 */
const cacheKeys = {
  // Contact cache keys
  contact: (userId, contactId) => `contact:${userId}:${contactId}`,
  userContacts: (userId, page = 1, limit = 10, search = '', favorite = '', groupId = '') => 
    `contacts:${userId}:p${page}:l${limit}:s${search}:f${favorite}:g${groupId}`,
  
  // Group cache keys
  group: (userId, groupId) => `group:${userId}:${groupId}`,
  userGroups: (userId, page = 1, limit = 10) => `groups:${userId}:p${page}:l${limit}`,
  groupContacts: (userId, groupId, page = 1, limit = 10) => 
    `group:${userId}:${groupId}:contacts:p${page}:l${limit}`,

  // Pattern keys for bulk deletion
  patterns: {
    userContacts: (userId) => `contacts:${userId}:*`,
    userGroups: (userId) => `groups:${userId}:*`,
    contact: (userId, contactId) => `contact:${userId}:${contactId}`,
    group: (userId, groupId) => `group:${userId}:${groupId}*`,
  }
};

module.exports = cacheKeys;
