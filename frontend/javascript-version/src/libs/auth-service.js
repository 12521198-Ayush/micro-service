/**
 * Authentication Service
 * Handles all authentication-related API calls
 */

import { apiRequest, apiRequestWithAuth } from './api'

/**
 * Register a new user
 * @param {object} data - { email, password, name }
 * @returns {Promise<object>} - { message, token, user }
 */
export async function registerUser(data) {
  return apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

/**
 * Login user
 * @param {object} data - { email, password }
 * @returns {Promise<object>} - { message, token, user }
 */
export async function loginUser(data) {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

/**
 * Get user profile (requires auth)
 * @param {string} token - JWT token
 * @returns {Promise<object>} - { user, wallet, organization }
 */
export async function getProfile(token) {
  return apiRequestWithAuth('/api/auth/profile', token, {
    method: 'GET'
  })
}

/**
 * Update user profile (requires auth)
 * @param {string} token - JWT token
 * @param {object} data - { name, email }
 * @returns {Promise<object>} - { message, token, user }
 */
export async function updateProfile(token, data) {
  return apiRequestWithAuth('/api/auth/profile', token, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

/**
 * Change password (requires auth)
 * @param {string} token - JWT token
 * @param {object} data - { currentPassword, newPassword }
 * @returns {Promise<object>} - { message }
 */
export async function changePassword(token, data) {
  return apiRequestWithAuth('/api/auth/change-password', token, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

/**
 * Request password reset (forgot password)
 * @param {object} data - { email }
 * @returns {Promise<object>} - { message, resetToken, expiresAt }
 */
export async function forgotPassword(data) {
  return apiRequest('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

/**
 * Reset password with token
 * @param {object} data - { token, newPassword }
 * @returns {Promise<object>} - { message }
 */
export async function resetPassword(data) {
  return apiRequest('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

/**
 * Delete account (requires auth)
 * @param {string} token - JWT token
 * @param {object} data - { password }
 * @returns {Promise<object>} - { message }
 */
export async function deleteAccount(token, data) {
  return apiRequestWithAuth('/api/auth/account', token, {
    method: 'DELETE',
    body: JSON.stringify(data)
  })
}

/**
 * Update Meta Business Account ID (requires auth)
 * @param {string} token - JWT token
 * @param {object} data - { metaBusinessAccountId }
 * @returns {Promise<object>} - { message, token, user }
 */
export async function updateMetaBusinessAccount(token, data) {
  return apiRequestWithAuth('/api/auth/meta-business-account', token, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}
