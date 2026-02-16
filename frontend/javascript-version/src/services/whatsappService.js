import api from './api'

const whatsappService = {
  // ==================== TEXT MESSAGES ====================
  
  /**
   * Send a text message
   * @param {Object} data - { to, text, previewUrl }
   */
  sendText: async (data) => {
    const response = await api.post('/whatsapp-service/api/whatsapp/messages/text', data)
    return response.data
  },

  // ==================== TEMPLATE MESSAGES ====================
  
  /**
   * Send a template message
   * @param {Object} data - { to, templateName, language, components }
   */
  sendTemplate: async (data) => {
    const response = await api.post('/whatsapp-service/api/whatsapp/messages/template', data)
    return response.data
  },

  // ==================== MEDIA MESSAGES ====================
  
  /**
   * Send an image message
   * @param {Object} data - { to, imageUrl/imageId, caption }
   */
  sendImage: async (data) => {
    const response = await api.post('/whatsapp-service/api/whatsapp/messages/image', data)
    return response.data
  },

  /**
   * Send a video message
   * @param {Object} data - { to, videoUrl/videoId, caption }
   */
  sendVideo: async (data) => {
    const response = await api.post('/whatsapp-service/api/whatsapp/messages/video', data)
    return response.data
  },

  /**
   * Send an audio message
   * @param {Object} data - { to, audioUrl/audioId }
   */
  sendAudio: async (data) => {
    const response = await api.post('/whatsapp-service/api/whatsapp/messages/audio', data)
    return response.data
  },

  /**
   * Send a document message
   * @param {Object} data - { to, documentUrl/documentId, filename, caption }
   */
  sendDocument: async (data) => {
    const response = await api.post('/whatsapp-service/api/whatsapp/messages/document', data)
    return response.data
  },

  /**
   * Send a sticker message
   * @param {Object} data - { to, stickerUrl/stickerId }
   */
  sendSticker: async (data) => {
    const response = await api.post('/whatsapp-service/api/whatsapp/messages/sticker', data)
    return response.data
  },

  // ==================== LOCATION MESSAGES ====================
  
  /**
   * Send a location message
   * @param {Object} data - { to, latitude, longitude, name, address }
   */
  sendLocation: async (data) => {
    const response = await api.post('/whatsapp-service/api/whatsapp/messages/location', data)
    return response.data
  },

  // ==================== CONTACT MESSAGES ====================
  
  /**
   * Send a contact card message
   * @param {Object} data - { to, contacts }
   */
  sendContact: async (data) => {
    const response = await api.post('/whatsapp-service/api/whatsapp/messages/contact', data)
    return response.data
  },

  // ==================== INTERACTIVE MESSAGES ====================
  
  /**
   * Send interactive button message
   * @param {Object} data - { to, body, buttons, header, footer }
   */
  sendButtons: async (data) => {
    const response = await api.post('/whatsapp-service/api/whatsapp/messages/interactive/buttons', data)
    return response.data
  },

  /**
   * Send interactive list message
   * @param {Object} data - { to, body, buttonText, sections, header, footer }
   */
  sendList: async (data) => {
    const response = await api.post('/whatsapp-service/api/whatsapp/messages/interactive/list', data)
    return response.data
  },

  /**
   * Send CTA URL button message
   * @param {Object} data - { to, body, displayText, url, header, footer }
   */
  sendCtaUrl: async (data) => {
    const response = await api.post('/whatsapp-service/api/whatsapp/messages/interactive/cta-url', data)
    return response.data
  },

  /**
   * Send location request message
   * @param {Object} data - { to, body }
   */
  sendLocationRequest: async (data) => {
    const response = await api.post('/whatsapp-service/api/whatsapp/messages/interactive/location-request', data)
    return response.data
  },

  /**
   * Send WhatsApp Flow message
   * @param {Object} data - { to, body, flowId, flowToken, flowCta, flowAction, screenId, flowData, header, footer }
   */
  sendFlow: async (data) => {
    const response = await api.post('/whatsapp-service/api/whatsapp/messages/interactive/flow', data)
    return response.data
  },

  // ==================== REACTIONS ====================
  
  /**
   * Send a reaction to a message
   * @param {Object} data - { to, messageId, emoji }
   */
  sendReaction: async (data) => {
    const response = await api.post('/whatsapp-service/api/whatsapp/messages/reaction', data)
    return response.data
  },

  // ==================== MESSAGE STATUS ====================
  
  /**
   * Mark a message as read
   * @param {Object} data - { messageId }
   */
  markAsRead: async (data) => {
    const response = await api.post('/whatsapp-service/api/whatsapp/messages/mark-read', data)
    return response.data
  },

  // ==================== MESSAGE HISTORY ====================
  
  /**
   * Get message history
   * @param {Object} params - { status, page, limit }
   */
  getMessages: async (params = {}) => {
    const response = await api.get('/whatsapp-service/api/whatsapp/messages', { params })
    return response.data
  },

  /**
   * Get a single message by ID
   * @param {string} id
   */
  getMessageById: async (id) => {
    const response = await api.get(`/whatsapp-service/api/whatsapp/messages/${id}`)
    return response.data
  },

  // ==================== MEDIA ====================
  
  /**
   * Upload media file
   * @param {FormData} formData - Contains file and type
   */
  uploadMedia: async (formData) => {
    const response = await api.post('/whatsapp-service/api/whatsapp/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  /**
   * Get media URL
   * @param {string} mediaId
   */
  getMediaUrl: async (mediaId) => {
    const response = await api.get(`/whatsapp-service/api/whatsapp/media/${mediaId}`)
    return response.data
  },

  /**
   * Download media
   * @param {string} mediaId
   */
  downloadMedia: async (mediaId) => {
    const response = await api.get(`/whatsapp-service/api/whatsapp/media/${mediaId}/download`, {
      responseType: 'blob'
    })
    return response.data
  },

  /**
   * Delete media
   * @param {string} mediaId
   */
  deleteMedia: async (mediaId) => {
    const response = await api.delete(`/whatsapp-service/api/whatsapp/media/${mediaId}`)
    return response.data
  },

  // ==================== PHONE NUMBERS ====================
  
  /**
   * Get all phone numbers
   */
  getPhoneNumbers: async () => {
    const response = await api.get('/whatsapp-service/api/whatsapp/phone-numbers')
    return response.data
  },

  /**
   * Get phone number info
   * @param {string} phoneNumberId
   */
  getPhoneNumberInfo: async (phoneNumberId) => {
    const response = await api.get(`/whatsapp-service/api/whatsapp/phone-numbers/${phoneNumberId}`)
    return response.data
  },

  /**
   * Get business profile
   * @param {string} phoneNumberId
   */
  getBusinessProfile: async (phoneNumberId) => {
    const response = await api.get(`/whatsapp-service/api/whatsapp/phone-numbers/${phoneNumberId}/profile`)
    return response.data
  },

  /**
   * Update business profile
   * @param {string} phoneNumberId
   * @param {Object} data - { about, address, description, email, websites, vertical }
   */
  updateBusinessProfile: async (phoneNumberId, data) => {
    const response = await api.put(`/whatsapp-service/api/whatsapp/phone-numbers/${phoneNumberId}/profile`, data)
    return response.data
  },

  // ==================== WEBHOOK ====================
  
  /**
   * Get webhook status
   */
  getWebhookStatus: async () => {
    const response = await api.get('/whatsapp-service/api/whatsapp/webhook/status')
    return response.data
  }
}

export default whatsappService
