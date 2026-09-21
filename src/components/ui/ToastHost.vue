<script setup lang="ts">
import { useToast } from '@/stores/toast'

const toast = useToast()

const styles: Record<string, string> = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-red-600 text-white',
  warning: 'bg-amber-500 text-white',
  info: 'bg-blue-600 text-white',
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 no-print">
      <div
        v-for="t in toast.items"
        :key="t.id"
        class="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium"
        :class="styles[t.type]"
      >
        {{ t.message }}
        <button class="opacity-80 hover:opacity-100" @click="toast.remove(t.id)">×</button>
      </div>
    </div>
  </Teleport>
</template>
