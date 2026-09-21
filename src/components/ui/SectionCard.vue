<script setup lang="ts">
import Card from './Card.vue'
defineProps<{ title?: string }>()
</script>

<template>
  <Card>
    <div v-if="title" class="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
      <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200 font-display">{{ title }}</h3>
      <slot name="action" />
    </div>
    <slot />
  </Card>
</template>
