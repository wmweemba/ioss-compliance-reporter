/**
 * API Configuration and Client for VATpilot
 * 
 * Environment-aware API configuration that automatically switches between
 * development and production endpoints based on environment variables.
 */

import axios from 'axios'

// Environment configuration
const isDevelopment = import.meta.env.DEV
const isProduction = import.meta.env.PROD

// API URL configuration with fallbacks
const API_CONFIG = {
  development: 'http://localhost:5000/api',
  production: 'https://ioss-compliance-reporter-production.up.railway.app/api'
}

// Get the correct API base URL based on environment
const getApiBaseUrl = () => {
  // First priority: explicit environment variable
  if (import.meta.env.VITE_API_URL) {
    const url = import.meta.env.VITE_API_URL.trim()
    // Ensure the URL has a protocol
    if (url && !url.startsWith('http')) {
      console.warn('⚠️ VITE_API_URL missing protocol, adding https://')
      return `https://${url}`
    }
    return url
  }
  
  // Second priority: environment-based default
  if (isDevelopment) {
    return API_CONFIG.development
  }
  
  // Fallback to production
  return API_CONFIG.production
}

// Initialize API base URL
export const API_BASE_URL = getApiBaseUrl()

// Environment validation and logging
const validateEnvironment = () => {
  const env = isDevelopment ? 'development' : 'production'
  
  console.log('🌍 VATpilot API Environment:', env)
  console.log('🔗 API Base URL:', API_BASE_URL)
  console.log('📋 Environment Variables:', {
    VITE_API_URL: import.meta.env.VITE_API_URL || 'not set',
    DEV: isDevelopment,
    PROD: isProduction
  })
  
  // Validate URL format
  if (!API_BASE_URL.startsWith('http')) {
    console.error('❌ Invalid API URL - missing protocol:', API_BASE_URL)
    throw new Error(`Invalid API URL: ${API_BASE_URL}`)
  }
  
  // Warn if using fallback configuration
  if (!import.meta.env.VITE_API_URL) {
    console.warn('⚠️ VITE_API_URL not set, using environment default:', API_BASE_URL)
  }
}

// Always validate environment to catch production issues
validateEnvironment()

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout for Railway cold starts
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor for debugging in development
if (isDevelopment) {
  apiClient.interceptors.request.use(
    (config) => {
      console.log('🚀 API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        baseURL: config.baseURL,
        fullURL: `${config.baseURL}${config.url}`
      })
      return config
    },
    (error) => {
      console.error('❌ API Request Error:', error)
      return Promise.reject(error)
    }
  )

  // Response interceptor for debugging in development
  apiClient.interceptors.response.use(
    (response) => {
      console.log('✅ API Response:', {
        status: response.status,
        url: response.config.url,
        data: response.data
      })
      return response
    },
    (error) => {
      console.error('❌ API Response Error:', {
        status: error.response?.status,
        url: error.config?.url,
        message: error.message,
        data: error.response?.data
      })
      return Promise.reject(error)
    }
  )
}

// API endpoint functions
export const leadApi = {
  /**
   * Submit a new lead from the risk quiz
   * @param {Object} leadData - Lead data object
   * @param {string} leadData.email - User email
   * @param {string} leadData.riskLevel - Risk assessment result
   * @param {Object} leadData.userAnswers - Quiz answers
   * @param {string} leadData.source - Lead source (default: 'risk_quiz')
   */
  create: async (leadData) => {
    const response = await apiClient.post('/leads', leadData)
    return response.data
  }
}

// Health check function
export const healthCheck = async () => {
  const response = await apiClient.get('/health')
  return response.data
}

// Export the configured axios instance for direct use if needed
export { apiClient }

// Export configuration for debugging
export const apiConfig = {
  baseURL: API_BASE_URL,
  environment: isDevelopment ? 'development' : 'production',
  isDevelopment,
  isProduction
}