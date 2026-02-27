/**
 * Template Service API Client
 * Fully integrated with the latest template-service REST API
 * Base URL: configured via NEXT_PUBLIC_TEMPLATE_SERVICE_URL
 */

const TEMPLATE_SERVICE_URL = process.env.NEXT_PUBLIC_TEMPLATE_SERVICE_URL || 'http://localhost:3003'

// ─── Tenant Context Helpers ──────────────────────────────────────────────────

const buildTenantHeaders = (context = {}) => {
  const headers = {}

  if (context.metaBusinessAccountId) {
    headers['x-meta-business-account-id'] = String(context.metaBusinessAccountId)
  }

  if (context.metaPhoneNumberId) {
    headers['x-meta-phone-number-id'] = String(context.metaPhoneNumberId)
  }

  if (context.metaAppId) {
    headers['x-meta-app-id'] = String(context.metaAppId)
  }

  if (context.organizationId) {
    headers['x-organization-id'] = String(context.organizationId)
  }

  return headers
}

// ─── Generic Request Helper ──────────────────────────────────────────────────

async function templateApiRequest(endpoint, token, options = {}) {
  const url = `${TEMPLATE_SERVICE_URL}${endpoint}`

  const headers = {
    Authorization: `Bearer ${token}`,
    ...options.headers
  }

  // Don't set Content-Type for FormData (browser sets boundary automatically)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const config = { ...options, headers }

  try {
    const response = await fetch(url, config)

    if (response.status === 204) {
      return { success: true }
    }

    const data = await response.json()

    if (!response.ok) {
      const errorMessage =
        data?.error?.message || data?.message || data?.error || 'An error occurred'

      throw {
        status: response.status,
        code: data?.error?.code || 'UNKNOWN_ERROR',
        message: errorMessage,
        details: data?.error?.details || null,
        data
      }
    }

    return data
  } catch (error) {
    if (error.status) {
      throw error
    }

    throw {
      status: 0,
      code: 'NETWORK_ERROR',
      message: error.message || 'Network error occurred',
      data: null
    }
  }
}

// ─── Template CRUD ───────────────────────────────────────────────────────────

/**
 * Create a new WhatsApp message template
 * POST /api/templates
 */
export async function createTemplate(token, payload, context = {}) {
  return templateApiRequest('/api/templates', token, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: buildTenantHeaders(context)
  })
}

/**
 * List templates with filters and pagination
 * GET /api/templates?status=&category=&search=&limit=&offset=
 */
export async function listTemplates(token, filters = {}, context = {}) {
  const params = new URLSearchParams()

  if (filters.status) params.append('status', filters.status)
  if (filters.category) params.append('category', filters.category)
  if (filters.search) params.append('search', filters.search)
  if (filters.language) params.append('language', filters.language)
  if (filters.type) params.append('type', filters.type)
  if (filters.limit) params.append('limit', String(filters.limit))
  if (filters.offset !== undefined && filters.offset !== null) {
    params.append('offset', String(filters.offset))
  }

  const qs = params.toString()
  const endpoint = `/api/templates${qs ? `?${qs}` : ''}`

  return templateApiRequest(endpoint, token, {
    method: 'GET',
    headers: buildTenantHeaders(context)
  })
}

/**
 * Get a template by UUID
 * GET /api/templates/:uuid
 */
export async function getTemplateByUuid(token, uuid, context = {}) {
  return templateApiRequest(`/api/templates/${encodeURIComponent(uuid)}`, token, {
    method: 'GET',
    headers: buildTenantHeaders(context)
  })
}

/**
 * Update an existing template
 * PUT /api/templates/:uuid
 */
export async function updateTemplate(token, uuid, payload, context = {}) {
  return templateApiRequest(`/api/templates/${encodeURIComponent(uuid)}`, token, {
    method: 'PUT',
    body: JSON.stringify(payload),
    headers: buildTenantHeaders(context)
  })
}

/**
 * Delete a template by UUID
 * DELETE /api/templates/:uuid
 */
export async function deleteTemplate(token, uuid, context = {}) {
  return templateApiRequest(`/api/templates/${encodeURIComponent(uuid)}`, token, {
    method: 'DELETE',
    headers: buildTenantHeaders(context)
  })
}

// ─── Sync & Publish ──────────────────────────────────────────────────────────

/**
 * Sync all templates from Meta Cloud API
 * POST /api/templates/sync
 */
export async function syncTemplates(token, context = {}) {
  return templateApiRequest('/api/templates/sync', token, {
    method: 'POST',
    headers: buildTenantHeaders(context)
  })
}

/**
 * Publish / refresh a single template status from Meta
 * POST /api/templates/:uuid/publish
 */
export async function publishTemplate(token, uuid, context = {}) {
  return templateApiRequest(`/api/templates/${encodeURIComponent(uuid)}/publish`, token, {
    method: 'POST',
    headers: buildTenantHeaders(context)
  })
}

// ─── Validation & Capabilities ───────────────────────────────────────────────

/**
 * Validate a template payload without creating it
 * POST /api/templates/validate
 */
export async function validateTemplate(token, payload, forUpdate = false, context = {}) {
  const endpoint = `/api/templates/validate${forUpdate ? '?forUpdate=true' : ''}`

  return templateApiRequest(endpoint, token, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: buildTenantHeaders(context)
  })
}

/**
 * Get template service capabilities
 * GET /api/templates/capabilities
 */
export async function getTemplateCapabilities(token, context = {}) {
  return templateApiRequest('/api/templates/capabilities', token, {
    method: 'GET',
    headers: buildTenantHeaders(context)
  })
}

// ─── Media Upload ────────────────────────────────────────────────────────────

/**
 * Upload media for a template header (image/video/document)
 * POST /api/templates/media/upload (multipart/form-data)
 */
export async function uploadTemplateMedia(token, file, fileType, context = {}) {
  const formData = new FormData()
  formData.append('file', file)

  if (fileType) {
    formData.append('fileType', fileType)
  }

  return templateApiRequest('/api/templates/media/upload', token, {
    method: 'POST',
    body: formData,
    headers: buildTenantHeaders(context)
  })
}

// ─── Default Export ──────────────────────────────────────────────────────────

const templateService = {
  createTemplate,
  listTemplates,
  getTemplateByUuid,
  updateTemplate,
  deleteTemplate,
  syncTemplates,
  publishTemplate,
  validateTemplate,
  getTemplateCapabilities,
  uploadTemplateMedia
}

export default templateService
