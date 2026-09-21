import { defineStore } from 'pinia'
import { ref } from 'vue'

type ToastType = 'success' | 'error' | 'warning' | 'info'
interface ToastItem { id: number; message: string; type: ToastType }

export const useToast = defineStore('toast', () => {
  const items = ref<ToastItem[]>([])
  let nextId = 1

  function show(message: string, type: ToastType = 'success') {
    const id = nextId++
    items.value.push({ id, message, type })
    setTimeout(() => remove(id), 3000)
  }

  function remove(id: number) {
    items.value = items.value.filter((t) => t.id !== id)
  }

  return { items, show, remove }
})
