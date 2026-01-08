/**
 * Contact Service API
 * Handles all contact and group related API calls
 * Base URL: http://localhost:3001
 */

const CONTACT_SERVICE_URL = process.env.NEXT_PUBLIC_CONTACT_SERVICE_URL || 'http://localhost:3001'

/**
 * Generic API request function for contact service
 */
async function contactApiRequest(endpoint, token, options = {}) {
  const url = `${CONTACT_SERVICE_URL}${endpoint}`

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

// ==================== CONTACTS API ====================

/**
 * Create a new contact
 * @param {string} token - JWT token
 * @param {object} data - { firstName, lastName, email, phone, countryCode, company }
 */
export async function createContact(token, data) {
  return contactApiRequest('/api/contacts', token, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

/**
 * Get all contacts with pagination and search
 * @param {string} token - JWT token
 * @param {object} params - { page, limit, search, favorite, groupId }
 */
export async function getContacts(token, params = {}) {
  const queryParams = new URLSearchParams()
  
  if (params.page) queryParams.append('page', params.page)
  if (params.limit) queryParams.append('limit', params.limit)
  if (params.search) queryParams.append('search', params.search)
  if (params.favorite !== undefined) queryParams.append('favorite', params.favorite)
  if (params.groupId) queryParams.append('groupId', params.groupId)

  const queryString = queryParams.toString()
  const endpoint = `/api/contacts${queryString ? `?${queryString}` : ''}`

  return contactApiRequest(endpoint, token, {
    method: 'GET'
  })
}

/**
 * Get a single contact by ID
 * @param {string} token - JWT token
 * @param {number} id - Contact ID
 */
export async function getContactById(token, id) {
  return contactApiRequest(`/api/contacts/${id}`, token, {
    method: 'GET'
  })
}

/**
 * Update a contact
 * @param {string} token - JWT token
 * @param {number} id - Contact ID
 * @param {object} data - Contact data to update
 */
export async function updateContact(token, id, data) {
  return contactApiRequest(`/api/contacts/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

/**
 * Delete a contact
 * @param {string} token - JWT token
 * @param {number} id - Contact ID
 */
export async function deleteContact(token, id) {
  return contactApiRequest(`/api/contacts/${id}`, token, {
    method: 'DELETE'
  })
}

/**
 * Toggle contact favorite status
 * @param {string} token - JWT token
 * @param {number} id - Contact ID
 */
export async function toggleContactFavorite(token, id) {
  return contactApiRequest(`/api/contacts/${id}/favorite`, token, {
    method: 'PATCH'
  })
}

/**
 * Assign contacts to a group
 * @param {string} token - JWT token
 * @param {object} data - { contactIds, groupId }
 */
export async function assignContactsToGroup(token, data) {
  return contactApiRequest('/api/contacts/assign-to-group', token, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

/**
 * Remove contacts from a group
 * @param {string} token - JWT token
 * @param {object} data - { contactIds, groupId }
 */
export async function removeContactsFromGroup(token, data) {
  return contactApiRequest('/api/contacts/remove-from-group', token, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

// ==================== GROUPS API ====================

/**
 * Create a new group
 * @param {string} token - JWT token
 * @param {object} data - { name, description }
 */
export async function createGroup(token, data) {
  return contactApiRequest('/api/groups', token, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

/**
 * Get all groups for the user
 * @param {string} token - JWT token
 */
export async function getGroups(token) {
  return contactApiRequest('/api/groups', token, {
    method: 'GET'
  })
}

/**
 * Get a single group by ID
 * @param {string} token - JWT token
 * @param {number} id - Group ID
 */
export async function getGroupById(token, id) {
  return contactApiRequest(`/api/groups/${id}`, token, {
    method: 'GET'
  })
}

/**
 * Update a group
 * @param {string} token - JWT token
 * @param {number} id - Group ID
 * @param {object} data - Group data to update
 */
export async function updateGroup(token, id, data) {
  return contactApiRequest(`/api/groups/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

/**
 * Delete a group
 * @param {string} token - JWT token
 * @param {number} id - Group ID
 */
export async function deleteGroup(token, id) {
  return contactApiRequest(`/api/groups/${id}`, token, {
    method: 'DELETE'
  })
}
