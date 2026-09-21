<script setup lang="ts">

import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { AlertTriangle, AlertCircle, Info, CheckCircle, Bell, CheckCheck } from 'lucide-vue-next'
import { useToast } from '@/stores/toast'
import { useNotifications } from '@/stores/notifications'

import PageHeader from '@/components/ui/PageHeader.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import TabsBar from '@/components/ui/TabsBar.vue'
import Button from '@/components/ui/Button.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const { t } = useI18n()
const toast = useToast()

// ໃຊ້ store ຮ່ວມ — ໄອຄອນກະດິ່ງໃນ header ຈະອັບເດດຕາມ
const notifications = useNotifications()
const { items, unreadCount } = storeToRefs(notifications)

const TAB_VALUES = ['All', 'Unread', 'Alerts', 'Warnings', 'Info']
const TABS = computed(() => TAB_VALUES.map((v) => ({ value: v, label: t(`pages.notifications.tabs.${v}`) })))
const activeTab = ref('All')

const filtered = computed(() => {
  if (activeTab.value === 'Unread') return items.value.filter((n) => !n.read)
  if (activeTab.value === 'Alerts') return items.value.filter((n) => n.type === 'danger')
  if (activeTab.value === 'Warnings') return items.value.filter((n) => n.type === 'warning')
  if (activeTab.value === 'Info') return items.value.filter((n) => n.type === 'info' || n.type === 'success')
  return items.value
})
const ICONS: Record<string, any> = {
  warning: AlertTriangle,
  danger: AlertCircle,
  info: Info,
  success: CheckCircle,
}

const TONE: Record<string, string> = {
  warning: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600',
  danger: 'bg-red-50 dark:bg-red-500/10 text-red-600',
  info: 'bg-sky-50 dark:bg-sky-500/10 text-sky-600',
  success: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600',
}
const { markRead, dismiss } = notifications

onMounted(() => notifications.load())

function markAllRead() {
  notifications.markAllRead()
  toast.show(t('toasts.notifications.allRead'), 'success')
}

const formatTime = (iso: string) => iso.slice(0, 16).replace('T', ' ')
</script>

<template>
  <div class="space-y-5">
    <PageHeader :title="t('pages.notifications.title')" :subtitle="t('pages.notifications.subtitle')">
      <template #actions>
        <Button variant="outline" :disabled="unreadCount === 0" @click="markAllRead">
          <CheckCheck class="w-4 h-4" /> {{ t('pages.notifications.markAllRead') }}
        </Button>
      </template>
    </PageHeader>

    <SectionCard>
      <div class="px-4 pt-3">
        <TabsBar v-model="activeTab" :tabs="TABS" />
      </div>

      <ul class="divide-y divide-slate-50">
        <li
          v-for="n in filtered"
          :key="n.id"
          class="flex items-start gap-3 px-5 py-4 transition-colors"
          :class="n.read ? 'bg-white dark:bg-slate-800' : 'bg-blue-50/40 dark:bg-blue-500/10'"
        >
          <!-- ໄອຄອນຕາມປະເພດ -->
          <div class="p-2 rounded-lg flex-shrink-0" :class="TONE[n.type]">
            <component :is="ICONS[n.type]" class="w-4 h-4" />
          </div>

          <!-- ເນື້ອໃນ -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span v-if="!n.read" class="w-2 h-2 rounded-full bg-[#1d6fcd] flex-shrink-0" />
              <p class="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{{ n.title }}</p>
            </div>
            <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{{ n.message }}</p>
            <p class="mt-1 text-xs text-slate-400">{{ formatTime(n.time) }}</p>
          </div>

          <!-- ປຸ່ມຈັດການ -->
          <div class="flex items-center gap-1 flex-shrink-0">
            <button
              v-if="!n.read"
              class="px-2 py-1 text-xs text-[#1d6fcd] rounded hover:bg-blue-50 dark:hover:bg-blue-500/10 transition"
              @click="markRead(n.id)"
            >
              {{ t('pages.notifications.markRead') }}
            </button>
            <button
              class="px-2 py-1 text-xs text-slate-400 rounded hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300 transition"
              @click="dismiss(n.id)"
            >
              {{ t('pages.notifications.dismiss') }}
            </button>
          </div>
        </li>
      </ul>

      <EmptyState v-if="filtered.length === 0" :message="t('pages.notifications.noNotifications')">
        <template #icon><Bell class="w-12 h-12 mb-3" /></template>
      </EmptyState>
    </SectionCard>
  </div>
</template>

