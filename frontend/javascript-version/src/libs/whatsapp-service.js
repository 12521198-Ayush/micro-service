/**
 * WhatsApp Service API
 * Handles all WhatsApp messaging related API calls
 * Base URL: http://localhost:3006
 */

const WHATSAPP_SERVICE_URL = process.env.NEXT_PUBLIC_WHATSAPP_SERVICE_URL || 'http://localhost:3006'

/**
 * Generic API request function for WhatsApp service
 */
async function whatsappApiRequest(endpoint, token, options = {}) {
  const url = `${WHATSAPP_SERVICE_URL}${endpoint}`

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
 * Send a WhatsApp message (text or template)
 * @param {string} token - JWT token
 * @param {object} data - Message data
 * @param {string} data.to - Recipient phone number
 * @param {string} data.type - Message type ('text' or 'template')
 * @param {string} data.text - Text message (if type is 'text')
 * @param {string} data.templateName - Template name (if type is 'template')
 * @param {string} data.templateLanguage - Template language (if type is 'template')
 * @param {array} data.components - Template components (if type is 'template')
 */
export async function sendMessage(token, data) {
  return whatsappApiRequest('/api/messages/send', token, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

/**
 * Send a text message
 * @param {string} token - JWT token
 * @param {string} to - Recipient phone number
 * @param {string} text - Message text
 */
export async function sendTextMessage(token, to, text) {
  return sendMessage(token, {
    to,
    type: 'text',
    text
  })
}

/**
 * Send a template message
 * @param {string} token - JWT token
 * @param {string} to - Recipient phone number
 * @param {string} templateName - Template name
 * @param {string} templateLanguage - Template language code
 * @param {array} components - Template components with parameters
 */
export async function sendTemplateMessage(token, to, templateName, templateLanguage, components = []) {
  return sendMessage(token, {
    to,
    type: 'template',
    templateName,
    templateLanguage,
    components
  })
}

/**
 * Get message history with pagination
 * @param {string} token - JWT token
 * @param {object} params - Query parameters { status, page, limit }
 */
export async function getMessages(token, params = {}) {
  const queryParams = new URLSearchParams()
  
  if (params.status) queryParams.append('status', params.status)
  if (params.page) queryParams.append('page', params.page)
  if (params.limit) queryParams.append('limit', params.limit)

  const queryString = queryParams.toString()
  const endpoint = `/api/messages${queryString ? `?${queryString}` : ''}`

  return whatsappApiRequest(endpoint, token, {
    method: 'GET'
  })
}

/**
 * Get a single message by ID
 * @param {string} token - JWT token
 * @param {number} id - Message ID
 */
export async function getMessageById(token, id) {
  return whatsappApiRequest(`/api/messages/${id}`, token, {
    method: 'GET'
  })
}

/**
 * Get conversation with a specific contact
 * @param {string} token - JWT token
 * @param {string} phoneNumber - Contact phone number
 * @param {object} params - Query parameters { page, limit }
 */
export async function getConversation(token, phoneNumber, params = {}) {
  const queryParams = new URLSearchParams()
  
  if (params.page) queryParams.append('page', params.page)
  if (params.limit) queryParams.append('limit', params.limit)

  const queryString = queryParams.toString()
  const endpoint = `/api/messages/conversation/${phoneNumber}${queryString ? `?${queryString}` : ''}`

  return whatsappApiRequest(endpoint, token, {
    method: 'GET'
  })
}
