import axios from 'axios'

let apiURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
// Ensure the URL ends with /api to match backend routes
if (apiURL && !apiURL.endsWith('/api') && !apiURL.endsWith('/api/')) {
  apiURL = `${apiURL.replace(/\/$/, '')}/api`
}

const API = axios.create({
  baseURL: apiURL,
})

// Add token to every request
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Handle response errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default API
