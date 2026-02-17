import axios from 'axios';
import env from './env.js';
import logger from './logger.js';
import AppError from '../errors/AppError.js';

const metaApiClient = axios.create({
  baseURL: `https://graph.facebook.com/${env.metaApiVersion}`,
  timeout: env.metaApiTimeoutMs,
  headers: {
    'Content-Type': 'application/json',
  },
});

if (env.metaAccessToken) {
  metaApiClient.defaults.headers.common.Authorization = `Bearer ${env.metaAccessToken}`;
}

const ensureMetaAuth = () => {
  if (!env.metaAccessToken) {
    throw new AppError(500, 'Meta API access token is not configured', {
      code: 'META_ACCESS_TOKEN_MISSING',
      expose: false,
    });
  }
};

const toMetaRequestError = (error, operation) => {
  if (error instanceof AppError) {
    return error;
  }

  if (!error.response) {
    return new AppError(502, `Meta API ${operation} failed`, {
      code: 'META_API_UNREACHABLE',
      details: { message: error.message },
    });
  }

  const statusCode = error.response.status;
  const data = error.response.data || {};
  const message =
    data.error?.error_user_msg ||
    data.error?.message ||
    `Meta API ${operation} failed`;

  return new AppError(statusCode, message, {
    code: 'META_API_ERROR',
    details: {
      operation,
      metaError: data.error || data,
    },
  });
};

export const DEFAULT_TEMPLATE_FIELDS = Object.freeze([
  'id',
  'name',
  'language',
  'category',
  'status',
  'quality_score',
  'rejected_reason',
  'components',
  'parameter_format',
]);

export const sanitizeTemplateFields = (value) => {
  const source =
    typeof value === 'string'
      ? value.split(',')
      : Array.isArray(value)
      ? value
      : [];

  const normalized = [
    ...new Set(
      source
        .map((field) => String(field || '').trim())
        .filter((field) => field.length > 0)
    ),
  ];

  if (normalized.length === 0) {
    return [...DEFAULT_TEMPLATE_FIELDS];
  }

  return normalized;
};

const toTemplateFieldsParam = (value) => {
  return sanitizeTemplateFields(value).join(',');
};

const isMetaUnknownFieldError = (error) => {
  const metaError = error?.response?.data?.error || {};
  const message = String(metaError.message || '');

  return (
    Number(metaError.code) === 100 &&
    /nonexisting field/i.test(message)
  );
};

const normalizeUploadSessionPath = (uploadSessionId) => {
  const raw = String(uploadSessionId || '').trim();

  if (!raw) {
    return '';
  }

  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      const normalizedApiVersion = `/${String(env.metaApiVersion || '')
        .trim()
        .replace(/^\/+|\/+$/g, '')}`;
      const fullPath = `${parsed.pathname}${parsed.search}`;

      if (
        normalizedApiVersion !== '/' &&
        fullPath.startsWith(`${normalizedApiVersion}/`)
      ) {
        return fullPath.slice(normalizedApiVersion.length);
      }

      return fullPath;
    } catch (error) {
      return raw.startsWith('/') ? raw : `/${raw}`;
    }
  }

  if (raw.startsWith('/')) {
    return raw;
  }

  if (raw.startsWith('upload:')) {
    return `/${raw}`;
  }

  return `/upload:${raw}`;
};

export const metaTemplateApi = {
  async createFlow(metaBusinessAccountId, payload = {}) {
    ensureMetaAuth();

    const accountId = String(metaBusinessAccountId || '').trim();
    if (!accountId) {
      throw new AppError(400, 'metaBusinessAccountId is required to create flow', {
        code: 'META_BUSINESS_ACCOUNT_ID_MISSING',
      });
    }

    const requestPayload = {
      name: payload.name,
      categories: Array.isArray(payload.categories) ? payload.categories : ['OTHER'],
      ...(payload.endpointUri ? { endpoint_uri: payload.endpointUri } : {}),
    };

    try {
      const { data } = await metaApiClient.post(`/${accountId}/flows`, requestPayload);
      return data;
    } catch (error) {
      throw toMetaRequestError(error, 'create flow');
    }
  },

  async publishFlow(metaFlowId) {
    ensureMetaAuth();

    const flowId = String(metaFlowId || '').trim();
    if (!flowId) {
      throw new AppError(400, 'metaFlowId is required to publish flow', {
        code: 'META_FLOW_ID_MISSING',
      });
    }

    try {
      const { data } = await metaApiClient.post(`/${flowId}/publish`, null);
      return data;
    } catch (error) {
      throw toMetaRequestError(error, 'publish flow');
    }
  },

  async getFlow(metaFlowId) {
    ensureMetaAuth();

    const flowId = String(metaFlowId || '').trim();
    if (!flowId) {
      throw new AppError(400, 'metaFlowId is required to fetch flow', {
        code: 'META_FLOW_ID_MISSING',
      });
    }

    try {
      const { data } = await metaApiClient.get(`/${flowId}`);
      return data;
    } catch (error) {
      throw toMetaRequestError(error, 'get flow');
    }
  },

  async updateFlowJson(metaFlowId, flowJson) {
    ensureMetaAuth();

    const flowId = String(metaFlowId || '').trim();
    if (!flowId) {
      throw new AppError(400, 'metaFlowId is required to upload flow json', {
        code: 'META_FLOW_ID_MISSING',
      });
    }

    if (!flowJson || typeof flowJson !== 'object') {
      throw new AppError(400, 'flowJson must be a valid object', {
        code: 'META_FLOW_JSON_INVALID',
      });
    }

    try {
      const formData = new FormData();
      const content = JSON.stringify(flowJson, null, 2);
      const fileBlob = new Blob([content], { type: 'application/json' });

      formData.append('file', fileBlob, 'flow.json');
      formData.append('name', 'flow.json');
      formData.append('asset_type', 'FLOW_JSON');

      const response = await fetch(
        `${metaApiClient.defaults.baseURL}/${encodeURIComponent(flowId)}/assets`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.metaAccessToken}`,
          },
          body: formData,
        }
      );

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw toMetaRequestError(
          {
            response: {
              status: response.status,
              data: responseData,
            },
          },
          'update flow json'
        );
      }

      return responseData;
    } catch (error) {
      throw toMetaRequestError(error, 'update flow json');
    }
  },

  async createTemplate(metaBusinessAccountId, payload) {
    ensureMetaAuth();

    try {
      const { data } = await metaApiClient.post(
        `/${metaBusinessAccountId}/message_templates`,
        payload
      );

      return data;
    } catch (error) {
      throw toMetaRequestError(error, 'create template');
    }
  },

  async updateTemplate(metaTemplateId, payload) {
    ensureMetaAuth();

    try {
      const { data } = await metaApiClient.post(`/${metaTemplateId}`, payload);
      return data;
    } catch (error) {
      throw toMetaRequestError(error, 'update template');
    }
  },

  async deleteTemplateByMetaId(metaTemplateId) {
    ensureMetaAuth();

    try {
      const { data } = await metaApiClient.delete(`/${metaTemplateId}`);
      return data;
    } catch (error) {
      throw toMetaRequestError(error, 'delete template by id');
    }
  },

  async deleteTemplateByName(metaBusinessAccountId, name) {
    ensureMetaAuth();

    try {
      const { data } = await metaApiClient.delete(
        `/${metaBusinessAccountId}/message_templates`,
        {
          params: { name },
        }
      );

      return data;
    } catch (error) {
      throw toMetaRequestError(error, 'delete template by name');
    }
  },

  async getTemplateByMetaId(metaTemplateId, fields = DEFAULT_TEMPLATE_FIELDS) {
    ensureMetaAuth();

    const requestedFields = toTemplateFieldsParam(fields);

    try {
      const { data } = await metaApiClient.get(`/${metaTemplateId}`, {
        params: { fields: requestedFields },
      });

      return data;
    } catch (error) {
      if (isMetaUnknownFieldError(error)) {
        try {
          const { data } = await metaApiClient.get(`/${metaTemplateId}`, {
            params: { fields: toTemplateFieldsParam(DEFAULT_TEMPLATE_FIELDS) },
          });

          return data;
        } catch (fallbackError) {
          throw toMetaRequestError(fallbackError, 'get template by id');
        }
      }

      throw toMetaRequestError(error, 'get template by id');
    }
  },

  async listTemplates(metaBusinessAccountId, options = {}) {
    ensureMetaAuth();

    const params = {
      limit: options.limit || 50,
      fields: toTemplateFieldsParam(options.fields || DEFAULT_TEMPLATE_FIELDS),
    };

    if (options.after) {
      params.after = options.after;
    }

    if (options.before) {
      params.before = options.before;
    }

    try {
      const { data } = await metaApiClient.get(
        `/${metaBusinessAccountId}/message_templates`,
        {
          params,
        }
      );

      return data;
    } catch (error) {
      if (isMetaUnknownFieldError(error)) {
        try {
          const { data } = await metaApiClient.get(
            `/${metaBusinessAccountId}/message_templates`,
            {
              params: {
                ...params,
                fields: toTemplateFieldsParam(DEFAULT_TEMPLATE_FIELDS),
              },
            }
          );

          return data;
        } catch (fallbackError) {
          throw toMetaRequestError(fallbackError, 'list templates');
        }
      }

      throw toMetaRequestError(error, 'list templates');
    }
  },

  async createUploadSession(metaAppId, payload) {
    ensureMetaAuth();

    const appId = String(metaAppId || '').trim();
    if (!appId) {
      throw new AppError(400, 'metaAppId is required to create upload session', {
        code: 'META_APP_ID_MISSING',
      });
    }

    const params = {
      file_name: payload.fileName,
      file_length: payload.fileLength,
      file_type: payload.fileType,
    };

    try {
      const { data } = await metaApiClient.post(
        `/${encodeURIComponent(appId)}/uploads`,
        null,
        {
          params,
        }
      );
      return data;
    } catch (error) {
      throw toMetaRequestError(error, 'create upload session');
    }
  },

  async uploadFileChunk(uploadSessionId, fileBuffer, fileOffset = 0) {
    ensureMetaAuth();

    const sessionId = String(uploadSessionId || '').trim();
    if (!sessionId) {
      throw new AppError(400, 'uploadSessionId is required to upload media', {
        code: 'META_UPLOAD_SESSION_ID_MISSING',
      });
    }

    const uploadPath = normalizeUploadSessionPath(sessionId);

    if (!uploadPath) {
      throw new AppError(400, 'uploadSessionId is invalid', {
        code: 'META_UPLOAD_SESSION_ID_INVALID',
      });
    }

    try {
      const { data } = await metaApiClient.post(
        uploadPath,
        fileBuffer,
        {
          headers: {
            'Content-Type': 'application/octet-stream',
            file_offset: String(fileOffset),
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        }
      );

      return data;
    } catch (error) {
      throw toMetaRequestError(error, 'upload file chunk');
    }
  },

};

export { normalizeUploadSessionPath };

export const logMetaSummary = (operation, payload = {}) => {
  logger.info(`Meta API ${operation} completed`, payload);
};

export default metaTemplateApi;
