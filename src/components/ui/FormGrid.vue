<script setup lang="ts">
withDefaults(defineProps<{ cols?: 2 | 3 }>(), { cols: 2 })
</script>

<template>
  <div class="grid gap-4" :class="cols === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'">
    <slot />
  </div>
</template>
