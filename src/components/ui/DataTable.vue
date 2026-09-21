<script setup lang="ts">
defineProps<{ headers: string[] }>()
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-slate-100 dark:border-slate-700">
          <th
            v-for="h in headers"
            :key="h"
            class="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap"
          >
            {{ h }}
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-50 dark:divide-slate-700/60">
        <slot />
      </tbody>
    </table>
  </div>
</template>
