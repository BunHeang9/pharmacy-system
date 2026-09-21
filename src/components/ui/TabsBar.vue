<script setup lang="ts">
type Tab = string | { value: string; label: string }

const props = defineProps<{ tabs: Tab[] }>()
const active = defineModel<string>({ required: true })

const value = (t: Tab) => (typeof t === 'string' ? t : t.value)
const label = (t: Tab) => (typeof t === 'string' ? t : t.label)
</script>

<template>
  <div class="flex gap-1 border-b border-slate-200 dark:border-slate-700">
    <button
      v-for="tab in props.tabs"
      :key="value(tab)"
      class="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors"
      :class="
        active === value(tab)
          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
          : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
      "
      @click="active = value(tab)"
    >
      {{ label(tab) }}
    </button>
  </div>
</template>
