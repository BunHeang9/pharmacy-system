<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Eye, Printer } from 'lucide-vue-next'
import api from '@/api/client'
import { useToast } from '@/stores/toast'
import { formatMoney } from '@/utils/money'

import PageHeader from '@/components/ui/PageHeader.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import SearchInput from '@/components/ui/SearchInput.vue'
import Button from '@/components/ui/Button.vue'
import Badge from '@/components/ui/Badge.vue'
import DataTable from '@/components/ui/DataTable.vue'
import TableRow from '@/components/ui/TableRow.vue'
import TableCell from '@/components/ui/TableCell.vue'
import Modal from '@/components/ui/Modal.vue'

interface Sale {
  id: string
  saleNo: string
  date: string
  customer: string
  cashier: string
  items: number
  subtotal: number
  discount: number
  tax: number
  total: number
  paymentMethod: 'CASH' | 'CARD' | 'QR' | 'OTHER'
}
interface SaleLine {
  medicineId: string
  medicine: string
  quantity: number
  unitPrice: number
  lineTotal: number
}
type SaleDetail = Sale & { lines: SaleLine[] }

const { t } = useI18n()
const toast = useToast()

const sales = ref<Sale[]>([])

async function load() {
  try {
    const { data } = await api.get<Sale[]>('/sales')
    sales.value = data
  } catch {
    toast.show(t('toasts.sales.loadFailed'), 'error')
  }
}
onMounted(load)

const search = ref('')
const fromDate = ref('')
const toDate = ref('')
const viewSale = ref<SaleDetail | null>(null)

const filtered = computed(() =>
  sales.value.filter((s) => {
    if (search.value) {
      const q = search.value.toLowerCase()
      if (!s.saleNo.toLowerCase().includes(q) && !s.customer.toLowerCase().includes(q)) return false
    }
    // ວັນທີ ຢູ່ໃນຮູບແບບ ISO ຈຶ່ງປຽບທຽບ 10 ຕົວອັກສອນທຳອິດເປັນ string ໄດ້ເລີຍ
    const day = s.date.slice(0, 10)
    if (fromDate.value && day < fromDate.value) return false
    if (toDate.value && day > toDate.value) return false
    return true
  }),
)

// ຕົວເລກສະຫຼຸບ ຄິດຈາກຜົນທີ່ກອງແລ້ວ ບໍ່ແມ່ນທັງໝົດ — ຈຶ່ງຈະກົງກັບສິ່ງທີ່ເຫັນ
const totalRevenue = computed(() => filtered.value.reduce((s, x) => s + x.total, 0))
const avgSale = computed(() => (filtered.value.length ? totalRevenue.value / filtered.value.length : 0))

async function openView(s: Sale) {
  try {
    const { data } = await api.get<SaleDetail>(`/sales/${s.id}`)
    viewSale.value = data
  } catch {
    toast.show(t('toasts.sales.detailFailed'), 'error')
  }
}

function printInvoice() {
  // ໃຊ້ການພິມຂອງ browser — CSS .no-print ເຊື່ອງ sidebar/header ໄວ້ແລ້ວ
  window.print()
}

const money = formatMoney
const paymentMethodLabel = (m: string) => t(`pages.pos.paymentMethods.${m.toLowerCase()}`)
</script>

<template>
  <div class="space-y-5">
    <PageHeader :title="t('pages.sales.title')" :subtitle="t('pages.sales.subtitle')">
      <template #actions>
        <Button variant="outline">{{ t('common.exportPdf') }}</Button>
        <Button variant="outline">{{ t('common.exportExcel') }}</Button>
      </template>
    </PageHeader>

    <div class="grid grid-cols-3 gap-4">
      <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
        <div class="text-xs text-slate-500 dark:text-slate-400 font-medium">{{ t('pages.sales.totalSales') }}</div>
        <div class="text-xl font-bold text-slate-800 dark:text-slate-100 font-display mt-1">{{ filtered.length }}</div>
        <div class="text-xs text-slate-400 mt-0.5">{{ t('pages.sales.matchingFilters') }}</div>
      </div>
      <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
        <div class="text-xs text-slate-500 dark:text-slate-400 font-medium">{{ t('pages.sales.revenue') }}</div>
        <div class="text-xl font-bold text-slate-800 dark:text-slate-100 font-display mt-1">{{ money(totalRevenue) }}</div>
        <div class="text-xs text-slate-400 mt-0.5">{{ t('pages.sales.matchingFilters') }}</div>
      </div>
      <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
        <div class="text-xs text-slate-500 dark:text-slate-400 font-medium">{{ t('pages.sales.avgSale') }}</div>
        <div class="text-xl font-bold text-slate-800 dark:text-slate-100 font-display mt-1">{{ money(avgSale) }}</div>
        <div class="text-xs text-slate-400 mt-0.5">{{ t('pages.sales.matchingFilters') }}</div>
      </div>
    </div>

    <SectionCard>
      <div class="p-4 flex flex-wrap gap-3 items-center">
        <SearchInput v-model="search" :placeholder="t('pages.sales.searchPlaceholder')" />
        <input
          v-model="fromDate"
          type="date"
          class="px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        />
        <input
          v-model="toDate"
          type="date"
          class="px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        />
      </div>

      <DataTable
        :headers="[
          t('pages.sales.colInvoiceNo'), t('common.date'), t('common.customer'), t('pages.reports.colCashier'), t('pages.purchases.colItems'), t('common.subtotal'),
          t('common.discount'), t('common.tax'), t('common.total'), t('pages.sales.colMethod'), t('common.actions'),
        ]"
      >
        <TableRow v-for="s in filtered" :key="s.id">
          <TableCell><span class="font-mono text-xs text-blue-600 font-medium">{{ s.saleNo }}</span></TableCell>
          <TableCell><span class="text-xs text-slate-500 dark:text-slate-400">{{ s.date.slice(0, 10) }}</span></TableCell>
          <TableCell><span class="text-sm font-medium text-slate-700 dark:text-slate-200">{{ s.customer }}</span></TableCell>
          <TableCell><span class="text-sm text-slate-500 dark:text-slate-400">{{ s.cashier }}</span></TableCell>
          <TableCell><span class="font-mono">{{ s.items }}</span></TableCell>
          <TableCell><span class="font-mono">{{ money(s.subtotal) }}</span></TableCell>
          <TableCell>
            <span class="font-mono text-red-500">{{ s.discount > 0 ? `-${money(s.discount)}` : '—' }}</span>
          </TableCell>
          <TableCell><span class="font-mono">{{ money(s.tax) }}</span></TableCell>
          <TableCell><span class="font-mono font-semibold text-slate-800 dark:text-slate-100">{{ money(s.total) }}</span></TableCell>
          <TableCell><Badge variant="muted">{{ paymentMethodLabel(s.paymentMethod) }}</Badge></TableCell>
          <TableCell>
            <div class="flex gap-1">
              <button class="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded text-blue-500 transition" @click="openView(s)">
                <Eye class="w-4 h-4" />
              </button>
              <button class="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded text-slate-400 transition" @click="printInvoice">
                <Printer class="w-4 h-4" />
              </button>
            </div>
          </TableCell>
        </TableRow>
      </DataTable>

      <div v-if="filtered.length === 0" class="py-16 text-center text-slate-400 text-sm">
        {{ t('pages.sales.noResults') }}
      </div>

      <div class="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700">
        <span class="text-xs text-slate-500 dark:text-slate-400">{{ t('pages.sales.showingRecords', { n: filtered.length }) }}</span>
      </div>
    </SectionCard>

    <!-- ໃບບິນ -->
    <Modal :open="viewSale !== null" :title="t('pages.sales.saleInvoice')" size="lg" @update:open="(v) => !v && (viewSale = null)">
      <div v-if="viewSale" class="space-y-4">
        <div class="flex justify-between items-start pb-4 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h2 class="font-bold text-slate-800 dark:text-slate-100 font-mono">{{ viewSale.saleNo }}</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">{{ viewSale.date.slice(0, 16).replace('T', ' ') }}</p>
          </div>
          <Badge variant="muted">{{ paymentMethodLabel(viewSale.paymentMethod) }}</Badge>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <div class="text-xs text-slate-400 mb-1">{{ t('common.customer') }}</div>
            <div class="font-medium text-slate-800 dark:text-slate-100">{{ viewSale.customer }}</div>
          </div>
          <div>
            <div class="text-xs text-slate-400 mb-1">{{ t('pages.reports.colCashier') }}</div>
            <div class="font-medium text-slate-800 dark:text-slate-100">{{ viewSale.cashier }}</div>
          </div>
        </div>

        <DataTable :headers="[t('pages.sales.colItem'), t('pages.purchases.colQty'), t('pages.sales.colPrice'), t('common.total')]">
          <TableRow v-for="(l, idx) in viewSale.lines" :key="idx">
            <TableCell>{{ l.medicine }}</TableCell>
            <TableCell><span class="font-mono">{{ l.quantity }}</span></TableCell>
            <TableCell><span class="font-mono">{{ money(l.unitPrice) }}</span></TableCell>
            <TableCell><span class="font-mono">{{ money(l.lineTotal) }}</span></TableCell>
          </TableRow>
        </DataTable>

        <div class="space-y-1 border-t border-slate-100 dark:border-slate-700 pt-3">
          <div class="flex justify-between text-sm text-slate-600 dark:text-slate-300">
            <span>{{ t('common.subtotal') }}</span><span class="font-mono">{{ money(viewSale.subtotal) }}</span>
          </div>
          <div class="flex justify-between text-sm text-slate-600 dark:text-slate-300">
            <span>{{ t('common.discount') }}</span><span class="font-mono text-red-500">-{{ money(viewSale.discount) }}</span>
          </div>
          <div class="flex justify-between text-sm text-slate-600 dark:text-slate-300">
            <span>{{ t('common.tax') }}</span><span class="font-mono">{{ money(viewSale.tax) }}</span>
          </div>
          <div class="flex justify-between text-base font-bold text-slate-800 dark:text-slate-100 pt-1">
            <span>{{ t('common.total') }}</span><span class="font-mono text-blue-600">{{ money(viewSale.total) }}</span>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <Button variant="outline" @click="viewSale = null">{{ t('pages.sales.close') }}</Button>
          <Button variant="outline" @click="printInvoice"><Printer class="w-4 h-4" /> {{ t('pages.sales.print') }}</Button>
        </div>
      </div>
    </Modal>
  </div>
</template>
