<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, RouterView } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuth } from '@/stores/auth'
import { useNotifications } from '@/stores/notifications'
import { useSettings } from '@/stores/settings'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import ToastHost from '@/components/ui/ToastHost.vue'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const notifications = useNotifications()
const settings = useSettings()
const { t, te } = useI18n()

const sidebarOpen = ref(true)
const search = ref('')

onMounted(() => {
  notifications.load()
  settings.load()
})

const unreadCount = computed(() => notifications.unreadCount)

// ຫົວຂໍ້ໜ້າ: ໃຊ້ຄຳແປຈາກ nav.<route name> ຖ້າມີ ບໍ່ດັ່ງນັ້ນຕົກລົງໃຊ້ meta.title
const pageTitle = computed(() => {
  const key = `nav.${String(route.name ?? '')}`
  return te(key) ? t(key) : (route.meta.title as string) || ''
})
onMounted(() => {
  notifications.load()
  settings.load()
})
const initials = computed(() =>
  (auth.user?.name || '')
    .split(' ')
    .map((w) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase(),
)

// label ເປັນ key ຂອງ i18n — ແປຕອນ render ດ້ວຍ t()
const NAV_GROUPS = [
  {
    label: 'nav.groups.main',
    items: [
      { to: '/dashboard', label: 'nav.dashboard', icon: '⊞' },
      { to: '/pos', label: 'nav.pos', icon: '⊡' },
    ],
  },
  {
    label: 'nav.groups.catalogue',
    items: [
      { to: '/medicines', label: 'nav.medicines', icon: '💊' },
      { to: '/categories', label: 'nav.categories', icon: '🗂' },
      { to: '/suppliers', label: 'nav.suppliers', icon: '🏢' },
    ],
  },
  {
    label: 'nav.groups.transactions',
    items: [
      { to: '/purchases', label: 'nav.purchases', icon: '🛒' },
      { to: '/sales', label: 'nav.sales', icon: '📄' },
      { to: '/customers', label: 'nav.customers', icon: '👥' },
      { to: '/prescriptions', label: 'nav.prescriptions', icon: '📋' },
    ],
  },
  {
    label: 'nav.groups.stock',
    items: [
      { to: '/inventory', label: 'nav.inventory', icon: '📦' },
      { to: '/expiry', label: 'nav.expiry', icon: '⏰' },
    ],
  },
  {
    label: 'nav.groups.management',
    items: [
      { to: '/reports', label: 'nav.reports', icon: '📊' },
      { to: '/expenses', label: 'nav.expenses', icon: '💵' },
      { to: '/users', label: 'nav.users', icon: '🔐' },
      { to: '/settings', label: 'nav.settings', icon: '⚙️' },
      { to: '/audit-log', label: 'nav.auditLog', icon: '📜' },

    ],
  },
]
// ໜ້າທີ່ Pharmacy Clerk ເຂົ້າບໍ່ໄດ້ — ເຊື່ອງອອກຈາກ sidebar (backend ກັນໄວ້ແລ້ວ, ນີ້ແມ່ນແຕ່ UX)
const CLERK_HIDDEN_PATHS = ['/categories', '/suppliers', '/purchases', '/prescriptions', '/reports', '/expenses', '/users', '/settings']

const visibleNavGroups = computed(() => {
  const isClerk = auth.user?.role === 'PHARMACY_CLERK'
  const isSuperAdmin = auth.user?.role === 'SUPER_ADMIN'
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (isClerk && CLERK_HIDDEN_PATHS.includes(item.to)) return false
      if (item.to === '/audit-log' && !isSuperAdmin) return false
      return true
    }),
  })).filter((group) => group.items.length > 0)
})


async function logout() {
  await auth.logout()
  router.push('/login')
}

const userMenu = computed(() => [
  { label: t('userMenu.settings'), onClick: () => router.push('/settings') },
  { label: t('userMenu.logout'), onClick: logout, danger: true },
])
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-[#f0f4f8] dark:bg-slate-900">
    <!-- Sidebar -->
    <aside
      class="flex-shrink-0 flex flex-col bg-[#0f1f3d] transition-all duration-300 no-print"
      :class="sidebarOpen ? 'w-56' : 'w-16'"
    >
      <div class="flex items-center gap-2.5 px-4 h-14 border-b border-white/10 flex-shrink-0">
        <div class="w-8 h-8 bg-[#1d6fcd] rounded-lg flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
            />
          </svg>
        </div>
        <div v-if="sidebarOpen">
          <div class="text-sm font-bold text-white font-display leading-tight">{{ settings.shopName || 'Pharmacy' }}</div>
          <div class="text-xs text-slate-400 leading-tight">{{ t('header.tagline') }}</div>
        </div>
      </div>

      <nav class="flex-1 overflow-y-auto p-3 space-y-4">
        <div v-for="group in visibleNavGroups" :key="group.label">

          <div
            v-if="sidebarOpen"
            class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-1.5"
          >
            {{ t(group.label) }}
          </div>
          <div class="space-y-0.5">
            <RouterLink
              v-for="item in group.items"
              :key="item.to"
              :to="item.to"
              class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all text-left"
              :class="
                route.path === item.to
                  ? 'bg-[#1d6fcd] text-white shadow-sm'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              "
            >
              <span class="text-base leading-none w-5 text-center flex-shrink-0">{{ item.icon }}</span>
              <span v-if="sidebarOpen" class="font-medium flex-1">{{ t(item.label) }}</span>
            </RouterLink>
          </div>
        </div>
      </nav>

      <div class="border-t border-white/10 p-3 space-y-0.5 flex-shrink-0">
        <div
          class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition cursor-pointer"
          :class="sidebarOpen ? '' : 'justify-center'"
        >
          <div class="w-7 h-7 bg-[#1d6fcd] rounded-full flex items-center justify-center flex-shrink-0">
            <span class="text-xs font-bold text-white">{{ initials }}</span>
          </div>
          <div v-if="sidebarOpen" class="flex-1 min-w-0">
            <div class="text-xs font-medium text-white truncate">{{ auth.user?.name }}</div>
            <div class="text-xs text-slate-400">{{ auth.user?.role }}</div>
          </div>
        </div>
        <button
          class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition text-sm"
          @click="logout"
        >
          <span class="text-base w-5 text-center">↗</span>
          <span v-if="sidebarOpen">{{ t('userMenu.logout') }}</span>
        </button>
      </div>
    </aside>

    <!-- Main -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <header
        class="h-14 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center gap-4 px-4 flex-shrink-0 shadow-sm no-print"
      >
        <button
          class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          @click="sidebarOpen = !sidebarOpen"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div class="flex items-center gap-2 text-sm">
          <span class="text-slate-400 dark:text-slate-500">{{ settings.shopName || 'Pharmacy' }}</span>
          <span class="text-slate-300 dark:text-slate-600">/</span>
          <span class="font-medium text-slate-700 dark:text-slate-200">{{ pageTitle }}</span>
        </div>

        <div class="flex-1 max-w-sm mx-4">
          <div class="relative">
            <svg
              class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              v-model="search"
              :placeholder="t('header.search')"
              class="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>
        </div>

        <div class="flex items-center gap-2 ml-auto">
            <ThemeToggle />
          <LanguageSwitcher />

          <RouterLink
            to="/pos"
            class="px-3 py-1.5 bg-[#1d6fcd] hover:bg-[#1558a8] text-white text-xs font-semibold rounded-lg transition shadow-sm"
          >
            + {{ t('header.newSale') }}
          </RouterLink>

          <RouterLink
            to="/notifications"
            class="relative p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <span
              v-if="unreadCount > 0"
              class="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center leading-none"
            >
              {{ unreadCount }}
            </span>
          </RouterLink>

          <DropdownMenu :items="userMenu">
            <template #trigger>
              <button class="flex items-center gap-2 px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">
                <div class="w-7 h-7 bg-[#1d6fcd] rounded-full flex items-center justify-center">
                  <span class="text-xs font-bold text-white">{{ initials }}</span>
                </div>
                <div class="text-left hidden md:block">
                  <div class="text-xs font-semibold text-slate-700 dark:text-slate-200">{{ auth.user?.name }}</div>
                  <div class="text-xs text-slate-400 dark:text-slate-500">{{ auth.user?.role }}</div>
                </div>
                <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </template>
          </DropdownMenu>
        </div>
      </header>

      <main class="flex-1 overflow-y-auto p-6">
        <RouterView />
      </main>
    </div>

    <ToastHost />
  </div>
</template>
