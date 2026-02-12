const cacheKeys = {
  templateList: (userId, serializedFilters) => `templates:${userId}:list:${serializedFilters}`,
  templateByUuid: (userId, uuid) => `templates:${userId}:uuid:${uuid}`,

  patterns: {
    userTemplates: (userId) => `templates:${userId}:*`,
  },
};

export default cacheKeys;
