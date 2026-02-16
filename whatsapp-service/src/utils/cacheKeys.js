const cacheKeys = {
  message: (messageId) => `message:${messageId}`,
  userMessages: (userId, page = 1, limit = 10) => `messages:${userId}:p${page}:l${limit}`,
  conversationMessages: (conversationId) => `conversation:${conversationId}:messages`,
  messageStatus: (messageId) => `message:${messageId}:status`,

  patterns: {
    userMessages: (userId) => `messages:${userId}:*`,
    conversation: (conversationId) => `conversation:${conversationId}:*`,
  }
};

export default cacheKeys;
