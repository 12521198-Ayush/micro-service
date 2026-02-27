/**
 * Chat Service API
 * Handles all chat/inbox related API calls via the WhatsApp Service
 * Base URL: /whatsapp-service/api/chats
 */

const WHATSAPP_SERVICE_URL = process.env.NEXT_PUBLIC_WHATSAPP_SERVICE_URL || 'http://localhost:3006'

/**
 * Generic API request function for chat service
 */
async function chatApiRequest(endpoint, token, options = {}) {
  const url = `${WHATSAPP_SERVICE_URL}${endpoint}`

  const config = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers
    },
    ...options
  }

  // Remove content-type for FormData
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type']
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

// ==================== CHAT INBOX API ====================

/**
 * Get all chat conversations (inbox list)
 * @param {string} token - JWT token
 * @param {object} params - { page, limit, search, status, direction }
 */
export async function getChats(token, params = {}) {
  const queryParams = new URLSearchParams()

  if (params.page) queryParams.append('page', params.page)
  if (params.limit) queryParams.append('limit', params.limit)
  if (params.search) queryParams.append('search', params.search)
  if (params.status) queryParams.append('status', params.status)
  if (params.direction) queryParams.append('direction', params.direction)

  const queryString = queryParams.toString()
  const endpoint = `/api/chats${queryString ? `?${queryString}` : ''}`

  return chatApiRequest(endpoint, token, { method: 'GET' })
}

/**
 * Get chat detail for a phone number
 * @param {string} token - JWT token
 * @param {string} phoneNumber - Phone number
 */
export async function getChatDetail(token, phoneNumber) {
  return chatApiRequest(`/api/chats/${encodeURIComponent(phoneNumber)}`, token, {
    method: 'GET'
  })
}

/**
 * Get messages for a specific chat conversation
 * @param {string} token - JWT token
 * @param {string} phoneNumber - Phone number
 * @param {object} params - { page, limit, before }
 */
export async function getChatMessages(token, phoneNumber, params = {}) {
  const queryParams = new URLSearchParams()

  if (params.page) queryParams.append('page', params.page)
  if (params.limit) queryParams.append('limit', params.limit)
  if (params.before) queryParams.append('before', params.before)

  const queryString = queryParams.toString()
  const endpoint = `/api/chats/${encodeURIComponent(phoneNumber)}/messages${queryString ? `?${queryString}` : ''}`

  return chatApiRequest(endpoint, token, { method: 'GET' })
}

/**
 * Send a message in a chat conversation
 * @param {string} token - JWT token
 * @param {string} phoneNumber - Recipient phone number
 * @param {object} data - { type: 'text'|'template', text, templateName, language, components }
 */
export async function sendChatMessage(token, phoneNumber, data) {
  return chatApiRequest(`/api/chats/${encodeURIComponent(phoneNumber)}/send`, token, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

/**
 * Mark a chat as read
 * @param {string} token - JWT token
 * @param {string} phoneNumber - Phone number
 */
export async function markChatAsRead(token, phoneNumber) {
  return chatApiRequest(`/api/chats/${encodeURIComponent(phoneNumber)}/read`, token, {
    method: 'POST'
  })
}

/**
 * Close/archive a chat
 * @param {string} token - JWT token
 * @param {string} phoneNumber - Phone number
 */
export async function closeChat(token, phoneNumber) {
  return chatApiRequest(`/api/chats/${encodeURIComponent(phoneNumber)}/close`, token, {
    method: 'POST'
  })
}

/**
 * Get chat statistics
 * @param {string} token - JWT token
 */
export async function getChatStats(token) {
  return chatApiRequest('/api/chats/stats', token, { method: 'GET' })
}
