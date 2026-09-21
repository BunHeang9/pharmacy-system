<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '@/api/client'
import { useToast } from '@/stores/toast'
import PageHeader from '@/components/ui/PageHeader.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import SearchInput from '@/components/ui/SearchInput.vue'
import SelectInput from '@/components/ui/SelectInput.vue'
import DataTable from '@/components/ui/DataTable.vue'
import TableRow from '@/components/ui/TableRow.vue'
import TableCell from '@/components/ui/TableCell.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'

interface Movement {
  id: string
  medicine: string
  batchNo: string
  type: string
  quantity: number
  balanceAfter: number
  reason: string
  user: string
  date: string
}

const { t } = useI18n()
const toast = useToast()

const movements = ref<Movement[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const { data } = await api.get<Movement[]>('/stock-movements')
    movements.value = data
  } catch {
    toast.show(t('toasts.auditLog.loadFailed'), 'error')
  } finally {
    loading.value = false
  }
}
onMounted(load)

const search = ref('')
const typeFilter = ref('All')

const MOVEMENT_TYPES = ['STOCK_IN', 'STOCK_OUT', 'SALE', 'DAMAGED', 'EXPIRED', 'LOST', 'CORRECTION']
const typeFilterOptions = computed(() => [
  { value: 'All', label: t('pages.auditLog.allTypes') },
  ...MOVEMENT_TYPES.map((v) => ({ value: v, label: t(`status.${v}`) })),
])

const filtered = computed(() =>
  movements.value.filter((m) => {
    if (typeFilter.value !== 'All' && m.type !== typeFilter.value) return false
    if (search.value) {
      const q = search.value.toLowerCase()
      if (!m.medicine.toLowerCase().includes(q) && !m.user.toLowerCase().includes(q) && !m.reason.toLowerCase().includes(q)) return false
    }
    return true
  }),
)

function formatDate(iso: string) {
  return iso.slice(0, 16).replace('T', ' ')
}
</script>

<template>
  <div class="space-y-5">
    <PageHeader :title="t('pages.auditLog.title')" :subtitle="t('pages.auditLog.subtitle')" />

    <SectionCard>
      <div class="p-4 flex flex-wrap gap-3 items-center">
        <SearchInput v-model="search" :placeholder="t('pages.auditLog.searchPlaceholder')" />
        <SelectInput v-model="typeFilter" :options="typeFilterOptions" />
        <span class="text-xs text-slate-500 dark:text-slate-400 ml-auto">{{ t('pages.auditLog.entriesFound', { n: filtered.length }) }}</span>
      </div>

      <DataTable
        :headers="[
          t('pages.auditLog.colDate'), t('common.medicine'), t('pages.auditLog.colBatch'),
          t('pages.auditLog.colType'), t('pages.auditLog.colQuantity'), t('pages.auditLog.colBalance'),
          t('pages.auditLog.colReason'), t('pages.auditLog.colUser'),
        ]"
      >
        <TableRow v-for="m in filtered" :key="m.id">
          <TableCell><span class="text-xs text-slate-500 dark:text-slate-400 font-mono">{{ formatDate(m.date) }}</span></TableCell>
          <TableCell><span class="font-medium text-slate-800 dark:text-slate-100">{{ m.medicine }}</span></TableCell>
          <TableCell><span class="font-mono text-xs text-slate-500 dark:text-slate-400">{{ m.batchNo }}</span></TableCell>
          <TableCell><StatusBadge kind="movement" :status="m.type" /></TableCell>
          <TableCell>
            <span class="font-mono text-sm font-medium" :class="m.quantity < 0 ? 'text-red-600' : 'text-emerald-600'">
              {{ m.quantity > 0 ? '+' : '' }}{{ m.quantity }}
            </span>
          </TableCell>
          <TableCell><span class="font-mono text-sm text-slate-600 dark:text-slate-300">{{ m.balanceAfter }}</span></TableCell>
          <TableCell><span class="text-sm text-slate-600 dark:text-slate-300">{{ m.reason }}</span></TableCell>
          <TableCell><span class="text-sm text-slate-500 dark:text-slate-400">{{ m.user }}</span></TableCell>
        </TableRow>
      </DataTable>

      <div v-if="filtered.length === 0" class="py-16 text-center text-slate-400 text-sm">
        {{ t('pages.auditLog.noResults') }}
      </div>
    </SectionCard>
  </div>
</template>
