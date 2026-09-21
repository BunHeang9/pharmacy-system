import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api/client'

export type NotificationType = 'warning' | 'danger' | 'info' | 'success'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  time: string
  read: boolean
}

// ບ່ອນເກັບການແຈ້ງເຕືອນຮ່ວມກັນ — header (ໄອຄອນກະດິ່ງ) ແລະ ໜ້າ Notifications ໃຊ້ອັນດຽວກັນ
// ແຈ້ງເຕືອນສ້າງ/ອັບເດດຢູ່ server ຈາກສະຕັອກ/ວັນໝົດອາຍຸ/ໃບສັ່ງຢາຈິງ — ເບິ່ງ server/src/routes/notifications.ts
export const useNotifications = defineStore('notifications', () => {
  const items = ref<AppNotification[]>([])
  const loaded = ref(false)

  const unreadCount = computed(() => items.value.filter((n) => !n.read).length)

  async function load() {
    try {
      const { data } = await api.get<AppNotification[]>('/notifications')
      items.value = data
      loaded.value = true
    } catch {
      // ຄ່ອຍລອງໃໝ່ຄັ້ງຕໍ່ໄປ — ບໍ່ໃຫ້ header crash ຖ້າໂຫຼດບໍ່ໄດ້
    }
  }

  async function markRead(id: string) {
    const n = items.value.find((x) => x.id === id)
    if (n) n.read = true
    try {
      await api.post(`/notifications/${id}/read`)
    } catch {
      if (n) n.read = false
    }
  }

  async function markAllRead() {
    const previouslyUnread = items.value.filter((n) => !n.read)
    items.value.forEach((n) => (n.read = true))
    try {
      await api.post('/notifications/read-all')
    } catch {
      previouslyUnread.forEach((n) => (n.read = false))
    }
  }

  async function dismiss(id: string) {
    const removed = items.value.find((x) => x.id === id)
    items.value = items.value.filter((x) => x.id !== id)
    try {
      await api.delete(`/notifications/${id}`)
    } catch {
      if (removed) items.value.push(removed)
    }
  }

  return { items, unreadCount, loaded, load, markRead, markAllRead, dismiss }
})
