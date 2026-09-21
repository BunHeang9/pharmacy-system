<script setup lang="ts">
withDefaults(
  defineProps<{ title: string; size?: 'sm' | 'md' | 'lg' | 'xl' }>(),
  { size: 'md' },
)

const open = defineModel<boolean>('open', { default: false })

const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

function close() {
  open.value = false
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="close" />
      <div class="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-h-[90vh] overflow-y-auto" :class="sizes[size]">
        <div class="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700">
          <h3 class="text-base font-semibold text-slate-800 dark:text-slate-100 font-display">{{ title }}</h3>
          <button class="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition" @click="close">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="p-5"><slot /></div>
      </div>
    </div>
  </Teleport>
</template>
