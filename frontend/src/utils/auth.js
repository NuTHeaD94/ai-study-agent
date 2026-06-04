import API from '../api/config'

export const authAPI = {
  register: (data) => API.post('/auth/register', data),
  login: (data) => API.post('/auth/login', data),
  getMe: () => API.get('/auth/me'),
}

export const getToken = () => localStorage.getItem('token')

export const setToken = (token) => localStorage.setItem('token', token)

export const removeToken = () => localStorage.removeItem('token')

export const setUser = (user) => localStorage.setItem('user', JSON.stringify(user))

export const getUser = () => {
  const user = localStorage.getItem('user')
  return user ? JSON.parse(user) : null
}

export const removeUser = () => localStorage.removeItem('user')

export const isAuthenticated = () => !!getToken()

export const logout = () => {
  removeToken()
  removeUser()
}
