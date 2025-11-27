import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

interface User {
  id: number
  email: string
  name: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(JSON.parse(localStorage.getItem('user') || 'null'))
  const token = ref<string | null>(localStorage.getItem('token'))
  const permissions = ref<string[]>(JSON.parse(localStorage.getItem('permissions') || '[]'))

  const isAuthenticated = computed(() => !!token.value)

  // Set authorization header on store initialization if token exists
  if (token.value) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
  }

  function hasPermission(permission: string): boolean {
    return permissions.value.includes(permission)
  }

  function setAuth(newToken: string, userData: User, userPermissions: string[] = []) {
    token.value = newToken
    user.value = userData
    permissions.value = userPermissions
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(userData))
    localStorage.setItem('permissions', JSON.stringify(userPermissions))
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
  }

  function clearAuth() {
    token.value = null
    user.value = null
    permissions.value = []
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('permissions')
    delete axios.defaults.headers.common['Authorization']
  }

  async function login(email: string, password: string) {
    try {
      const response = await axios.post('/api/auth/login', { email, password })
      setAuth(response.data.token, response.data.user, response.data.permissions || [])
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || 'Login failed' }
    }
  }

  async function register(name: string, email: string, password: string) {
    try {
      const response = await axios.post('/api/auth/register', { name, email, password })
      setAuth(response.data.token, response.data.user, response.data.permissions || [])
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || 'Registration failed' }
    }
  }

  function logout() {
    clearAuth()
  }

  async function checkAuth() {
    if (token.value) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
      try {
        const response = await axios.get('/api/auth/me')
        user.value = response.data.user
        permissions.value = response.data.permissions || []
        localStorage.setItem('user', JSON.stringify(user.value))
        localStorage.setItem('permissions', JSON.stringify(permissions.value))
      } catch {
        clearAuth()
      }
    }
  }

  return {
    user,
    token,
    permissions,
    isAuthenticated,
    hasPermission,
    login,
    register,
    logout,
    checkAuth
  }
})
