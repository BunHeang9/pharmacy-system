<script setup lang="ts">
defineProps<{ clickable?: boolean }>()
</script>

<template>
  <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors" :class="clickable ? 'cursor-pointer' : ''">
    <slot />
  </tr>
</template>
