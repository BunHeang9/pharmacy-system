<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Bar, Line, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title, Tooltip, Legend,
  BarElement, LineElement, PointElement, ArcElement,
  CategoryScale, LinearScale,
} from 'chart.js'
import {
  ShoppingCart, TrendingUp, ReceiptText, Download,
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

import api from '@/api/client'
import { daysUntil, expiryStatus, daysLabel } from '@/utils/expiry'
import { formatMoney, formatCompactMoney } from '@/utils/money'
import { useToast } from '@/stores/toast'
import { downloadCsv } from '@/utils/csv'
import { downloadExcel } from '@/utils/excel'
import { downloadPdf } from '@/utils/pdf'
import KipIcon from '@/components/ui/KipIcon.vue'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import StatCard from '@/components/ui/StatCard.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import DataTable from '@/components/ui/DataTable.vue'
import TableRow from '@/components/ui/TableRow.vue'
import TableCell from '@/components/ui/TableCell.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import Badge from '@/components/ui/Badge.vue'
import SelectInput from '@/components/ui/SelectInput.vue'
import Button from '@/components/ui/Button.vue'
import TabsBar from '@/components/ui/TabsBar.vue'

// Chart.js ຕ້ອງ register ສ່ວນທີ່ໃຊ້ກ່ອນ ບໍ່ດັ່ງນັ້ນ chart ຈະບໍ່ຂຶ້ນ
ChartJS.register(
  Title, Tooltip, Legend,
  BarElement, LineElement, PointElement, ArcElement,
  CategoryScale, LinearScale,
)

interface Medicine {
  id: string
  name: string
  category: string | null
  stock: number
  minStock: number
  purchasePrice: number
  sellingPrice: number
  status: string
}
interface BatchRow {
  id: string
  medicineId: string
  medicine: string
  batch: string
  qty: number
  expiry: string
  supplier: string | null
}
interface Sale {
  id: string
  saleNo: string
  date: string
  customer: string
  cashier: string
  items: number
  total: number
  paymentMethod: string
}
interface Summary {
  period: string
  totalSales: number
  totalPurchases: number
  grossProfit: number
  txnCount: number
  salesByDay: { day: string; sales: number; purchases: number }[]
  salesByMonth: { month: string; sales: number }[]
  categoryShare: { name: string; value: number }[]
}

const { t } = useI18n()
const toast = useToast()
const money = formatMoney
const paymentMethodLabel = (m: string) => t(`pages.pos.paymentMethods.${m.toLowerCase()}`)

const period = ref('month')
const periodOptions = computed(() => [
  { value: 'week', label: t('pages.reports.periods.week') },
  { value: 'month', label: t('pages.reports.periods.month') },
  { value: 'quarter', label: t('pages.reports.periods.quarter') },
  { value: 'year', label: t('pages.reports.periods.year') },
])

const summary = ref<Summary | null>(null)
const medicines = ref<Medicine[]>([])
const batches = ref<BatchRow[]>([])
const sales = ref<Sale[]>([])

async function loadSummary() {
  try {
    const { data } = await api.get<Summary>('/reports/summary', { params: { period: period.value } })
    summary.value = data
  } catch {
    toast.show(t('toasts.reports.loadFailed'), 'error')
  }
}
async function loadAll() {
  try {
    const [medsRes, batchesRes, salesRes] = await Promise.all([
      api.get<Medicine[]>('/medicines'),
      api.get<BatchRow[]>('/batches'),
      api.get<Sale[]>('/sales'),
    ])
    medicines.value = medsRes.data
    batches.value = batchesRes.data
    sales.value = salesRes.data
  } catch {
    toast.show(t('toasts.reports.loadFailed'), 'error')
  }
}
onMounted(() => {
  loadSummary()
  loadAll()
})
watch(period, loadSummary)

const TAB_VALUES = ['Sales', 'Stock', 'Expiry']
const TABS = computed(() => TAB_VALUES.map((v) => ({ value: v, label: t(`pages.reports.tabs.${v}`) })))
const activeTab = ref('Sales')

/* ---------- ບັດສະຫຼຸບດ້ານເທິງ — ຕົວເລກມາຈາກ /api/reports/summary ທັງໝົດ ---------- */
const totalSales = computed(() => summary.value?.totalSales ?? 0)
const totalPurchases = computed(() => summary.value?.totalPurchases ?? 0)
const grossProfit = computed(() => summary.value?.grossProfit ?? 0)
const txnCount = computed(() => summary.value?.txnCount ?? 0)

/* ---------- Sales: bar ຂາຍ vs ຊື້ ລາຍອາທິດ ---------- */
const salesBar = computed(() => ({
  labels: (summary.value?.salesByDay ?? []).map((d) => d.day),
  datasets: [
    { label: t('common.sales'), data: (summary.value?.salesByDay ?? []).map((d) => d.sales), backgroundColor: '#1d6fcd', borderRadius: 4 },
    { label: t('common.purchases'), data: (summary.value?.salesByDay ?? []).map((d) => d.purchases), backgroundColor: '#0d9488', borderRadius: 4 },
  ],
}))

/* ---------- Sales: line ແນວໂນ້ມລາຍເດືອນ ---------- */
const salesLine = computed(() => ({
  labels: (summary.value?.salesByMonth ?? []).map((m) => m.month),
  datasets: [
    {
      label: t('common.sales'),
      data: (summary.value?.salesByMonth ?? []).map((m) => m.sales),
      borderColor: '#1d6fcd',
      backgroundColor: '#1d6fcd',
      borderWidth: 2.5,
      pointRadius: 4,
      pointHoverRadius: 6,
      tension: 0.3,
    },
  ],
}))

/* ---------- Sales: ສ່ວນແບ່ງຕາມໝວດ — server ສົ່ງມູນຄ່າດິບ, client ຄິດ % ແລະ ໃສ່ສີເອງ ---------- */
const CATEGORY_COLORS = ['#1d6fcd', '#0d9488', '#8b5cf6', '#f59e0b', '#ef4444', '#64748b', '#ec4899', '#22c55e']
const categoryShare = computed(() => {
  const items = summary.value?.categoryShare ?? []
  const total = items.reduce((s, c) => s + c.value, 0)
  return items.map((c, i) => ({
    ...c,
    pct: total > 0 ? Math.round((c.value / total) * 100) : 0,
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }))
})
const categoryDonut = computed(() => ({
  labels: categoryShare.value.map((c) => c.name),
  datasets: [{ data: categoryShare.value.map((c) => c.value), backgroundColor: categoryShare.value.map((c) => c.color), borderWidth: 0 }],
}))

/* ---------- Stock: ມູນຄ່າສະຕັອກຕາມໝວດ (ລາຄາທຶນ) ---------- */
const stockByCategory = computed(() => {
  const map = new Map<string, number>()
  for (const m of medicines.value) {
    const cat = m.category ?? 'Other'
    map.set(cat, (map.get(cat) ?? 0) + m.stock * m.purchasePrice)
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
})

const stockValueCost = computed(() => medicines.value.reduce((s, m) => s + m.stock * m.purchasePrice, 0))
const stockValueRetail = computed(() => medicines.value.reduce((s, m) => s + m.stock * m.sellingPrice, 0))

const stockBar = computed(() => ({
  labels: stockByCategory.value.map((c) => c.name),
  datasets: [
    { label: t('pages.reports.stockValueCostLabel'), data: stockByCategory.value.map((c) => Math.round(c.value)), backgroundColor: '#1d6fcd', borderRadius: 4 },
  ],
}))

const lowStock = computed(() => medicines.value.filter((m) => m.stock < m.minStock))

/* ---------- Expiry: ຄິດວັນທີ່ເຫຼືອຈາກວັນຈິງ ແລ້ວແບ່ງກຸ່ມ ---------- */
const expiryRows = computed(() =>
  batches.value
    .map((e) => {
      const days = daysUntil(e.expiry)
      return { ...e, daysRemaining: days, status: expiryStatus(days) }
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining),
)

const expiryBuckets = computed(() => {
  const b = { Expired: 0, Critical: 0, 'Expiring Soon': 0, Safe: 0 }
  for (const e of expiryRows.value) b[e.status]++
  return b
})

const atRisk = computed(() => expiryRows.value.filter((e) => e.status !== 'Safe'))

const expiryBar = computed(() => ({
  labels: [t('status.Expired'), t('status.Critical'), t('status.Expiring Soon'), t('status.Safe')],
  datasets: [
    {
      label: t('pages.reports.batches'),
      data: [
        expiryBuckets.value.Expired,
        expiryBuckets.value.Critical,
        expiryBuckets.value['Expiring Soon'],
        expiryBuckets.value.Safe,
      ],
      backgroundColor: ['#ef4444', '#f97316', '#f59e0b', '#10b981'],
      borderRadius: 4,
    },
  ],
}))

/* ---------- ຕົວເລືອກ chart ຮ່ວມ ---------- */
const moneyBarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' as const, labels: { boxWidth: 12, font: { size: 12 } } },
    tooltip: { callbacks: { label: (c: any) => ` ${c.dataset.label}: ${money(c.parsed.y)}` } },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 12 } } },
    y: {
      grid: { color: '#f1f5f9' },
      ticks: { color: '#64748b', font: { size: 12 }, callback: (v: any) => formatCompactMoney(v) },
    },
  },
}

const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: (c: any) => ` Sales: ${money(c.parsed.y)}` } },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 12 } } },
    y: {
      grid: { color: '#f1f5f9' },
      ticks: { color: '#64748b', font: { size: 12 }, callback: (v: any) => formatCompactMoney(v) },
    },
  },
}

const donutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '65%',
  plugins: {
    legend: { display: false }, // ໃຊ້ legend ຂອງເຮົາເອງລຸ່ມ chart
    tooltip: { callbacks: { label: (c: any) => ` ${c.label}: ${c.parsed}%` } },
  },
}

const countBarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 12 } } },
    y: {
      grid: { color: '#f1f5f9' },
      ticks: { color: '#64748b', font: { size: 12 }, precision: 0, stepSize: 1 },
      beginAtZero: true,
    },
  },
}

// ຄິດຫົວຖັນ + ແຖວຂໍ້ມູນຄັ້ງດຽວ — ໃຊ້ຮ່ວມກັນລະຫວ່າງ CSV ແລະ Excel ບໍ່ໃຫ້ຕ້ອງຂຽນຊ້ຳ
function reportTable(): { baseName: string; headers: string[]; rows: (string | number)[][] } {
  if (activeTab.value === 'Sales') {
    return {
      baseName: `sales-report-${period.value}`,
      headers: ['Invoice', 'Date', 'Customer', 'Cashier', 'Items', 'Total', 'Payment'],
      rows: sales.value.map((s) => [s.saleNo, s.date.slice(0, 10), s.customer, s.cashier, s.items, s.total, s.paymentMethod]),
    }
  }
  if (activeTab.value === 'Stock') {
    return {
      baseName: 'stock-report',
      headers: ['Medicine', 'Category', 'Stock', 'Min Stock', 'Reorder Value', 'Status'],
      rows: lowStock.value.map((m) => [m.name, m.category ?? '', m.stock, m.minStock, Math.max(0, m.minStock - m.stock) * m.purchasePrice, m.status]),
    }
  }
  return {
    baseName: 'expiry-report',
    headers: ['Medicine', 'Batch', 'Qty', 'Expiry Date', 'Days Remaining', 'Supplier', 'Status'],
    rows: atRisk.value.map((e) => [e.medicine, e.batch, e.qty, e.expiry, e.daysRemaining, e.supplier ?? '', e.status]),
  }
}

function exportCsv() {
  const stamp = new Date().toISOString().slice(0, 10)
  const { baseName, headers, rows } = reportTable()
  downloadCsv(`${baseName}-${stamp}.csv`, headers, rows)
  toast.show(t('toasts.reports.exported'), 'success')
}

async function exportExcel() {
  const stamp = new Date().toISOString().slice(0, 10)
  const { baseName, headers, rows } = reportTable()
  await downloadExcel(`${baseName}-${stamp}.xlsx`, activeTab.value, headers, rows)
  toast.show(t('toasts.reports.exported'), 'success')
}

async function exportPdf() {
  const stamp = new Date().toISOString().slice(0, 10)
  const { baseName, headers, rows } = reportTable()
  await downloadPdf(`${baseName}-${stamp}.pdf`, `${activeTab.value} Report — ${stamp}`, headers, rows)
  toast.show(t('toasts.reports.exported'), 'success')
}

</script>

<template>
  <div class="space-y-5">
    <PageHeader :title="t('pages.reports.title')" :subtitle="t('pages.reports.subtitle')">
      <template #actions>
        <div class="w-40">
          <SelectInput v-model="period" :options="periodOptions" />
        </div>
        <DropdownMenu :items="[{ label: t('common.exportCsv'), onClick: exportCsv }, { label: t('common.exportExcel'), onClick: exportExcel }, { label: t('common.exportPdf'), onClick: exportPdf }]">
          <template #trigger>
            <Button variant="outline">
              <Download class="w-4 h-4" /> {{ t('pages.reports.export') }}
            </Button>
          </template>
        </DropdownMenu>
      </template>
    </PageHeader>

    <!-- ບັດສະຫຼຸບ -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard :title="t('pages.reports.totalSales')" :value="money(totalSales)" color="blue">
        <template #icon><KipIcon class="w-5 h-5" /></template>
      </StatCard>
      <StatCard :title="t('pages.reports.totalPurchases')" :value="money(totalPurchases)" color="teal">
        <template #icon><ShoppingCart class="w-5 h-5" /></template>
      </StatCard>
      <StatCard :title="t('pages.reports.grossProfit')" :value="money(grossProfit)" color="green">
        <template #icon><TrendingUp class="w-5 h-5" /></template>
      </StatCard>
      <StatCard :title="t('pages.reports.transactions')" :value="txnCount" color="purple">
        <template #icon><ReceiptText class="w-5 h-5" /></template>
      </StatCard>
    </div>

    <TabsBar v-model="activeTab" :tabs="TABS" />

    <!-- ============ Sales ============ -->
    <template v-if="activeTab === 'Sales'">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SectionCard :title="t('pages.reports.salesPurchasesThisWeek')" class="lg:col-span-2">
          <div class="p-5">
            <div class="h-[240px]">
              <Bar :data="salesBar" :options="moneyBarOptions" />
            </div>
          </div>
        </SectionCard>

        <SectionCard :title="t('pages.reports.salesByCategory')">
          <div class="p-5">
            <div class="h-[240px]">
              <Doughnut :data="categoryDonut" :options="donutOptions" />
            </div>
            <div class="grid grid-cols-2 gap-1 mt-2">
              <div v-for="c in categoryShare" :key="c.name" class="flex items-center gap-1.5">
                <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ background: c.color }" />
                <span class="text-xs text-slate-600 dark:text-slate-300 truncate">
                  {{ c.name }} <span class="text-slate-400">{{ c.pct }}%</span>
                </span>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard :title="t('pages.reports.monthlySalesTrend')">
        <div class="p-5">
          <div class="h-[180px]">
            <Line :data="salesLine" :options="lineOptions" />
          </div>
        </div>
      </SectionCard>

      <SectionCard :title="t('pages.reports.invoicesInPeriod')">
        <DataTable :headers="[t('pages.reports.colInvoice'), t('common.date'), t('common.customer'), t('pages.reports.colCashier'), t('pages.purchases.colItems'), t('common.total'), t('pages.reports.colPayment')]">
          <TableRow v-for="s in sales" :key="s.id">
            <TableCell><span class="font-mono text-xs text-slate-500 dark:text-slate-400">{{ s.saleNo }}</span></TableCell>
            <TableCell><span class="text-sm">{{ s.date.slice(0, 10) }}</span></TableCell>
            <TableCell><span class="font-medium text-slate-800 dark:text-slate-100">{{ s.customer }}</span></TableCell>
            <TableCell><span class="text-sm text-slate-500 dark:text-slate-400">{{ s.cashier }}</span></TableCell>
            <TableCell><span class="font-mono">{{ s.items }}</span></TableCell>
            <TableCell><span class="font-mono font-medium text-slate-800 dark:text-slate-100">{{ money(s.total) }}</span></TableCell>
            <TableCell><Badge variant="muted">{{ paymentMethodLabel(s.paymentMethod) }}</Badge></TableCell>
          </TableRow>
        </DataTable>
      </SectionCard>
    </template>

    <!-- ============ Stock ============ -->
    <template v-else-if="activeTab === 'Stock'">
      <div class="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard :title="t('pages.reports.stockValueCost')" :value="money(stockValueCost)" color="blue">
          <template #icon><KipIcon class="w-5 h-5" /></template>
        </StatCard>
        <StatCard :title="t('pages.reports.stockValueRetail')" :value="money(stockValueRetail)" color="teal">
          <template #icon><TrendingUp class="w-5 h-5" /></template>
        </StatCard>
        <StatCard :title="t('pages.reports.lowOutOfStock')" :value="lowStock.length" color="amber">
          <template #icon><ShoppingCart class="w-5 h-5" /></template>
        </StatCard>
      </div>

      <SectionCard :title="t('pages.reports.stockValueByCategory')">
        <div class="p-5">
          <div class="h-[260px]">
            <Bar :data="stockBar" :options="moneyBarOptions" />
          </div>
        </div>
      </SectionCard>

      <SectionCard :title="t('pages.reports.lowOutOfStockMedicines')">
        <DataTable :headers="[t('common.medicine'), t('common.category'), t('pages.dashboard.stock'), t('pages.dashboard.minStock'), t('pages.reports.colReorderValue'), t('common.status')]">
          <TableRow v-for="m in lowStock" :key="m.id">
            <TableCell><span class="font-medium text-slate-800 dark:text-slate-100">{{ m.name }}</span></TableCell>
            <TableCell>{{ m.category }}</TableCell>
            <TableCell><span class="font-mono text-sm font-medium text-red-600">{{ m.stock }}</span></TableCell>
            <TableCell><span class="font-mono text-sm text-slate-500 dark:text-slate-400">{{ m.minStock }}</span></TableCell>
            <TableCell>
              <span class="font-mono text-sm text-slate-700 dark:text-slate-200">
                {{ money(Math.max(0, m.minStock - m.stock) * m.purchasePrice) }}
              </span>
            </TableCell>
            <TableCell><StatusBadge kind="stock" :status="m.status" /></TableCell>
          </TableRow>
        </DataTable>
        <div v-if="lowStock.length === 0" class="py-16 text-center text-slate-400 text-sm">
          {{ t('pages.reports.allStockSafe') }}
        </div>
      </SectionCard>
    </template>

    <!-- ============ Expiry ============ -->
    <template v-else>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard :title="t('status.Expired')" :value="expiryBuckets.Expired" color="red" />
        <StatCard :title="t('pages.reports.criticalShort')" :value="expiryBuckets.Critical" color="red" />
        <StatCard :title="t('pages.reports.expiringSoonShort')" :value="expiryBuckets['Expiring Soon']" color="amber" />
        <StatCard :title="t('pages.reports.safe')" :value="expiryBuckets.Safe" color="green" />
      </div>

      <SectionCard :title="t('pages.reports.batchesByExpiryStatus')">
        <div class="p-5">
          <div class="h-[240px]">
            <Bar :data="expiryBar" :options="countBarOptions" />
          </div>
        </div>
      </SectionCard>

      <SectionCard :title="t('pages.reports.atRiskBatches')">
        <DataTable :headers="[t('common.medicine'), t('common.batch'), t('pages.inventory.quantity'), t('common.expiryDate'), t('pages.expiry.colDaysRemaining'), t('common.supplier'), t('common.status')]">
          <TableRow v-for="e in atRisk" :key="e.id">
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
                      : 'text-amber-600'
                "
              >
                {{ daysLabel(e.daysRemaining) }}
              </span>
            </TableCell>
            <TableCell><span class="text-sm text-slate-500 dark:text-slate-400">{{ e.supplier }}</span></TableCell>
            <TableCell><StatusBadge kind="expiry" :status="e.status" /></TableCell>
          </TableRow>
        </DataTable>
        <div v-if="atRisk.length === 0" class="py-16 text-center text-slate-400 text-sm">
          {{ t('pages.reports.noAtRiskBatches') }}
        </div>
      </SectionCard>
    </template>
  </div>
</template>
