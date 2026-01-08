/**
 * User Service
 * Handles organization and wallet-related API calls
 */

import { apiRequestWithAuth } from './api'

// ============================================================================
// Organization APIs
// ============================================================================

/**
 * Create or update organization details (requires auth)
 * @param {string} token - JWT token
 * @param {object} data - { organizationName, physicalAddress, city, state, zipCode, country }
 * @returns {Promise<object>} - { message, organizationDetails }
 */
export async function saveOrganizationDetails(token, data) {
  return apiRequestWithAuth('/api/organization/details', token, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

/**
 * Get organization details (requires auth)
 * @param {string} token - JWT token
 * @returns {Promise<object>} - { organizationDetails }
 */
export async function getOrganizationDetails(token) {
  return apiRequestWithAuth('/api/organization/details', token, {
    method: 'GET'
  })
}

// ============================================================================
// Wallet APIs
// ============================================================================

/**
 * Add balance to wallet (requires auth)
 * @param {string} token - JWT token
 * @param {object} data - { amount, description }
 * @returns {Promise<object>} - { message, transaction, currentBalance }
 */
export async function addWalletBalance(token, data) {
  return apiRequestWithAuth('/api/wallet/add', token, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

/**
 * Deduct balance from wallet (requires auth)
 * @param {string} token - JWT token
 * @param {object} data - { amount, description }
 * @returns {Promise<object>} - { message, transaction, currentBalance }
 */
export async function deductWalletBalance(token, data) {
  return apiRequestWithAuth('/api/wallet/deduct', token, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

/**
 * Get wallet balance (requires auth)
 * @param {string} token - JWT token
 * @returns {Promise<object>} - { balance, pricing }
 */
export async function getWalletBalance(token) {
  return apiRequestWithAuth('/api/wallet/balance', token, {
    method: 'GET'
  })
}

/**
 * Get wallet transaction history (requires auth)
 * @param {string} token - JWT token
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (default: 50)
 * @returns {Promise<object>} - { transactions, pagination }
 */
export async function getWalletTransactions(token, page = 1, limit = 50) {
  return apiRequestWithAuth(`/api/wallet/transactions?page=${page}&limit=${limit}`, token, {
    method: 'GET'
  })
}

/**
 * Update message pricing (requires auth)
 * @param {string} token - JWT token
 * @param {object} data - { marketingMessagePrice, utilityMessagePrice, authMessagePrice }
 * @returns {Promise<object>} - { message, pricing }
 */
export async function updateMessagePricing(token, data) {
  return apiRequestWithAuth('/api/wallet/pricing', token, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}
