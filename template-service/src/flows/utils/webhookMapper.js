import { isPlainObject } from './flowHelpers.js';

const TOKEN_REGEX = /{{\s*([^}]+?)\s*}}/g;

const resolvePath = (source, path) => {
  const segments = path.split('.').filter(Boolean);
  let cursor = source;

  for (const segment of segments) {
    if (cursor === null || cursor === undefined) {
      return undefined;
    }

    cursor = cursor[segment];
  }

  return cursor;
};

const resolveToken = (token, context) => {
  if (!token) {
    return undefined;
  }

  return resolvePath(context, token);
};

const interpolateString = (value, context) => {
  if (typeof value !== 'string') {
    return value;
  }

  const tokenMatches = value.match(TOKEN_REGEX) || [];

  if (tokenMatches.length === 1 && tokenMatches[0].trim() === value.trim()) {
    const token = tokenMatches[0].replace('{{', '').replace('}}', '').trim();
    const resolved = resolveToken(token, context);
    return resolved === undefined ? null : resolved;
  }

  return value.replace(TOKEN_REGEX, (_, token) => {
    const resolved = resolveToken(String(token).trim(), context);

    if (resolved === undefined || resolved === null) {
      return '';
    }

    if (typeof resolved === 'object') {
      return JSON.stringify(resolved);
    }

    return String(resolved);
  });
};

export const applyWebhookMapping = (mappingTemplate, context) => {
  if (!mappingTemplate) {
    return context.answers;
  }

  if (Array.isArray(mappingTemplate)) {
    return mappingTemplate.map((item) => applyWebhookMapping(item, context));
  }

  if (isPlainObject(mappingTemplate)) {
    return Object.entries(mappingTemplate).reduce((accumulator, [key, value]) => {
      accumulator[key] = applyWebhookMapping(value, context);
      return accumulator;
    }, {});
  }

  return interpolateString(mappingTemplate, context);
};

export default {
  applyWebhookMapping,
};
