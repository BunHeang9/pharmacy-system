<script setup lang="ts">
defineProps<{
  label?: string
  options: { value: string; label: string }[]
}>()

const model = defineModel<string>()
</script>

<template>
  <div>
    <label v-if="label" class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">{{ label }}</label>
    <select
      v-model="model"
      class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition appearance-none cursor-pointer"
    >
      <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
    </select>
  </div>
</template>
