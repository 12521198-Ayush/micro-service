/**
 * Automation Service API
 * Handles all automation flow related API calls
 * Base URL: http://localhost:3008
 */

const AUTOMATION_SERVICE_URL = process.env.NEXT_PUBLIC_AUTOMATION_SERVICE_URL || 'http://localhost:3008'

/**
 * Generic API request function for automation service
 */
async function automationApiRequest(endpoint, token, options = {}) {
  const url = `${AUTOMATION_SERVICE_URL}${endpoint}`

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
 * Get all flows with pagination and search
 */
export async function getFlows(token, params = {}) {
  const queryParams = new URLSearchParams()

  if (params.search) queryParams.append('search', params.search)
  if (params.page) queryParams.append('page', params.page)
  if (params.limit) queryParams.append('limit', params.limit)

  const queryString = queryParams.toString()
  const endpoint = queryString ? `/api/flows?${queryString}` : '/api/flows'

  return automationApiRequest(endpoint, token, { method: 'GET' })
}

/**
 * Get a single flow by UUID
 */
export async function getFlow(token, uuid) {
  return automationApiRequest(`/api/flows/${uuid}`, token, { method: 'GET' })
}

/**
 * Create a new flow
 */
export async function createFlow(token, data) {
  return automationApiRequest('/api/flows', token, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

/**
 * Update a flow (save/publish/unpublish)
 */
export async function updateFlow(token, uuid, data) {
  return automationApiRequest(`/api/flows/${uuid}`, token, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

/**
 * Duplicate a flow
 */
export async function duplicateFlow(token, uuid) {
  return automationApiRequest(`/api/flows/duplicate/${uuid}`, token, { method: 'GET' })
}

/**
 * Delete a flow
 */
export async function deleteFlow(token, uuid) {
  return automationApiRequest(`/api/flows/${uuid}`, token, { method: 'DELETE' })
}

/**
 * Upload media for a flow step
 */
export async function uploadFlowMedia(token, uuid, stepId, file) {
  const url = `${AUTOMATION_SERVICE_URL}/api/flows/upload-media/${uuid}/${stepId}`
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  })

  const data = await response.json()

  if (!response.ok) {
    throw {
      status: response.status,
      message: data.error || 'Upload failed',
      data
    }
  }

  return data
}
