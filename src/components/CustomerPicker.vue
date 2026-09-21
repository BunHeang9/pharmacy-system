<script setup lang="ts">
// SelectInput ທຳມະດາ (native <select>) ຄົ້ນຫາ/ສະແດງຫຼາຍແຖວບໍ່ໄດ້ — component ນີ້ຈຶ່ງແຍກຕ່າງຫາກ
// ເປັນ text input + dropdown ຂອງເຮົາເອງ, ຄົ້ນຫາໄດ້ທັງຊື່ ແລະ ເບີໂທ, ແຕ່ລະລາຍການສະແດງ 2 ແຖວ
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'

interface CustomerOption {
  id: string
  name: string
  phone: string | null
  discount: number
}

const props = defineProps<{ customers: CustomerOption[] }>()
const modelValue = defineModel<string>({ default: '' })

const { t } = useI18n()
const query = ref('')
const open = ref(false)
const root = ref<HTMLElement | null>(null)

const selected = computed(() => props.customers.find((c) => c.id === modelValue.value) ?? null)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return props.customers
  return props.customers.filter(
    (c) => c.name.toLowerCase().includes(q) || (c.phone ?? '').toLowerCase().includes(q),
  )
})

function pick(c: CustomerOption | null) {
  modelValue.value = c?.id ?? ''
  query.value = ''
  open.value = false
}

function onFocus() {
  query.value = ''
  open.value = true
}

function handler(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) open.value = false
}
onMounted(() => document.addEventListener('mousedown', handler))
onBeforeUnmount(() => document.removeEventListener('mousedown', handler))
</script>

<template>
  <div ref="root" class="relative">
    <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">{{ t('pages.pos.customer') }}</label>
    <input
      :value="open ? query : (selected?.name ?? t('pages.pos.walkInCustomer'))"
      type="text"
      :placeholder="t('pages.pos.searchCustomer')"
      class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
      @focus="onFocus"
      @input="query = ($event.target as HTMLInputElement).value"
    />
    <div
      v-if="open"
      class="absolute left-0 right-0 mt-1 z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-64 overflow-y-auto py-1"
    >
      <button
        type="button"
        class="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition"
        :class="!modelValue ? 'bg-blue-50 dark:bg-blue-500/10' : ''"
        @click="pick(null)"
      >
        {{ t('pages.pos.walkInCustomer') }}
      </button>
      <button
        v-for="c in filtered"
        :key="c.id"
        type="button"
        class="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
        :class="c.id === modelValue ? 'bg-blue-50 dark:bg-blue-500/10' : ''"
        @click="pick(c)"
      >
        <div class="text-sm font-medium text-slate-800 dark:text-slate-100">{{ c.name }}</div>
        <div class="text-xs text-slate-400">{{ c.phone || '—' }}</div>
      </button>
      <div v-if="filtered.length === 0" class="px-3 py-4 text-center text-xs text-slate-400">
        {{ t('pages.pos.noCustomersFound') }}
      </div>
    </div>
  </div>
</template>
