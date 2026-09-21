<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-vue-next'
import api from '@/api/client'
import { daysUntil, expiryStatus, daysLabel } from '@/utils/expiry'
import { useToast } from '@/stores/toast'
import { apiErrorMessage } from '@/lib/apiError'
import { useNotifications } from '@/stores/notifications'
import { useAuth } from '@/stores/auth'
import PageHeader from '@/components/ui/PageHeader.vue'
import StatCard from '@/components/ui/StatCard.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import DataTable from '@/components/ui/DataTable.vue'
import TableRow from '@/components/ui/TableRow.vue'
import TableCell from '@/components/ui/TableCell.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import Button from '@/components/ui/Button.vue'
import TabsBar from '@/components/ui/TabsBar.vue'

interface BatchRow {
  id: string
  medicineId: string
  medicine: string
  batch: string
  qty: number
  expiry: string
  supplier: string | null
}

const { t } = useI18n()
const toast = useToast()
const notifications = useNotifications()
const auth = useAuth()

// Pharmacy Clerk ລຶບ batch ໝົດອາຍຸອອກບໍ່ໄດ້ — backend ກັນໄວ້ແລ້ວ, ນີ້ແມ່ນເສີມ UX
const canRemove = computed(() => auth.user?.role !== 'PHARMACY_CLERK')

const batches = ref<BatchRow[]>([])

async function load() {
  try {
    const { data } = await api.get<BatchRow[]>('/batches')
    batches.value = data
  } catch {
    toast.show(t('toasts.expiry.loadFailed'), 'error')
  }
}
onMounted(load)

// ຄິດໄລ່ວັນທີ່ເຫຼືອຈາກວັນທີຈິງ — ນີ້ຄືເຫດຜົນທີ່ບໍ່ບັນທຶກສະຖານະໄວ້ໃນ database
const rows = computed(() =>
  batches.value
    .map((e) => {
      const days = daysUntil(e.expiry)
      return { ...e, daysRemaining: days, status: expiryStatus(days) }
    })
    // ອັນທີ່ໃກ້ໝົດອາຍຸທີ່ສຸດຂຶ້ນກ່ອນ — ນີ້ຄືສິ່ງທີ່ຕ້ອງຈັດການດ່ວນ
    .sort((a, b) => a.daysRemaining - b.daysRemaining),
)

const expired = computed(() => rows.value.filter((e) => e.status === 'Expired').length)
const critical = computed(() => rows.value.filter((e) => e.status === 'Critical').length)
const expiringSoon = computed(() => rows.value.filter((e) => e.status === 'Expiring Soon').length)
const safe = computed(() => rows.value.filter((e) => e.status === 'Safe').length)

// ມູນຄ່າທີ່ອາດເສຍຫາຍ — ຕົວເລກທີ່ເຈົ້າຂອງຮ້ານສົນໃຈທີ່ສຸດ
const atRiskQty = computed(() =>
  rows.value.filter((e) => e.status !== 'Safe').reduce((s, e) => s + e.qty, 0),
)

const TAB_VALUES = ['All', 'Expired', 'Critical', 'Expiring Soon', 'Safe']
const TABS = computed(() =>
  TAB_VALUES.map((v) => ({ value: v, label: v === 'All' ? t('pages.prescriptions.allStatuses') : t(`status.${v}`) })),
)
const activeTab = ref('All')

const filtered = computed(() =>
  activeTab.value === 'All' ? rows.value : rows.value.filter((e) => e.status === activeTab.value),
)

type Row = (typeof rows.value)[number]

// ລຶບ batch ໝົດອາຍຸອອກຈາກສະຕັອກ — batch ນີ້ຄື batch ໝົດອາຍຸໄວທີ່ສຸດຂອງຢານີ້ຢູ່ແລ້ວ
// (ຮຽງ FEFO), ຈຶ່ງຫັກ quantity ທັງໝົດຂອງມັນຜ່ານ stock-movements ແບບ FEFO ໄດ້ຖືກຕ້ອງ
async function onRemove(row: Row) {
  try {
    await api.post('/stock-movements', {
      medicineId: row.medicineId,
      type: 'EXPIRED',
      quantity: row.qty,
      reason: `Expired batch ${row.batch} removed`,
    })
    toast.show(t('toasts.expiry.removed', { name: row.medicine }), 'success')
    await load()
  } catch (e: any) {
    toast.show(apiErrorMessage(e, t) || t('toasts.expiry.removeFailed'), 'error')
  }
}

async function onNotify(row: Row) {
  try {
    await api.post('/notifications', {
      type: 'WARNING',
      title: `${row.medicine} expiring soon`,
      message: `Batch ${row.batch} (${row.qty} units) expires in ${row.daysRemaining} day(s) — flagged by staff, follow up with ${row.supplier ?? 'supplier'}.`,
    })
    await notifications.load()
    toast.show(t('toasts.expiry.notified', { name: row.medicine }), 'success')
  } catch (e: any) {
    toast.show(apiErrorMessage(e, t) || t('toasts.expiry.notifyFailed'), 'error')
  }
}

</script>

<template>
  <div class="space-y-5">
    <PageHeader :title="t('pages.expiry.title')" :subtitle="t('pages.expiry.subtitle')">
      <template #actions>
        <Button variant="outline">{{ t('common.exportReport') }}</Button>
      </template>
    </PageHeader>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard :title="t('status.Expired')" :value="expired" color="red">
        <template #icon><XCircle class="w-5 h-5" /></template>
      </StatCard>
      <StatCard :title="t('pages.expiry.criticalDays')" :value="critical" color="red">
        <template #icon><AlertTriangle class="w-5 h-5" /></template>
      </StatCard>
      <StatCard :title="t('pages.expiry.expiringSoonDays')" :value="expiringSoon" color="amber">
        <template #icon><Clock class="w-5 h-5" /></template>
      </StatCard>
      <StatCard :title="t('pages.expiry.safeStock')" :value="safe" color="green">
        <template #icon><CheckCircle class="w-5 h-5" /></template>
      </StatCard>
    </div>

    <div
      v-if="atRiskQty > 0"
      class="flex items-center gap-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl px-4 py-3"
    >
      <AlertTriangle class="w-5 h-5 text-amber-500 flex-shrink-0" />
      <p class="text-sm text-amber-800 dark:text-amber-200">
        {{ t('pages.expiry.atRiskBanner', { qty: atRiskQty }) }}
      </p>
    </div>

    <SectionCard :title="t('pages.expiry.statusOverview')">
      <div class="px-4 pt-3">
        <TabsBar v-model="activeTab" :tabs="TABS" />
      </div>

      <DataTable
        :headers="[
          t('common.medicine'),
          t('pages.expiry.colBatchNumber'),
          t('pages.inventory.quantity'),
          t('common.expiryDate'),
          t('pages.expiry.colDaysRemaining'),
          t('common.supplier'),
          t('common.status'),
          t('pages.expiry.colAction'),
        ]"
      >
        <TableRow v-for="e in filtered" :key="e.id">
          <TableCell><span class="font-medium text-slate-800 dark:text-slate-100">{{ e.medicine }}</span></TableCell>
          <TableCell><span class="font-mono text-xs text-slate-500 dark:text-slate-400">{{ e.batch }}</span></TableCell>
          <TableCell><span class="font-mono">{{ e.qty }}</span></TableCell>
          <TableCell><span class="text-sm">{{ e.expiry }}</span></TableCell>
          <TableCell>
            <span
              class="font-mono text-sm font-bold"
              :class="
                e.daysRemaining < 0
                  ? 'text-red-600'
                  : e.daysRemaining < 30
                    ? 'text-red-500'
                    : e.daysRemaining < 90
                      ? 'text-amber-600'
                      : 'text-emerald-600'
              "
            >
              {{ daysLabel(e.daysRemaining) }}
            </span>
          </TableCell>
          <TableCell><span class="text-sm text-slate-500 dark:text-slate-400">{{ e.supplier }}</span></TableCell>
          <TableCell><StatusBadge kind="expiry" :status="e.status" /></TableCell>
          <TableCell>
            <button
              v-if="e.status === 'Expired' && canRemove"
              class="px-2 py-1 text-xs bg-red-50 dark:bg-red-500/10 text-red-600 rounded hover:bg-red-100 dark:hover:bg-red-500/20 transition border border-red-100 dark:border-red-500/20"
              @click="onRemove(e)"
            >
              {{ t('pages.expiry.remove') }}
            </button>
            <span v-else-if="e.status === 'Expired'" class="text-xs text-slate-300 dark:text-slate-600">—</span>
            <button
              v-else
              class="px-2 py-1 text-xs bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded hover:bg-amber-100 dark:hover:bg-amber-500/20 transition border border-amber-100 dark:border-amber-500/20"
              @click="onNotify(e)"
            >
              {{ t('pages.expiry.notify') }}
            </button>
          </TableCell>
        </TableRow>
      </DataTable>

      <div v-if="filtered.length === 0" class="py-16 text-center text-slate-400 text-sm">
        {{ t('pages.expiry.noResults') }}
      </div>
    </SectionCard>
  </div>
</template>
