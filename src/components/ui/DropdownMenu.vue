<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

defineProps<{
  items: { label: string; onClick?: () => void; danger?: boolean }[]
}>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)

function handler(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) open.value = false
}
onMounted(() => document.addEventListener('mousedown', handler))
onBeforeUnmount(() => document.removeEventListener('mousedown', handler))

function pick(item: { onClick?: () => void }) {
  item.onClick?.()
  open.value = false
}
</script>

<template>
  <div ref="root" class="relative">
    <div @click="open = !open"><slot name="trigger" /></div>
    <div
      v-if="open"
      class="absolute right-0 mt-1 z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 min-w-40"
    >
      <button
        v-for="(item, i) in items"
        :key="i"
        class="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left"
        :class="item.danger ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'"
        @click="pick(item)"
      >
        {{ item.label }}
      </button>
    </div>
  </div>
</template>
