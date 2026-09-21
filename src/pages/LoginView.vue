<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Eye, EyeOff } from 'lucide-vue-next'
import { useAuth } from '@/stores/auth'
import api from '@/api/client'

const router = useRouter()
const auth = useAuth()
const { t } = useI18n()

const email = ref('admin@rxpharm.com')
const password = ref('password')
const showPassword = ref(false)
const remember = ref(false)
const error = ref('')

// ໜ້ານີ້ຍັງບໍ່ login ຈຶ່ງໃຊ້ /settings/public (ບໍ່ຕ້ອງ login) — ສະເພາະຊື່ຮ້ານ, ບໍ່ແມ່ນຂໍ້ມູນທັງໝົດ
const shopName = ref('')
onMounted(async () => {
  try {
    const { data } = await api.get('/settings/public')
    shopName.value = data.shopName
  } catch {
    // ບໍ່ມີບັນຫາ — ຕົກລົງໃຊ້ຄ່າ default ໃນ template
  }
})

async function handleSubmit() {
  error.value = ''
  try {
    await auth.login(email.value, password.value)
    router.push('/dashboard')
  } catch (e) {
    error.value = t('pages.login.invalidCredentials')
  }
}
</script>

<template>
  <div
    class="relative min-h-screen bg-gradient-to-br from-[#0f1f3d] via-[#1d3a6e] to-[#0d9488] flex items-center justify-center p-4"
  >
    <div class="absolute inset-0 opacity-5">
      <div
        class="absolute inset-0"
        style="
          background-image: radial-gradient(circle at 25% 25%, white 2px, transparent 2px),
            radial-gradient(circle at 75% 75%, white 2px, transparent 2px);
          background-size: 60px 60px;
        "
      />
    </div>

    <div class="relative w-full max-w-md">
      <div class="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl">
        <div class="flex flex-col items-center mb-8">
          <div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <svg class="w-9 h-9 text-[#1d6fcd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-white font-display tracking-tight">{{ shopName || 'Pharmacy' }}</h1>
          <p class="text-blue-200 text-sm mt-1">{{ t('pages.login.tagline') }}</p>
        </div>

        <form class="space-y-4" @submit.prevent="handleSubmit">
          <div>
            <label class="block text-xs font-medium text-blue-100 mb-1.5">{{ t('pages.login.emailAddress') }}</label>
            <input
              v-model="email"
              type="email"
              placeholder="admin@rxpharm.com"
              class="w-full px-4 py-2.5 bg-white/15 border border-white/25 rounded-lg text-white placeholder:text-blue-300 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/40 transition"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-blue-100 mb-1.5">{{ t('pages.login.password') }}</label>
            <div class="relative">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••"
                class="w-full px-4 py-2.5 pr-10 bg-white/15 border border-white/25 rounded-lg text-white placeholder:text-blue-300 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/40 transition"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-blue-200 hover:text-white transition"
                :aria-label="showPassword ? t('pages.login.hidePassword') : t('pages.login.showPassword')"
                @click="showPassword = !showPassword"
              >
                <EyeOff v-if="showPassword" class="w-4 h-4" />
                <Eye v-else class="w-4 h-4" />
              </button>
            </div>
          </div>

          <p v-if="error" class="text-sm text-red-300">{{ error }}</p>

          <div class="flex items-center justify-between">
            <label class="flex items-center gap-2 cursor-pointer">
              <input v-model="remember" type="checkbox" class="w-4 h-4 rounded border-white/30 bg-white/15" />
              <span class="text-sm text-blue-200">{{ t('pages.login.rememberMe') }}</span>
            </label>
            <button type="button" class="text-sm text-blue-200 hover:text-white transition">{{ t('pages.login.forgotPassword') }}</button>
          </div>

          <button
            type="submit"
            :disabled="auth.loading"
            class="w-full py-2.5 bg-white text-[#1d6fcd] rounded-lg font-semibold text-sm transition hover:bg-blue-50 disabled:opacity-70 shadow-lg mt-2"
          >
            {{ auth.loading ? t('pages.login.signingIn') : t('pages.login.signIn') }}
          </button>
        </form>

        <p class="text-center text-xs text-blue-300 mt-6">{{ t('pages.login.demoNote', { email: 'admin@rxpharm.com' }) }}</p>
      </div>
    </div>
  </div>
</template>
