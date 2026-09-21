<script setup lang="ts">
import { Sun, Moon } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useTheme } from '@/stores/theme'

const { t } = useI18n()
const theme = useTheme()
</script>

<template>
  <button
    :title="t('theme.toggle')"
    class="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-500 dark:text-slate-300 transition"
    @click="theme.toggle()"
  >
    <Moon v-if="theme.current === 'light'" class="w-4 h-4" />
    <Sun v-else class="w-4 h-4" />
  </button>
</template>
