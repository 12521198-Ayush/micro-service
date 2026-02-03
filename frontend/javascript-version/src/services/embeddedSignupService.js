import api from './api'

const embeddedSignupService = {
  /**
   * Initialize embedded signup session
   * @returns {Promise} Session data with FB SDK config
   */
  initializeSignup: async () => {
    const response = await api.post('/user-service/api/embedded-signup/initialize')
    return response.data
  },

  /**
   * Handle OAuth callback from Facebook
   * @param {Object} data - { code, sessionId }
   * @returns {Promise}
   */
  handleCallback: async (data) => {
    const response = await api.post('/user-service/api/embedded-signup/callback', data)
    return response.data
  },

  /**
   * Exchange authorization code and complete full signup (like nyife-dev)
   * @param {Object} data - { code }
   * @returns {Promise}
   */
  exchangeCode: async (data) => {
    const response = await api.post('/user-service/api/embedded-signup/exchange-code', data)
    return response.data
  },

  /**
   * Complete embedded signup with WABA and phone details
   * @param {Object} data - { sessionId, wabaId, phoneNumberId }
   * @returns {Promise}
   */
  completeSignup: async (data) => {
    const response = await api.post('/user-service/api/embedded-signup/complete', data)
    return response.data
  },

  /**
   * Get all connected WABA accounts
   * @returns {Promise}
   */
  getConnectedAccounts: async () => {
    const response = await api.get('/user-service/api/embedded-signup/accounts')
    return response.data
  },

  /**
   * Disconnect a WABA account
   * @param {string} wabaId
   * @returns {Promise}
   */
  disconnectAccount: async (wabaId) => {
    const response = await api.delete(`/user-service/api/embedded-signup/accounts/${wabaId}`)
    return response.data
  },

  /**
   * Refresh access token for a WABA account
   * @param {string} wabaId
   * @returns {Promise}
   */
  refreshToken: async (wabaId) => {
    const response = await api.post(`/user-service/api/embedded-signup/accounts/${wabaId}/refresh-token`)
    return response.data
  },

  /**
   * Refresh all WABA data from Meta
   * @param {string} wabaId
   * @returns {Promise}
   */
  refreshWabaData: async (wabaId) => {
    const response = await api.post(`/user-service/api/embedded-signup/accounts/${wabaId}/refresh`)
    return response.data
  },

  /**
   * Get account review status
   * @param {string} wabaId
   * @returns {Promise}
   */
  getAccountReviewStatus: async (wabaId) => {
    const response = await api.get(`/user-service/api/embedded-signup/accounts/${wabaId}/review-status`)
    return response.data
  },

  /**
   * Override webhook callback URL
   * @param {string} wabaId
   * @param {Object} data - { callbackUrl, verifyToken }
   * @returns {Promise}
   */
  overrideWebhookCallback: async (wabaId, data) => {
    const response = await api.post(`/user-service/api/embedded-signup/accounts/${wabaId}/webhook`, data)
    return response.data
  },

  /**
   * Sync templates from Meta
   * @param {string} wabaId
   * @returns {Promise}
   */
  syncTemplates: async (wabaId) => {
    const response = await api.post(`/user-service/api/embedded-signup/accounts/${wabaId}/sync-templates`)
    return response.data
  },

  /**
   * Get phone number status and quality
   * @param {string} phoneNumberId
   * @returns {Promise}
   */
  getPhoneNumberStatus: async (phoneNumberId) => {
    const response = await api.get(`/user-service/api/embedded-signup/phone/${phoneNumberId}/status`)
    return response.data
  },

  /**
   * Get detailed phone number information
   * @param {string} phoneNumberId
   * @returns {Promise}
   */
  getPhoneNumberDetails: async (phoneNumberId) => {
    const response = await api.get(`/user-service/api/embedded-signup/phone/${phoneNumberId}/details`)
    return response.data
  },

  /**
   * Get business profile for phone number
   * @param {string} phoneNumberId
   * @returns {Promise}
   */
  getBusinessProfile: async (phoneNumberId) => {
    const response = await api.get(`/user-service/api/embedded-signup/phone/${phoneNumberId}/business-profile`)
    return response.data
  },

  /**
   * Update business profile for phone number
   * @param {string} phoneNumberId
   * @param {Object} data - { about, address, description, email, websites, industry, profilePictureUrl }
   * @returns {Promise}
   */
  updateBusinessProfile: async (phoneNumberId, data) => {
    const response = await api.post(`/user-service/api/embedded-signup/phone/${phoneNumberId}/business-profile`, data)
    return response.data
  },

  /**
   * Get business verification status
   * @param {string} wabaId
   * @returns {Promise}
   */
  getBusinessVerification: async (wabaId) => {
    const response = await api.get(`/user-service/api/embedded-signup/accounts/${wabaId}/verification`)
    return response.data
  }
}

export default embeddedSignupService
