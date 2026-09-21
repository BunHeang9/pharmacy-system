<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <div class="flex items-start justify-between mb-6">
    <div>
      <h1 class="text-xl font-bold text-slate-800 dark:text-slate-100 font-display">{{ title }}</h1>
      <p v-if="subtitle" class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="flex items-center gap-2"><slot name="actions" /></div>
  </div>
</template>
