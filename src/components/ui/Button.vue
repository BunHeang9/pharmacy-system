<script setup lang="ts">
type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
type BtnSize = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    variant?: BtnVariant
    size?: BtnSize
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
  }>(),
  { variant: 'primary', size: 'md', disabled: false, type: 'button' },
)

const base =
  'inline-flex items-center gap-2 font-medium rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none'

const variants: Record<BtnVariant, string> = {
  primary: 'bg-[#1d6fcd] hover:bg-[#1558a8] text-white shadow-sm',
  secondary: 'bg-[#0d9488] hover:bg-[#0b7a6e] text-white shadow-sm',
  danger: 'bg-red-500 hover:bg-red-600 text-white shadow-sm',
  ghost: 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white',
  outline: 'border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200',
}

const sizes: Record<BtnSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-sm',
}
</script>

<template>
  <button :type="props.type" :disabled="props.disabled" :class="[base, variants[props.variant], sizes[props.size]]">
    <slot />
  </button>
</template>
