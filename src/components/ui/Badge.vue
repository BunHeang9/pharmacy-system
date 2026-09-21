<script setup lang="ts">
type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted'

const props = withDefaults(defineProps<{ variant?: BadgeVariant }>(), { variant: 'default' })

const styles: Record<BadgeVariant, string> = {
  default: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  danger: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  info: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  muted: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
}
</script>

<template>
  <span
    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
    :class="styles[props.variant]"
  >
    <slot />
  </span>
</template>
