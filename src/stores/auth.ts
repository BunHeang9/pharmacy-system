import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api/client'

export interface User {
  id: string
  name: string
  email: string
  role: string
  branchId: string | null
}

export const useAuth = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)

  const isLoggedIn = () => user.value !== null

  async function login(email: string, password: string) {
    loading.value = true
    try {
      const { data } = await api.post('/auth/login', { email, password })
      user.value = data.user
      return true
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      await api.post('/auth/logout')
    } finally {
      user.value = null
    }
  }

  // ກູ້ session ຈາກ cookie ຕອນເປີດແອັບ — 401 ໝາຍຄວາມວ່າຍັງບໍ່ login
  async function restore() {
    try {
      const { data } = await api.get('/auth/me')
      user.value = data.user
    } catch {
      user.value = null
    }
  }

  return { user, loading, isLoggedIn, login, logout, restore }
})
