export const removeUndefinedDeep = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => removeUndefinedDeep(item))
      .filter((item) => item !== undefined);
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((accumulator, [key, nestedValue]) => {
      const cleaned = removeUndefinedDeep(nestedValue);
      if (cleaned !== undefined) {
        accumulator[key] = cleaned;
      }

      return accumulator;
    }, {});
  }

  if (value === undefined) {
    return undefined;
  }

  return value;
};

export const safeJsonParse = (value, fallback = null) => {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};
