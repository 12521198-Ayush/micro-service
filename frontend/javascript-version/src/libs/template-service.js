/**
 * Template Service API
 * Handles all message template related API calls
 * Base URL: http://localhost:3003
 */

const TEMPLATE_SERVICE_URL = process.env.NEXT_PUBLIC_TEMPLATE_SERVICE_URL || 'http://localhost:3003'

/**
 * Generic API request function for template service
 */
async function templateApiRequest(endpoint, token, options = {}) {
  const url = `${TEMPLATE_SERVICE_URL}${endpoint}`

  const config = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers
    },
    ...options
  }

  try {
    const response = await fetch(url, config)
    const data = await response.json()

    if (!response.ok) {
      throw {
        status: response.status,
        message: data.error || data.message || 'An error occurred',
        data
      }
    }

    return data
  } catch (error) {
    if (error.status) {
      throw error
    }

    throw {
      status: 500,
      message: error.message || 'Network error occurred',
      data: null
    }
  }
}

/**
 * Create a new message template
 * @param {string} token - JWT token
 * @param {object} data - Template data
 * @param {string} data.name - Template name
 * @param {string} data.category - Template category (MARKETING, UTILITY, AUTHENTICATION)
 * @param {string} data.language - Template language code
 * @param {array} data.components - Template components
 */
export async function createTemplate(token, data) {
  return templateApiRequest('/api/templates/create', token, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

/**
 * List templates with optional filters
 * @param {string} token - JWT token
 * @param {object} filters - Optional filters { status, name }
 */
export async function listTemplates(token, filters = {}) {
  return templateApiRequest('/api/templates/list', token, {
    method: 'POST',
    body: JSON.stringify(filters)
  })
}

/**
 * Update an existing template
 * @param {string} token - JWT token
 * @param {number} id - Template ID
 * @param {object} data - Template data to update
 */
export async function updateTemplate(token, id, data) {
  return templateApiRequest(`/api/templates/${id}`, token, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

/**
 * Sync templates from Meta API
 * @param {string} token - JWT token
 */
export async function syncTemplates(token) {
  return templateApiRequest('/api/templates/sync', token, {
    method: 'POST'
  })
}

/**
 * Get template by ID
 * @param {string} token - JWT token
 * @param {number} id - Template ID
 */
export async function getTemplateById(token, id) {
  return templateApiRequest(`/api/templates/${id}`, token, {
    method: 'GET'
  })
}
