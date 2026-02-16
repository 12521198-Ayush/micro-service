<<<<<<< Updated upstream
/**
 * Campaign Service API
 * Handles all campaign related API calls
 * Base URL: http://localhost:3004
 */

const CAMPAIGN_SERVICE_URL = process.env.NEXT_PUBLIC_CAMPAIGN_SERVICE_URL || 'http://localhost:3004'

/**
 * Generic API request function for campaign service
 */
async function campaignApiRequest(endpoint, token, options = {}) {
  const url = `${CAMPAIGN_SERVICE_URL}${endpoint}`

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
 * Create a new campaign
 * @param {string} token - JWT token
 * @param {object} data - Campaign data
 * @param {string} data.name - Campaign name
 * @param {string} data.description - Campaign description
 * @param {string} data.templateId - Template ID to use
 * @param {number} data.groupId - Group ID for recipients
 * @param {string} data.scheduledAt - ISO date string for scheduling
 * @param {string} data.status - Campaign status (draft, scheduled, etc.)
 */
export async function createCampaign(token, data) {
  return campaignApiRequest('/api/campaigns', token, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

/**
 * Get all campaigns with pagination and filtering
 * @param {string} token - JWT token
 * @param {object} params - Query parameters { status, page, limit }
 */
export async function getCampaigns(token, params = {}) {
  const queryParams = new URLSearchParams()
  
  if (params.status) queryParams.append('status', params.status)
  if (params.page) queryParams.append('page', params.page)
  if (params.limit) queryParams.append('limit', params.limit)

  const queryString = queryParams.toString()
  const endpoint = `/api/campaigns${queryString ? `?${queryString}` : ''}`

  return campaignApiRequest(endpoint, token, {
    method: 'GET'
  })
}

/**
 * Get a single campaign by ID
 * @param {string} token - JWT token
 * @param {number} id - Campaign ID
 */
export async function getCampaignById(token, id) {
  return campaignApiRequest(`/api/campaigns/${id}`, token, {
    method: 'GET'
  })
}

/**
 * Update a campaign
 * @param {string} token - JWT token
 * @param {number} id - Campaign ID
 * @param {object} data - Campaign data to update
 */
export async function updateCampaign(token, id, data) {
  return campaignApiRequest(`/api/campaigns/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

/**
 * Delete a campaign
 * @param {string} token - JWT token
 * @param {number} id - Campaign ID
 */
export async function deleteCampaign(token, id) {
  return campaignApiRequest(`/api/campaigns/${id}`, token, {
    method: 'DELETE'
  })
}

/**
 * Get campaign statistics/analytics
 * @param {string} token - JWT token
 * @param {number} id - Campaign ID
 */
export async function getCampaignStats(token, id) {
  return campaignApiRequest(`/api/campaigns/${id}/stats`, token, {
    method: 'GET'
  })
}

/**
 * Execute/start a campaign
 * @param {string} token - JWT token
 * @param {number} id - Campaign ID
 */
export async function executeCampaign(token, id) {
  return campaignApiRequest(`/api/campaigns/${id}/execute`, token, {
    method: 'POST'
  })
}

/**
 * Pause a running campaign
 * @param {string} token - JWT token
 * @param {number} id - Campaign ID
 */
export async function pauseCampaign(token, id) {
  return campaignApiRequest(`/api/campaigns/${id}/pause`, token, {
    method: 'POST'
  })
}

/**
 * Resume a paused campaign
 * @param {string} token - JWT token
 * @param {number} id - Campaign ID
 */
export async function resumeCampaign(token, id) {
  return campaignApiRequest(`/api/campaigns/${id}/resume`, token, {
    method: 'POST'
  })
}

/**
 * Cancel a campaign
 * @param {string} token - JWT token
 * @param {number} id - Campaign ID
 */
export async function cancelCampaign(token, id) {
  return campaignApiRequest(`/api/campaigns/${id}/cancel`, token, {
    method: 'POST'
  })
}

/**
 * Schedule a campaign
 * @param {string} token - JWT token
 * @param {number} id - Campaign ID
 * @param {string} scheduledAt - ISO date string
 */
export async function scheduleCampaign(token, id, scheduledAt) {
  return campaignApiRequest(`/api/campaigns/${id}/schedule`, token, {
    method: 'POST',
    body: JSON.stringify({ scheduledAt })
  })
}

/**
 * Get campaign message logs
 * @param {string} token - JWT token
 * @param {number} id - Campaign ID
 * @param {object} params - { status, page, limit }
 */
export async function getCampaignMessages(token, id, params = {}) {
  const queryParams = new URLSearchParams()
  
  if (params.status) queryParams.append('status', params.status)
  if (params.page) queryParams.append('page', params.page)
  if (params.limit) queryParams.append('limit', params.limit)

  const queryString = queryParams.toString()
  const endpoint = `/api/campaigns/${id}/messages${queryString ? `?${queryString}` : ''}`

  return campaignApiRequest(endpoint, token, {
    method: 'GET'
  })
}
=======
/**
 * Campaign Service API
 * Handles all campaign related API calls
 * Base URL: http://localhost:3004
 */

const CAMPAIGN_SERVICE_URL = process.env.NEXT_PUBLIC_CAMPAIGN_SERVICE_URL || 'http://localhost:3004'

/**
 * Generic API request function for campaign service
 */
async function campaignApiRequest(endpoint, token, options = {}) {
  const url = `${CAMPAIGN_SERVICE_URL}${endpoint}`

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
 * Create a new campaign
 * @param {string} token - JWT token
 * @param {object} data - Campaign data
 * @param {string} data.name - Campaign name
 * @param {string} data.description - Campaign description
 * @param {string} data.templateId - Template ID to use
 * @param {number} data.groupId - Group ID for recipients
 * @param {string} data.scheduledAt - ISO date string for scheduling
 * @param {string} data.status - Campaign status (draft, scheduled, etc.)
 */
export async function createCampaign(token, data) {
  return campaignApiRequest('/api/campaigns', token, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

/**
 * Get all campaigns with pagination and filtering
 * @param {string} token - JWT token
 * @param {object} params - Query parameters { status, page, limit }
 */
export async function getCampaigns(token, params = {}) {
  const queryParams = new URLSearchParams()
  
  if (params.status) queryParams.append('status', params.status)
  if (params.page) queryParams.append('page', params.page)
  if (params.limit) queryParams.append('limit', params.limit)

  const queryString = queryParams.toString()
  const endpoint = `/api/campaigns${queryString ? `?${queryString}` : ''}`

  return campaignApiRequest(endpoint, token, {
    method: 'GET'
  })
}

/**
 * Get a single campaign by ID
 * @param {string} token - JWT token
 * @param {number} id - Campaign ID
 */
export async function getCampaignById(token, id) {
  return campaignApiRequest(`/api/campaigns/${id}`, token, {
    method: 'GET'
  })
}

/**
 * Update a campaign
 * @param {string} token - JWT token
 * @param {number} id - Campaign ID
 * @param {object} data - Campaign data to update
 */
export async function updateCampaign(token, id, data) {
  return campaignApiRequest(`/api/campaigns/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

/**
 * Delete a campaign
 * @param {string} token - JWT token
 * @param {number} id - Campaign ID
 */
export async function deleteCampaign(token, id) {
  return campaignApiRequest(`/api/campaigns/${id}`, token, {
    method: 'DELETE'
  })
}

/**
 * Get campaign statistics
 * @param {string} token - JWT token
 * @param {number} id - Campaign ID
 */
export async function getCampaignStats(token, id) {
  return campaignApiRequest(`/api/campaigns/${id}/stats`, token, {
    method: 'GET'
  })
}
>>>>>>> Stashed changes
