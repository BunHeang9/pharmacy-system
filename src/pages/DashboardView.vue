<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Bar, Doughnut, Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title, Tooltip, Legend,
  BarElement, ArcElement, LineElement, PointElement,
  CategoryScale, LinearScale,
} from 'chart.js'
import {
  Pill, AlertTriangle, Clock,
  ShoppingCart, TrendingUp, Users, FileText,
} from 'lucide-vue-next'

import api from '@/api/client'
import { daysUntil, expiryStatus } from '@/utils/expiry'
import { formatMoney, formatCompactMoney } from '@/utils/money'
import { useToast } from '@/stores/toast'
import { useAuth } from '@/stores/auth'

import StatCard from '@/components/ui/StatCard.vue'
import KipIcon from '@/components/ui/KipIcon.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import DataTable from '@/components/ui/DataTable.vue'
import TableRow from '@/components/ui/TableRow.vue'
import TableCell from '@/components/ui/TableCell.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import Button from '@/components/ui/Button.vue'

// Chart.js ຕ້ອງ register ສ່ວນທີ່ໃຊ້ກ່ອນ ບໍ່ດັ່ງນັ້ນ chart ຈະບໍ່ຂຶ້ນ
ChartJS.register(
  Title, Tooltip, Legend,
  BarElement, ArcElement, LineElement, PointElement,
  CategoryScale, LinearScale,
)

interface Medicine {
  id: string
  name: string
  category: string | null
  stock: number
  minStock: number
  status: string
}
interface BatchRow {
  id: string
  medicine: string
  batch: string
  qty: number
  expiry: string
}
interface Summary {
  salesByDay: { day: string; sales: number; purchases: number }[]
  salesByMonth: { month: string; sales: number }[]
  categoryShare: { name: string; value: number }[]
}

const router = useRouter()
const { t } = useI18n()
const toast = useToast()
const auth = useAuth()

// Pharmacy Clerk ເຫັນບໍ່ໄດ້ /reports ແລະ /prescriptions (backend ກັນໄວ້ແລ້ວ) — dashboard ຈຶ່ງບໍ່ເອີ້ນ 2 endpoint ນີ້ໃຫ້ລາວ
const isClerk = computed(() => auth.user?.role === 'PHARMACY_CLERK')

const medicines = ref<Medicine[]>([])
const batches = ref<BatchRow[]>([])
const summary = ref<Summary | null>(null)
const totalCustomers = ref(0)
const pendingPrescriptions = ref(0)

async function loadAll() {
  try {
    const [medsRes, batchesRes, custRes] = await Promise.all([
      api.get<Medicine[]>('/medicines'),
      api.get<BatchRow[]>('/batches'),
      api.get<{ id: string }[]>('/customers'),
    ])
    medicines.value = medsRes.data
    batches.value = batchesRes.data
    totalCustomers.value = custRes.data.length

    if (!isClerk.value) {
      const [summaryRes, rxRes] = await Promise.all([
        api.get<Summary>('/reports/summary', { params: { period: 'week' } }),
        api.get<{ status: string }[]>('/prescriptions'),
      ])
      summary.value = summaryRes.data
      pendingPrescriptions.value = rxRes.data.filter((p) => p.status === 'PENDING').length
    }
  } catch {
    toast.show(t('toasts.dashboard.loadFailed'), 'error')
  }
}
onMounted(loadAll)

const lowStock = computed(() => medicines.value.filter((m) => m.stock < m.minStock))

// ຄິດວັນທີ່ເຫຼືອຈາກວັນຈິງ ຄືກັບໜ້າ Expiry
const expiringAll = computed(() =>
  batches.value
    .map((e) => {
      const days = daysUntil(e.expiry)
      return { ...e, daysRemaining: days, status: expiryStatus(days) }
    })
    .filter((e) => e.status !== 'Safe')
    .sort((a, b) => a.daysRemaining - b.daysRemaining),
)
const expiringRows = computed(() => expiringAll.value.slice(0, 5))

const money = formatMoney

// "ມື້ນີ້" ຄືລາຍການສຸດທ້າຍຂອງ salesByDay (7 ມື້ຫຼ້າສຸດ, ຮຽງເກົ່າ→ໃໝ່)
const today = computed(() => {
  const days = summary.value?.salesByDay ?? []
  return days[days.length - 1]
})
const todaySales = computed(() => today.value?.sales ?? 0)
const todayPurchases = computed(() => today.value?.purchases ?? 0)
const todayProfit = computed(() => todaySales.value - todayPurchases.value)

/* ---------- Bar: Sales vs Purchases (ອາທິດນີ້) ---------- */
const barData = computed(() => ({
  labels: (summary.value?.salesByDay ?? []).map((d) => d.day),
  datasets: [
    { label: t('common.sales'), data: (summary.value?.salesByDay ?? []).map((d) => d.sales), backgroundColor: '#1d6fcd', borderRadius: 4 },
    { label: t('common.purchases'), data: (summary.value?.salesByDay ?? []).map((d) => d.purchases), backgroundColor: '#0d9488', borderRadius: 4 },
  ],
}))

const barOptions = {
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

/* ---------- Doughnut: Sales by Category ---------- */
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
const donutData = computed(() => ({
  labels: categoryShare.value.map((c) => c.name),
  datasets: [{ data: categoryShare.value.map((c) => c.value), backgroundColor: categoryShare.value.map((c) => c.color), borderWidth: 0 }],
}))

const donutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '65%',
  plugins: {
    legend: { display: false }, // ໃຊ້ legend ຂອງເຮົາເອງລຸ່ມ chart
    tooltip: { callbacks: { label: (c: any) => ` ${c.label}: ${c.parsed}%` } },
  },
}

/* ---------- Line: Monthly Trend ---------- */
const lineData = computed(() => ({
  labels: (summary.value?.salesByMonth ?? []).map((d) => d.month),
  datasets: [
    {
      label: t('common.sales'),
      data: (summary.value?.salesByMonth ?? []).map((d) => d.sales),
      borderColor: '#1d6fcd',
      backgroundColor: '#1d6fcd',
      borderWidth: 2.5,
      pointRadius: 4,
      pointHoverRadius: 6,
      tension: 0.3,
    },
  ],
}))

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
</script>

<template>
  <div class="space-y-6">
    <!-- ບັດສະຫຼຸບ -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard :title="t('pages.dashboard.totalMedicines')" :value="medicines.length" color="blue">
        <template #icon><Pill class="w-5 h-5" /></template>
      </StatCard>
      <StatCard :title="t('pages.dashboard.lowStockItems')" :value="lowStock.length" color="amber">
        <template #icon><AlertTriangle class="w-5 h-5" /></template>
      </StatCard>
      <StatCard :title="t('pages.dashboard.expiringSoon')" :value="expiringAll.length" color="red">
        <template #icon><Clock class="w-5 h-5" /></template>
      </StatCard>
      <StatCard v-if="isClerk" :title="t('pages.dashboard.totalCustomers')" :value="totalCustomers" color="blue">
        <template #icon><Users class="w-5 h-5" /></template>
      </StatCard>
      <StatCard v-else :title="t('pages.dashboard.todaySales')" :value="money(todaySales)" color="green">
        <template #icon><KipIcon class="w-5 h-5" /></template>
      </StatCard>
    </div>

    <!-- ຂໍ້ມູນລາຍໄດ້/ກຳໄລ — Pharmacy Clerk ເຫັນບໍ່ໄດ້ (backend ກັນ /reports ແລະ /prescriptions ໄວ້ແລ້ວ) -->
    <div v-if="!isClerk" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard :title="t('pages.dashboard.todayPurchases')" :value="money(todayPurchases)" color="teal">
        <template #icon><ShoppingCart class="w-5 h-5" /></template>
      </StatCard>
      <StatCard :title="t('pages.dashboard.todayProfit')" :value="money(todayProfit)" color="purple">
        <template #icon><TrendingUp class="w-5 h-5" /></template>
      </StatCard>
      <StatCard :title="t('pages.dashboard.totalCustomers')" :value="totalCustomers" color="blue">
        <template #icon><Users class="w-5 h-5" /></template>
      </StatCard>
      <StatCard :title="t('pages.dashboard.pendingPrescriptions')" :value="pendingPrescriptions" color="amber">
        <template #icon><FileText class="w-5 h-5" /></template>
      </StatCard>
    </div>

    <!-- ແຖວ chart — ອີງໃສ່ /reports/summary, Pharmacy Clerk ເຫັນບໍ່ໄດ້ -->
    <div v-if="!isClerk" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <SectionCard :title="t('pages.dashboard.weeklySalesPurchases')" class="lg:col-span-2">
        <div class="p-5">
          <div class="h-[220px]">
            <Bar :data="barData" :options="barOptions" />
          </div>
        </div>
      </SectionCard>

      <SectionCard :title="t('pages.dashboard.salesByCategory')">
        <div class="p-5">
          <div class="h-[220px]">
            <Doughnut :data="donutData" :options="donutOptions" />
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

    <SectionCard v-if="!isClerk" :title="t('pages.dashboard.monthlySalesTrend')">
      <div class="p-5">
        <div class="h-[160px]">
          <Line :data="lineData" :options="lineOptions" />
        </div>
      </div>
    </SectionCard>

    <!-- ແຖວຕາຕະລາງ -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SectionCard :title="t('pages.dashboard.lowStockMedicines')">
        <template #action>
          <Button variant="ghost" size="sm" @click="router.push('/inventory')">{{ t('pages.dashboard.viewAll') }}</Button>
        </template>
        <DataTable :headers="[t('common.medicine'), t('common.category'), t('pages.dashboard.stock'), t('pages.dashboard.minStock'), t('common.status')]">
          <TableRow v-for="m in lowStock" :key="m.id">
            <TableCell><span class="font-medium text-slate-800 dark:text-slate-100">{{ m.name }}</span></TableCell>
            <TableCell>{{ m.category }}</TableCell>
            <TableCell><span class="font-mono text-sm font-medium text-red-600">{{ m.stock }}</span></TableCell>
            <TableCell><span class="font-mono text-sm text-slate-500 dark:text-slate-400">{{ m.minStock }}</span></TableCell>
            <TableCell><StatusBadge kind="stock" :status="m.status" /></TableCell>
          </TableRow>
        </DataTable>
      </SectionCard>

      <SectionCard :title="t('pages.dashboard.expiringMedicines')">
        <template #action>
          <Button variant="ghost" size="sm" @click="router.push('/expiry')">{{ t('pages.dashboard.viewAll') }}</Button>
        </template>
        <DataTable :headers="[t('common.medicine'), t('common.batch'), t('pages.dashboard.expiry'), t('pages.dashboard.days'), t('common.status')]">
          <TableRow v-for="e in expiringRows" :key="e.id">
            <TableCell><span class="font-medium text-slate-800 dark:text-slate-100">{{ e.medicine }}</span></TableCell>
            <TableCell><span class="font-mono text-xs text-slate-500 dark:text-slate-400">{{ e.batch }}</span></TableCell>
            <TableCell><span class="text-sm">{{ e.expiry }}</span></TableCell>
            <TableCell>
              <span
                class="font-mono text-sm font-medium"
                :class="e.daysRemaining < 0 ? 'text-red-600' : e.daysRemaining < 30 ? 'text-amber-600' : 'text-slate-600 dark:text-slate-300'"
              >
                {{ e.daysRemaining < 0 ? t('pages.dashboard.daysAgo', { n: Math.abs(e.daysRemaining) }) : t('pages.dashboard.daysShort', { n: e.daysRemaining }) }}
              </span>
            </TableCell>
            <TableCell><StatusBadge kind="expiry" :status="e.status" /></TableCell>
          </TableRow>
        </DataTable>
      </SectionCard>
    </div>
  </div>
</template>
