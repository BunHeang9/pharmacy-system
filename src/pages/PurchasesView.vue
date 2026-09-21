<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus, Eye, Edit2, Trash2 } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import api from '@/api/client'
import { useToast } from '@/stores/toast'
import { apiErrorMessage } from '@/lib/apiError'
import { formatMoney } from '@/utils/money'

import PageHeader from '@/components/ui/PageHeader.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import SearchInput from '@/components/ui/SearchInput.vue'
import SelectInput from '@/components/ui/SelectInput.vue'
import Button from '@/components/ui/Button.vue'
import Badge from '@/components/ui/Badge.vue'
import DataTable from '@/components/ui/DataTable.vue'
import TableRow from '@/components/ui/TableRow.vue'
import TableCell from '@/components/ui/TableCell.vue'
import Modal from '@/components/ui/Modal.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'

interface Purchase {
  id: string
  purchaseNo: string
  supplier: string | null
  supplierId: string
  status: 'PENDING' | 'RECEIVED' | 'CANCELLED'
  items: number
  subtotal: number
  total: number
  date: string
  receivedAt: string | null
}
interface PurchaseDetailItem {
  medicineId: string
  medicine: string
  quantity: number
  unitCost: number
  lineTotal: number
  batchNo: string
  expiryDate: string
}
type PurchaseDetail = Omit<Purchase, 'items'> & { items: PurchaseDetailItem[] }

interface Option { id: string; name: string }
interface MedOption extends Option { strength: string; purchasePrice: number }

interface POLine {
  medicineId: string
  batchNo: string
  qty: number | string
  unitCost: number | string
  expiry: string
}

const { t } = useI18n()
const toast = useToast()

const purchases = ref<Purchase[]>([])
const suppliers = ref<Option[]>([])
const medicines = ref<MedOption[]>([])

async function loadAll() {
  try {
    const [poRes, supRes, medRes] = await Promise.all([
      api.get<Purchase[]>('/purchases'),
      api.get<Option[]>('/suppliers'),
      api.get<MedOption[]>('/medicines'),
    ])
    purchases.value = poRes.data
    suppliers.value = supRes.data
    medicines.value = medRes.data
  } catch {
    toast.show(t('toasts.purchases.loadFailed'), 'error')
  }
}
onMounted(loadAll)

const search = ref('')
const showAdd = ref(false)
const editing = ref<Purchase | null>(null)
const viewPO = ref<PurchaseDetail | null>(null)
const cancelItem = ref<Purchase | null>(null)
const showCancel = ref(false)

const filtered = computed(() =>
  purchases.value.filter(
    (p) =>
      !search.value ||
      p.purchaseNo.toLowerCase().includes(search.value.toLowerCase()) ||
      (p.supplier ?? '').toLowerCase().includes(search.value.toLowerCase()),
  ),
)

const totalValue = computed(() => filtered.value.reduce((s, p) => s + p.total, 0))
const pendingCount = computed(() => filtered.value.filter((p) => p.status === 'PENDING').length)

/* ---------- ຟອມສ້າງ PO ---------- */

const supplierOptions = computed(() => suppliers.value.map((s) => ({ value: s.id, label: s.name })))

function blankLine(): POLine {
  return { medicineId: '', batchNo: '', qty: 1, unitCost: '', expiry: '' }
}

const form = reactive({
  supplierId: '',
  lines: [blankLine()] as POLine[],
})

function lineTotal(l: POLine) {
  return (Number(l.qty) || 0) * (Number(l.unitCost) || 0)
}
const grandTotal = computed(() => form.lines.reduce((s, l) => s + lineTotal(l), 0))

function addLine() {
  form.lines.push(blankLine())
}

function removeLine(i: number) {
  if (form.lines.length === 1) {
    form.lines[0] = blankLine()
    return
  }
  form.lines.splice(i, 1)
}

// ເມື່ອເລືອກຢາ ໃຫ້ຕື່ມລາຄາຊື້ຄັ້ງກ່ອນໃຫ້ອັດຕະໂນມັດ
function onMedicineChange(l: POLine) {
  const med = medicines.value.find((m) => m.id === l.medicineId)
  if (med && !l.unitCost) l.unitCost = med.purchasePrice
}

function openAdd() {
  editing.value = null
  Object.assign(form, { supplierId: suppliers.value[0]?.id ?? '', lines: [blankLine()] })
  showAdd.value = true
}

// ແກ້ໄຂໄດ້ສະເພາະ PENDING — ດຶງລາຍລະອຽດເຕັມ (ລວມລາຍການ) ມາໃສ່ຟອມດຽວກັນກັບຟອມສ້າງ
async function openEdit(p: Purchase) {
  try {
    const { data } = await api.get<PurchaseDetail>(`/purchases/${p.id}`)
    editing.value = p
    Object.assign(form, {
      supplierId: data.supplierId,
      lines: data.items.map((i) => ({
        medicineId: i.medicineId,
        batchNo: i.batchNo,
        qty: i.quantity,
        unitCost: i.unitCost,
        expiry: i.expiryDate,
      })),
    })
    showAdd.value = true
  } catch {
    toast.show(t('toasts.purchases.detailFailed'), 'error')
  }
}

async function createPO() {
  const valid = form.lines.filter((l) => l.medicineId && Number(l.qty) > 0)
  if (!valid.length) {
    toast.show(t('toasts.purchases.minOneItem'), 'warning')
    return
  }
  const noExpiry = valid.find((l) => !l.expiry)
  if (noExpiry) {
    toast.show(t('toasts.purchases.expiryRequired'), 'warning')
    return
  }
  const noBatch = valid.find((l) => !l.batchNo.trim())
  if (noBatch) {
    toast.show(t('toasts.purchases.batchRequired'), 'warning')
    return
  }
  if (!form.supplierId) {
    toast.show(t('toasts.purchases.supplierRequired'), 'warning')
    return
  }

  const body = {
    supplierId: form.supplierId,
    items: valid.map((l) => ({
      medicineId: l.medicineId,
      quantity: Number(l.qty),
      unitCost: Number(l.unitCost) || 0,
      batchNo: l.batchNo,
      expiryDate: l.expiry,
    })),
  }

  try {
    if (editing.value) {
      const { data } = await api.put<Purchase>(`/purchases/${editing.value.id}`, body)
      const i = purchases.value.findIndex((x) => x.id === data.id)
      if (i !== -1) purchases.value[i] = data
      toast.show(t('toasts.purchases.updated'), 'success')
    } else {
      const { data } = await api.post<Purchase>('/purchases', body)
      purchases.value.unshift(data)
      toast.show(t('toasts.purchases.created'), 'success')
    }
    showAdd.value = false
  } catch (e: any) {
    toast.show(apiErrorMessage(e, t) || t('toasts.purchases.createFailed'), 'error')
  }
}

function askCancel(p: Purchase) {
  cancelItem.value = p
  showCancel.value = true
}

async function confirmCancel() {
  if (!cancelItem.value) return
  const id = cancelItem.value.id
  try {
    await api.delete(`/purchases/${id}`)
    const i = purchases.value.findIndex((x) => x.id === id)
    if (i !== -1) purchases.value[i] = { ...purchases.value[i], status: 'CANCELLED' }
    toast.show(t('toasts.purchases.cancelled'), 'success')
  } catch (e: any) {
    toast.show(apiErrorMessage(e, t) || t('toasts.purchases.cancelFailed'), 'error')
  } finally {
    cancelItem.value = null
  }
}

// ຮັບເຄື່ອງເຂົ້າ — ນີ້ຄືຈຸດທີ່ສະຕັອກເພີ່ມຂຶ້ນຈິງ (server ສ້າງ batch + ອັບເດດຍອດຄ້າງຈ່າຍຜູ້ສະໜອງ)
async function markReceived(p: Purchase) {
  try {
    const { data } = await api.post<Purchase>(`/purchases/${p.id}/receive`)
    const i = purchases.value.findIndex((x) => x.id === p.id)
    if (i !== -1) purchases.value[i] = data
    toast.show(t('toasts.purchases.received', { no: p.purchaseNo }), 'success')
  } catch (e: any) {
    toast.show(apiErrorMessage(e, t) || t('toasts.purchases.receiveFailed'), 'error')
  }
}

async function openView(p: Purchase) {
  try {
    const { data } = await api.get<PurchaseDetail>(`/purchases/${p.id}`)
    viewPO.value = data
  } catch {
    toast.show(t('toasts.purchases.detailFailed'), 'error')
  }
}

const money = formatMoney
</script>

<template>
  <div class="space-y-5">
    <PageHeader :title="t('pages.purchases.title')" :subtitle="t('pages.purchases.subtitle')">
      <template #actions>
        <Button @click="openAdd"><Plus class="w-4 h-4" /> {{ t('pages.purchases.newPurchaseOrder') }}</Button>
      </template>
    </PageHeader>

    <div class="grid grid-cols-3 gap-4">
      <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
        <div class="text-xs text-slate-500 dark:text-slate-400 font-medium">{{ t('pages.purchases.totalPOs') }}</div>
        <div class="text-xl font-bold text-slate-800 dark:text-slate-100 font-display mt-1">{{ filtered.length }}</div>
      </div>
      <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
        <div class="text-xs text-slate-500 dark:text-slate-400 font-medium">{{ t('pages.purchases.totalValue') }}</div>
        <div class="text-xl font-bold text-slate-800 dark:text-slate-100 font-display mt-1">{{ money(totalValue) }}</div>
      </div>
      <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
        <div class="text-xs text-slate-500 dark:text-slate-400 font-medium">{{ t('pages.purchases.pending') }}</div>
        <div class="text-xl font-bold text-amber-600 font-display mt-1">{{ pendingCount }}</div>
      </div>
    </div>

    <SectionCard>
      <div class="p-4">
        <SearchInput v-model="search" :placeholder="t('pages.purchases.searchPlaceholder')" />
      </div>

      <DataTable :headers="[t('pages.purchases.colPoNumber'), t('common.supplier'), t('common.date'), t('pages.purchases.colItems'), t('common.total'), t('common.status'), t('common.actions')]">
        <TableRow v-for="p in filtered" :key="p.id">
          <TableCell><span class="font-mono text-xs text-blue-600 font-medium">{{ p.purchaseNo }}</span></TableCell>
          <TableCell><span class="font-medium text-slate-700 dark:text-slate-200">{{ p.supplier }}</span></TableCell>
          <TableCell><span class="text-sm text-slate-500 dark:text-slate-400">{{ p.date }}</span></TableCell>
          <TableCell><span class="font-mono">{{ p.items }}</span></TableCell>
          <TableCell><span class="font-mono font-semibold">{{ money(p.total) }}</span></TableCell>
          <TableCell>
            <Badge :variant="p.status === 'RECEIVED' ? 'success' : p.status === 'CANCELLED' ? 'muted' : 'warning'">{{ t(`status.${p.status}`) }}</Badge>
          </TableCell>
          <TableCell>
            <div class="flex items-center gap-1">
              <button class="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded text-blue-500 transition" @click="openView(p)">
                <Eye class="w-4 h-4" />
              </button>
              <template v-if="p.status === 'PENDING'">
                <button class="p-1.5 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded text-amber-400 transition" @click="openEdit(p)">
                  <Edit2 class="w-4 h-4" />
                </button>
                <button class="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded text-red-400 transition" @click="askCancel(p)">
                  <Trash2 class="w-4 h-4" />
                </button>
                <button
                  class="px-2 py-1 text-xs bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-500/20 rounded hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition"
                  @click="markReceived(p)"
                >
                  {{ t('pages.purchases.receive') }}
                </button>
              </template>
            </div>
          </TableCell>
        </TableRow>
      </DataTable>

      <div v-if="filtered.length === 0" class="py-16 text-center text-slate-400 text-sm">
        {{ t('pages.purchases.noResults') }}
      </div>
    </SectionCard>

    <!-- ສ້າງ/ແກ້ໄຂໃບສັ່ງຊື້ -->
    <Modal v-model:open="showAdd" :title="editing ? t('pages.purchases.editPurchaseOrder') : t('pages.purchases.newPurchaseOrder')" size="xl">
      <div class="space-y-5">
        <SelectInput v-model="form.supplierId" :label="t('common.supplier')" :options="supplierOptions" />

        <div>
          <h4 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">{{ t('pages.purchases.orderItems') }}</h4>
          <div class="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40">
                    <th
                      v-for="h in [t('common.medicine'), t('pages.purchases.colBatchNo'), t('pages.purchases.colQty'), t('pages.purchases.colUnitCost'), t('pages.purchases.colExpiry'), t('common.total'), '']"
                      :key="h"
                      class="text-left px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap"
                    >
                      {{ h }}
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-50 dark:divide-slate-700/60">
                  <tr v-for="(l, i) in form.lines" :key="i">
                    <td class="px-3 py-2">
                      <select
                        v-model="l.medicineId"
                        class="w-40 px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded"
                        @change="onMedicineChange(l)"
                      >
                        <option value="">{{ t('pages.purchases.selectMedicine') }}</option>
                        <option v-for="m in medicines" :key="m.id" :value="m.id">{{ m.name }} {{ m.strength }}</option>
                      </select>
                    </td>
                    <td class="px-3 py-2">
                      <input
                        v-model="l.batchNo"
                        placeholder="B2026-xxx"
                        class="w-24 px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded font-mono"
                      />
                    </td>
                    <td class="px-3 py-2">
                      <input
                        v-model.number="l.qty"
                        type="number"
                        min="1"
                        class="w-16 px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 dark:bg-slate-800  dark:text-slate-100 rounded font-mono"
                      />
                    </td>
                    <td class="px-3 py-2">
                      <input
                        v-model.number="l.unitCost"
                        type="number"
                        step="1"
                        class="w-20 px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded font-mono"
                      />
                    </td>
                    <td class="px-3 py-2">
                      <input v-model="l.expiry" type="date" class="w-32 px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:[color-scheme:dark] rounded" />
                    </td>
                    <td class="px-3 py-2">
                      <span class="font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">{{ money(lineTotal(l)) }}</span>
                    </td>
                    <td class="px-3 py-2">
                      <button class="p-1 hover:bg-red-50 dark:hover:bg-red-500/10 rounded text-red-400 transition" @click="removeLine(i)">
                        <Trash2 class="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="flex items-center justify-between p-3 border-t border-slate-100 dark:border-slate-700">
              <button class="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1" @click="addLine">
                <Plus class="w-4 h-4" /> {{ t('pages.purchases.addItem') }}
              </button>
              <div class="text-right">
                <span class="text-xs text-slate-500 dark:text-slate-400 mr-2">{{ t('pages.purchases.grandTotal') }}</span>
                <span class="font-mono font-bold text-blue-600 text-base">{{ money(grandTotal) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-3">
          <Button variant="outline" @click="showAdd = false">{{ t('common.cancel') }}</Button>
          <Button @click="createPO">{{ editing ? t('common.saveChanges') : t('pages.purchases.createPurchaseOrder') }}</Button>
        </div>
      </div>
    </Modal>

    <!-- ລາຍລະອຽດ PO -->
    <Modal :open="viewPO !== null" :title="t('pages.purchases.poDetailTitle', { no: viewPO?.purchaseNo ?? '' })" size="lg" @update:open="(v) => !v && (viewPO = null)">
      <div v-if="viewPO" class="space-y-4">
        <div class="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
          <div>
            <span class="text-xs text-slate-400">{{ t('common.supplier') }}</span>
            <div class="font-medium mt-0.5">{{ viewPO.supplier }}</div>
          </div>
          <div>
            <span class="text-xs text-slate-400">{{ t('common.date') }}</span>
            <div class="font-medium mt-0.5">{{ viewPO.date }}</div>
          </div>
          <div>
            <span class="text-xs text-slate-400">{{ t('common.status') }}</span>
            <div class="mt-0.5">
              <Badge :variant="viewPO.status === 'RECEIVED' ? 'success' : 'warning'">{{ t(`status.${viewPO.status}`) }}</Badge>
            </div>
          </div>
          <div v-if="viewPO.receivedAt">
            <span class="text-xs text-slate-400">{{ t('pages.purchases.received') }}</span>
            <div class="font-medium mt-0.5">{{ viewPO.receivedAt }}</div>
          </div>
        </div>

        <DataTable :headers="[t('common.medicine'), t('pages.purchases.colBatch'), t('pages.purchases.colQty'), t('pages.purchases.colUnitCost'), t('common.total')]">
          <TableRow v-for="(item, idx) in viewPO.items" :key="idx">
            <TableCell>{{ item.medicine }}</TableCell>
            <TableCell><span class="font-mono text-xs">{{ item.batchNo }}</span></TableCell>
            <TableCell><span class="font-mono">{{ item.quantity }}</span></TableCell>
            <TableCell><span class="font-mono">{{ money(item.unitCost) }}</span></TableCell>
            <TableCell><span class="font-mono font-semibold">{{ money(item.lineTotal) }}</span></TableCell>
          </TableRow>
        </DataTable>

        <div class="text-right border-t border-slate-100 dark:border-slate-700 pt-3">
          <div class="text-lg font-bold text-slate-800 dark:text-slate-100 font-mono">{{ t('common.total') }}: {{ money(viewPO.total) }}</div>
        </div>
      </div>
    </Modal>

    <ConfirmModal
      v-model:open="showCancel"
      :title="t('pages.purchases.cancelTitle')"
      :message="t('pages.purchases.cancelMessage', { no: cancelItem?.purchaseNo ?? '' })"
      @confirm="confirmCancel"
    />
  </div>
</template>
