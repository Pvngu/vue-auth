import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

interface User {
  id: number
  email: string
  name: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))

  const isAuthenticated = computed(() => !!token.value)

  function setAuth(newToken: string, userData: User) {
    token.value = newToken
    user.value = userData
    localStorage.setItem('token', newToken)
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
  }

  function clearAuth() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    delete axios.defaults.headers.common['Authorization']
  }

  async function login(email: string, password: string) {
    try {
      const response = await axios.post('/api/auth/login', { email, password })
      setAuth(response.data.token, response.data.user)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || 'Login failed' }
    }
  }

  async function register(name: string, email: string, password: string) {
    try {
      const response = await axios.post('/api/auth/register', { name, email, password })
      setAuth(response.data.token, response.data.user)
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
      } catch {
        clearAuth()
      }
    }
  }

  return {
    user,
    token,
    isAuthenticated,
    login,
    register,
    logout,
    checkAuth
  }
})
