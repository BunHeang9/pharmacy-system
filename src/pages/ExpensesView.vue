<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Wallet, TrendingUp } from 'lucide-vue-next'
import api from '@/api/client'
import { useToast } from '@/stores/toast'
import { apiErrorMessage } from '@/lib/apiError'
import { formatMoney } from '@/utils/money'

import PageHeader from '@/components/ui/PageHeader.vue'
import StatCard from '@/components/ui/StatCard.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import DataTable from '@/components/ui/DataTable.vue'
import TableRow from '@/components/ui/TableRow.vue'
import TableCell from '@/components/ui/TableCell.vue'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import Modal from '@/components/ui/Modal.vue'
import SelectInput from '@/components/ui/SelectInput.vue'
import TextInput from '@/components/ui/TextInput.vue'
import KipIcon from '@/components/ui/KipIcon.vue'

type Category = 'OWNER_DRAW' | 'RENT' | 'UTILITIES' | 'SALARIES' | 'OTHER'
interface Expense {
  id: string
  category: Category
  amount: number
  note: string | null
  recordedBy: string
  date: string
}

const { t } = useI18n()
const toast = useToast()
const money = formatMoney

const CATEGORIES: Category[] = ['OWNER_DRAW', 'RENT', 'UTILITIES', 'SALARIES', 'OTHER']
const CATEGORY_BADGE: Record<Category, 'warning' | 'info' | 'muted' | 'default'> = {
  OWNER_DRAW: 'warning',
  RENT: 'info',
  UTILITIES: 'muted',
  SALARIES: 'default',
  OTHER: 'muted',
}
const categoryLabel = (c: Category) => t(`pages.expenses.categories.${c}`)
const categoryOptions = computed(() => CATEGORIES.map((c) => ({ value: c, label: categoryLabel(c) })))

const period = ref('month')
const periodOptions = computed(() => [
  { value: 'week', label: t('pages.reports.periods.week') },
  { value: 'month', label: t('pages.reports.periods.month') },
  { value: 'quarter', label: t('pages.reports.periods.quarter') },
  { value: 'year', label: t('pages.reports.periods.year') },
])

const expenses = ref<Expense[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const { data } = await api.get<Expense[]>('/expenses', { params: { period: period.value } })
    expenses.value = data
  } catch {
    toast.show(t('toasts.expenses.loadFailed'), 'error')
  } finally {
    loading.value = false
  }
}

// ຕົວເລກຂາຍ/ກຳໄລ ດຶງຈາກ endpoint ດຽວກັນກັບໜ້າ Reports — ບໍ່ຄິດເອງຄືນໃໝ່ ເພື່ອບໍ່ໃຫ້ຕົວເລກຂັດກັນ
const summary = ref({ totalSales: 0, totalPurchases: 0, grossProfit: 0 })
async function loadSummary() {
  try {
    const { data } = await api.get('/reports/summary', { params: { period: period.value } })
    summary.value = data
  } catch {
    toast.show(t('toasts.expenses.loadFailed'), 'error')
  }
}

onMounted(() => {
  load()
  loadSummary()
})
watch(period, () => {
  load()
  loadSummary()
})

const total = computed(() => expenses.value.reduce((s, e) => s + e.amount, 0))
const netProfit = computed(() => summary.value.grossProfit - total.value)

const showAdd = ref(false)
const saving = ref(false)
const blankForm = { category: 'OWNER_DRAW' as Category, amount: '', note: '' }
const form = reactive({ ...blankForm })

function openAdd() {
  Object.assign(form, blankForm)
  showAdd.value = true
}

async function save() {
  if (saving.value) return
  if (!form.amount || Number(form.amount) <= 0) {
    toast.show(t('toasts.expenses.amountRequired'), 'warning')
    return
  }
  saving.value = true
  try {
    await api.post('/expenses', {
      category: form.category,
      amount: Number(form.amount),
      note: form.note || undefined,
    })
    toast.show(t('toasts.expenses.saved'), 'success')
    showAdd.value = false
    await load()
  } catch (e: any) {
    toast.show(apiErrorMessage(e, t) || t('toasts.expenses.saveFailed'), 'error')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <PageHeader :title="t('pages.expenses.title')" :subtitle="t('pages.expenses.subtitle')">
      <template #actions>
        <div class="w-40">
          <SelectInput v-model="period" :options="periodOptions" />
        </div>
        <Button @click="openAdd"><Plus class="w-4 h-4" /> {{ t('pages.expenses.addExpense') }}</Button>
      </template>
    </PageHeader>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard :title="t('pages.reports.totalSales')" :value="money(summary.totalSales)" color="blue">
        <template #icon><KipIcon class="w-5 h-5" /></template>
      </StatCard>
      <StatCard :title="t('pages.reports.grossProfit')" :value="money(summary.grossProfit)" color="teal">
        <template #icon><TrendingUp class="w-5 h-5" /></template>
      </StatCard>
      <StatCard :title="t('pages.expenses.totalExpenses')" :value="money(total)" color="amber">
        <template #icon><Wallet class="w-5 h-5" /></template>
      </StatCard>
      <StatCard :title="t('pages.expenses.netProfit')" :value="money(netProfit)" :color="netProfit >= 0 ? 'green' : 'red'">
        <template #icon><TrendingUp class="w-5 h-5" /></template>
      </StatCard>
    </div>

    <SectionCard>
      <DataTable
        :headers="[
          t('common.date'), t('pages.expenses.colCategory'), t('common.total'),
          t('pages.expenses.colNote'), t('pages.expenses.colRecordedBy'),
        ]"
      >
        <TableRow v-for="e in expenses" :key="e.id">
          <TableCell><span class="text-sm">{{ e.date.slice(0, 10) }}</span></TableCell>
          <TableCell><Badge :variant="CATEGORY_BADGE[e.category]">{{ categoryLabel(e.category) }}</Badge></TableCell>
          <TableCell><span class="font-mono font-medium text-slate-800 dark:text-slate-100">{{ money(e.amount) }}</span></TableCell>
          <TableCell><span class="text-sm text-slate-500 dark:text-slate-400">{{ e.note || '—' }}</span></TableCell>
          <TableCell><span class="text-sm text-slate-500 dark:text-slate-400">{{ e.recordedBy }}</span></TableCell>
        </TableRow>
      </DataTable>

      <div v-if="expenses.length === 0" class="py-16 text-center text-slate-400 text-sm">
        {{ t('pages.expenses.noResults') }}
      </div>
    </SectionCard>

    <Modal v-model:open="showAdd" :title="t('pages.expenses.addExpense')" size="sm">
      <div class="space-y-4">
        <div class="space-y-4">
          <SelectInput v-model="form.category" :label="t('pages.expenses.colCategory')" :options="categoryOptions" />
          <TextInput v-model="form.amount" :label="t('pages.expenses.amountKip')" type="number" placeholder="0" required />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">{{ t('pages.expenses.colNote') }}</label>
          <textarea
            v-model="form.note"
            rows="2"
            :placeholder="t('pages.expenses.notePlaceholder')"
            class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
          />
        </div>
        <div class="flex justify-end gap-3">
          <Button variant="outline" @click="showAdd = false">{{ t('common.cancel') }}</Button>
          <Button :disabled="saving" @click="save">{{ saving ? t('common.saving') : t('pages.expenses.addExpense') }}</Button>
        </div>
      </div>
    </Modal>
  </div>
</template>
