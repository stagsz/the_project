// API configuration and utility functions
export const API_URL = import.meta.env.VITE_API_URL || ''

export async function apiRequest(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`
  const token = localStorage.getItem('token')

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    ...options,
    headers
  })

  return response
}
