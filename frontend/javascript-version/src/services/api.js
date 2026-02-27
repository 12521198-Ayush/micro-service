/**
 * Axios-based API Client
 * This provides a default export for axios-based API calls
 */

import axios from 'axios'
import { getSession, signOut } from 'next-auth/react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://backend.nyife.chat'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add request interceptor to include auth token
api.interceptors.request.use(
  async (config) => {
    // If Authorization header is already set (explicitly passed), skip
    if (config.headers.Authorization) {
      return config
    }

    if (typeof window !== 'undefined') {
      // First try to get token from NextAuth session
      try {
        const session = await getSession()

        if (session?.accessToken) {
          config.headers.Authorization = `Bearer ${session.accessToken}`

          return config
        }
      } catch (e) {
        // Fall through to localStorage
      }

      // Fallback to localStorage
      const token = localStorage.getItem('token')

      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }

    return config
  },
  (error) => {

    return Promise.reject(error)
  }
)

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {

    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
        signOut({ callbackUrl: '/login' })
      }
    }

    return Promise.reject(error)
  }
)

export default api
