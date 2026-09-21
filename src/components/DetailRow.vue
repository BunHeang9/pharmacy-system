<script setup lang="ts">
withDefaults(defineProps<{ label: string; value: string; mono?: boolean }>(), { mono: false })
</script>

<template>
  <div class="flex justify-between items-start gap-4">
    <span class="text-xs font-medium text-slate-500 dark:text-slate-400 min-w-32">{{ label }}</span>
    <span class="text-sm text-slate-800 dark:text-slate-100 text-right" :class="mono ? 'font-mono' : ''">{{ value }}</span>
  </div>
</template>
