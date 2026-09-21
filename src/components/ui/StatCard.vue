<script setup lang="ts">
import Card from './Card.vue'

const props = withDefaults(
  defineProps<{
    title: string
    value: string | number
    trend?: number
    trendLabel?: string
    color?: 'blue' | 'teal' | 'green' | 'amber' | 'red' | 'purple'
  }>(),
  { color: 'blue' },
)

const colors: Record<string, string> = {
  blue: 'bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400',
  teal: 'bg-teal-50 dark:bg-teal-500/15 text-teal-600 dark:text-teal-400',
  green: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  amber: 'bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400',
  red: 'bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400',
  purple: 'bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400',
}
</script>

<template>
  <Card class="p-5">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{{ title }}</p>
        <p class="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100 font-display">{{ value }}</p>
        <p v-if="trend !== undefined" class="mt-1 text-xs" :class="trend >= 0 ? 'text-emerald-600' : 'text-red-500'">
          {{ trend >= 0 ? '↑' : '↓' }} {{ Math.abs(trend) }}% {{ trendLabel }}
        </p>
      </div>
      <div class="p-2.5 rounded-lg" :class="colors[props.color]">
        <slot name="icon" />
      </div>
    </div>
  </Card>
</template>
