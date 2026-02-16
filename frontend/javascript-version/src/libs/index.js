/**
 * API Services Index
 * Central export point for all microservice APIs
 */

// Base API utilities
export { apiRequest, apiRequestWithAuth, API_BASE_URL } from './api'

// Authentication & User Service
export {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  deleteAccount,
  updateMetaBusinessAccount
} from './auth-service'

// User Service (Organization & Wallet)
export {
  saveOrganizationDetails,
  getOrganizationDetails,
  addWalletBalance,
  deductWalletBalance,
  getWalletBalance,
  getWalletTransactions,
  updateWalletPricing
} from './user-service'

// Contact Service
export {
  createContact,
  getContacts,
  getContactById,
  updateContact,
  deleteContact,
  toggleContactFavorite,
  assignContactsToGroup,
  removeContactsFromGroup,
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  deleteGroup
} from './contact-service'

// Template Service
export {
  createTemplate,
  listTemplates,
  updateTemplate,
  syncTemplates,
  getTemplateById
} from './template-service'

// Campaign Service
export {
  createCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  getCampaignStats
} from './campaign-service'

// Team Service
export {
  createDepartment,
  updateDepartment,
  getDepartments,
  deleteDepartment,
  createAgent,
  updateAgent,
  deleteAgent,
  assignAgentToDepartment,
  getAgents,
  getAgentsByDepartment
} from './team-service'

// WhatsApp Service
export {
  sendMessage,
  sendTextMessage,
  sendTemplateMessage,
  getMessages,
  getMessageById,
  getConversation
} from './whatsapp-service'
