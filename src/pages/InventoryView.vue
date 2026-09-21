<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Package, AlertTriangle, XCircle, ArrowUpDown } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import api from '@/api/client'
import { useAuth } from '@/stores/auth'
import { useToast } from '@/stores/toast'
import { apiErrorMessage } from '@/lib/apiError'
import { formatMoney } from '@/utils/money'

import PageHeader from '@/components/ui/PageHeader.vue'
import StatCard from '@/components/ui/StatCard.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import SearchInput from '@/components/ui/SearchInput.vue'
import DataTable from '@/components/ui/DataTable.vue'
import TableRow from '@/components/ui/TableRow.vue'
import TableCell from '@/components/ui/TableCell.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import Button from '@/components/ui/Button.vue'
import Modal from '@/components/ui/Modal.vue'
import FormGrid from '@/components/ui/FormGrid.vue'
import TextInput from '@/components/ui/TextInput.vue'
import SelectInput from '@/components/ui/SelectInput.vue'

interface Medicine {
  id: string
  name: string
  category: string | null
  form: string
  strength: string
  sellingPrice: number
  minStock: number
  stock: number
  status: string
  nextExpiry: string | null
  batchCount: number
}

const { t } = useI18n()
const toast = useToast()
const auth = useAuth()

// Pharmacy Clerk ເບິ່ງສະຕັອກໄດ້ ແຕ່ປັບສະຕັອກບໍ່ໄດ້ — backend ກັນໄວ້ແລ້ວ, ນີ້ແມ່ນເສີມ UX
const canAdjust = computed(() => auth.user?.role !== 'PHARMACY_CLERK')

const items = ref<Medicine[]>([])
const search = ref('')
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const { data } = await api.get<Medicine[]>('/medicines')
    items.value = data
  } catch {
    toast.show(t('toasts.inventory.loadFailed'), 'error')
  } finally {
    loading.value = false
  }
}
onMounted(load)

const inStock = computed(() => items.value.filter((m) => m.status === 'In Stock').length)
const lowStock = computed(() => items.value.filter((m) => m.status === 'Low Stock').length)
const outOfStock = computed(() => items.value.filter((m) => m.status === 'Out of Stock').length)
const totalValue = computed(() => items.value.reduce((s, m) => s + m.stock * m.sellingPrice, 0))

const filtered = computed(() =>
  items.value.filter((m) => !search.value || m.name.toLowerCase().includes(search.value.toLowerCase())),
)

const adjustMed = ref<Medicine | null>(null)
const saving = ref(false)

// ປະເພດອື່ນນອກຈາກ Stock In ຫັກແບບ FEFO ອັດຕະໂນມັດ (batch ໝົດອາຍຸໄວທີ່ສຸດກ່ອນ)
const ADJUST_TYPE_VALUES = ['STOCK_IN', 'STOCK_OUT', 'DAMAGED', 'EXPIRED', 'LOST'] as const
const ADJUST_TYPES = computed(() => ADJUST_TYPE_VALUES.map((v) => ({ value: v, label: t(`pages.inventory.adjustTypes.${v}`) })))
const adjust = reactive({ type: 'STOCK_IN', qty: '', reason: '', batchNo: '', expiryDate: '' })

function openAdjust(m: Medicine) {
  adjustMed.value = m
  Object.assign(adjust, { type: 'STOCK_IN', qty: '', reason: '', batchNo: '', expiryDate: '' })
}

// ສະແດງຜົນລ່ວງໜ້າ ກ່ອນຢືນຢັນ (ຄາດຄະເນ — server ເປັນຜູ້ຄິດຈິງ)
const preview = computed(() => {
  if (!adjustMed.value || adjust.qty === '') return null
  const qty = Number(adjust.qty)
  return adjust.type === 'STOCK_IN' ? adjustMed.value.stock + qty : adjustMed.value.stock - qty
})

async function applyAdjustment() {
  if (!adjustMed.value || saving.value) return
  const qty = Number(adjust.qty)
  if (!qty || qty <= 0) {
    toast.show(t('toasts.inventory.qtyRequired'), 'warning')
    return
  }
  if (!adjust.reason.trim()) {
    toast.show(t('toasts.inventory.reasonRequired'), 'warning')
    return
  }
  if (adjust.type === 'STOCK_IN' && (!adjust.batchNo.trim() || !adjust.expiryDate)) {
    toast.show(t('toasts.inventory.batchRequired'), 'warning')
    return
  }
  if (preview.value !== null && preview.value < 0) {
    toast.show(t('toasts.inventory.negativeStock'), 'error')
    return
  }

  saving.value = true
  try {
    if (adjust.type === 'STOCK_IN') {
      // ຮັບເຂົ້າໃໝ່ = batch ໃໝ່ສະເໝີ (ວັນໝົດອາຍຸແຕ່ລະຄັ້ງອາດຕ່າງກັນ)
      await api.post(`/medicines/${adjustMed.value.id}/batches`, {
        batchNo: adjust.batchNo,
        quantity: qty,
        expiryDate: adjust.expiryDate,
        reason: adjust.reason,
      })
    } else {
      // server ຫັກຈາກ batch ໝົດອາຍຸໄວທີ່ສຸດກ່ອນເອງ (FEFO)
      await api.post('/stock-movements', {
        medicineId: adjustMed.value.id,
        type: adjust.type,
        quantity: qty,
        reason: adjust.reason,
      })
    }
    toast.show(t('toasts.inventory.adjusted', { name: adjustMed.value.name }), 'success')
    adjustMed.value = null
    await load()
  } catch (e: any) {
    toast.show(apiErrorMessage(e, t) || t('toasts.inventory.adjustFailed'), 'error')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <PageHeader :title="t('pages.inventory.title')" :subtitle="t('pages.inventory.subtitle')">
      <template #actions>
        <Button variant="outline">{{ t('common.exportReport') }}</Button>
      </template>
    </PageHeader>

    <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <StatCard
        :title="t('pages.inventory.totalStockValue')"
        :value="formatMoney(totalValue)"
        color="blue"
      >
        <template #icon><Package class="w-5 h-5" /></template>
      </StatCard>
      <StatCard :title="t('pages.inventory.totalItems')" :value="items.length" color="teal">
        <template #icon><Package class="w-5 h-5" /></template>
      </StatCard>
      <StatCard :title="t('pages.inventory.inStock')" :value="inStock" color="green">
        <template #icon><Package class="w-5 h-5" /></template>
      </StatCard>
      <StatCard :title="t('pages.inventory.lowStock')" :value="lowStock" color="amber">
        <template #icon><AlertTriangle class="w-5 h-5" /></template>
      </StatCard>
      <StatCard :title="t('pages.inventory.outOfStock')" :value="outOfStock" color="red">
        <template #icon><XCircle class="w-5 h-5" /></template>
      </StatCard>
    </div>

    <SectionCard>
      <div class="p-4 flex gap-3 items-center">
        <SearchInput v-model="search" :placeholder="t('pages.inventory.searchPlaceholder')" />
      </div>

      <DataTable :headers="[t('common.medicine'), t('common.category'), t('pages.dashboard.stock'), t('pages.dashboard.minStock'), t('pages.inventory.colBatches'), t('pages.inventory.colNextExpiry'), t('common.status'), t('common.actions')]">
        <TableRow v-for="m in filtered" :key="m.id">
          <TableCell>
            <div class="font-medium text-slate-800 dark:text-slate-100 text-sm">{{ m.name }}</div>
            <div class="text-xs text-slate-400">{{ m.form }} · {{ m.strength }}</div>
          </TableCell>
          <TableCell><span class="text-sm text-slate-500 dark:text-slate-400">{{ m.category }}</span></TableCell>
          <TableCell>
            <span
              class="font-mono text-sm font-bold"
              :class="m.stock === 0 ? 'text-red-600' : m.stock < m.minStock ? 'text-amber-600' : 'text-slate-800 dark:text-slate-100'"
            >
              {{ m.stock }}
            </span>
          </TableCell>
          <TableCell><span class="font-mono text-sm text-slate-400">{{ m.minStock }}</span></TableCell>
          <TableCell><span class="font-mono text-sm text-slate-500 dark:text-slate-400">{{ m.batchCount }}</span></TableCell>
          <TableCell><span class="text-xs text-slate-500 dark:text-slate-400">{{ m.nextExpiry || '—' }}</span></TableCell>
          <TableCell><StatusBadge kind="stock" :status="m.status" /></TableCell>
          <TableCell>
            <button
              v-if="canAdjust"
              class="flex items-center gap-1 px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 text-slate-600 dark:text-slate-300 rounded transition"
              @click="openAdjust(m)"
            >
              <ArrowUpDown class="w-3 h-3" /> {{ t('pages.inventory.adjust') }}
            </button>
            <span v-else class="text-xs text-slate-300 dark:text-slate-600">—</span>
          </TableCell>
        </TableRow>
      </DataTable>

      <div v-if="filtered.length === 0" class="py-16 text-center text-slate-400 text-sm">
        {{ t('pages.inventory.noResults') }}
      </div>
    </SectionCard>

    <!-- ປັບສະຕັອກ -->
    <Modal :open="adjustMed !== null" :title="t('pages.inventory.stockAdjustment')" size="md" @update:open="(v) => !v && (adjustMed = null)">
      <div v-if="adjustMed" class="space-y-4">
        <div class="bg-slate-50 dark:bg-slate-700/40 rounded-lg p-3 flex items-center justify-between">
          <div>
            <div class="font-semibold text-slate-800 dark:text-slate-100">{{ adjustMed.name }}</div>
            <div class="text-xs text-slate-500 dark:text-slate-400">{{ t('pages.inventory.batchesCount', { n: adjustMed.batchCount }) }}</div>
          </div>
          <div class="text-right">
            <div class="text-xl font-bold font-mono text-slate-800 dark:text-slate-100">{{ adjustMed.stock }}</div>
            <div class="text-xs text-slate-400">{{ t('pages.inventory.currentQty') }}</div>
          </div>
        </div>

        <SelectInput v-model="adjust.type" :label="t('pages.inventory.adjustmentType')" :options="ADJUST_TYPES" />

        <FormGrid v-if="adjust.type === 'STOCK_IN'" :cols="2">
          <TextInput v-model="adjust.batchNo" :label="t('pages.inventory.batchNumber')" placeholder="B2025-001" required />
          <TextInput v-model="adjust.expiryDate" :label="t('common.expiryDate')" type="date" required />
        </FormGrid>

        <TextInput v-model="adjust.qty" :label="t('pages.inventory.quantity')" type="number" placeholder="0" required />

        <div v-if="preview !== null" class="flex items-center justify-between bg-blue-50 dark:bg-blue-500/10 rounded-lg px-3 py-2">
          <span class="text-xs font-medium text-blue-700 dark:text-blue-300">{{ t('pages.inventory.stockAfterAdjust') }}</span>
          <span class="font-mono font-bold" :class="preview < 0 ? 'text-red-600' : 'text-blue-700 dark:text-blue-300'">
            {{ adjustMed.stock }} → {{ preview }}
          </span>
        </div>

        <TextInput v-model="adjust.reason" :label="t('pages.inventory.reason')" :placeholder="t('pages.inventory.reasonPlaceholder')" required />

        <p v-if="adjust.type !== 'STOCK_IN'" class="text-xs text-slate-400">
          {{ t('pages.inventory.fefoNote') }}
        </p>

        <div class="flex justify-end gap-3">
          <Button variant="outline" @click="adjustMed = null">{{ t('common.cancel') }}</Button>
          <Button :disabled="saving" @click="applyAdjustment">{{ saving ? t('common.saving') : t('pages.inventory.applyAdjustment') }}</Button>
        </div>
      </div>
    </Modal>
  </div>
</template>
