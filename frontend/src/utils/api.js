/**
 * API utility functions
 */

import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const API_TOKEN = import.meta.env.VITE_API_TOKEN || 'veriquickx-secret-token-change-in-production'

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${API_TOKEN}`
  }
})

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    // Ensure token is in header
    if (!config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${API_TOKEN}`
    }
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      if (typeof config.headers.delete === 'function') {
        config.headers.delete('Content-Type')
      } else {
        delete config.headers['Content-Type']
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('Authentication failed')
      // Could redirect to login or show error
    }
    return Promise.reject(error)
  }
)

export default api
export { API_TOKEN, API_BASE_URL }

export async function askTalon(message, history, userName) {
  const response = await api.post('/api/chat', {
    message,
    history,
    user_name: userName
  })
  return response.data
}

