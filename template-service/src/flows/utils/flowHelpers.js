export const slugify = (value = '') => {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 128);
};

export const normalizeKey = (value = '') => {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 128);
};

export const toNullableString = (value, maxLength = null) => {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  if (normalized.length === 0) {
    return null;
  }

  if (maxLength && normalized.length > maxLength) {
    return normalized.slice(0, maxLength);
  }

  return normalized;
};

export const parseListParams = ({ limit, offset }) => {
  const parsedLimit = Number.parseInt(limit, 10);
  const parsedOffset = Number.parseInt(offset, 10);

  return {
    limit: Number.isFinite(parsedLimit) ? parsedLimit : null,
    offset: Number.isFinite(parsedOffset) ? parsedOffset : null,
  };
};

export const isPlainObject = (value) => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

export const unique = (list = []) => Array.from(new Set(list));

export const mapBy = (list = [], getKey) => {
  return list.reduce((accumulator, item) => {
    accumulator[getKey(item)] = item;
    return accumulator;
  }, {});
};
