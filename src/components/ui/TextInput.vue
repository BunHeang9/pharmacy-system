<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string
    type?: string
    placeholder?: string
    required?: boolean
  }>(),
  { type: 'text', required: false },
)

// v-model — type="number" ເຮັດໃຫ້ Vue ແປງຄ່າເປັນ Number ໂດຍອັດຕະໂນມັດ (ເຖິງແມ່ນບໍ່ມີ .number modifier)
// ຈຶ່ງຮັບທັງ string ແລະ number ບໍ່ໃຫ້ຂຶ້ນ prop-type warning
const model = defineModel<string | number>()
</script>

<template>
  <div>
    <label v-if="label" class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
      {{ label }}<span v-if="required" class="text-red-500 ml-1">*</span>
    </label>
    <input
      v-model="model"
      :type="type"
      :placeholder="placeholder"
      class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
/>
  </div>
</template>
