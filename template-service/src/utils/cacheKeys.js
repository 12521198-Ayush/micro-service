const cacheKeys = {
  templateList: (tenantKey, serializedFilters) =>
    `templates:${tenantKey}:list:${serializedFilters}`,
  templateByUuid: (tenantKey, uuid) => `templates:${tenantKey}:uuid:${uuid}`,

  patterns: {
    tenantTemplates: (tenantKey) => `templates:${tenantKey}:*`,
  },
};

export default cacheKeys;
