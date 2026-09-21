<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus, Edit2, Trash2 } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import api from '@/api/client'
import { useToast } from '@/stores/toast'
import { apiErrorMessage } from '@/lib/apiError'
import { formatMoney } from '@/utils/money'

import KipIcon from '@/components/ui/KipIcon.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import SearchInput from '@/components/ui/SearchInput.vue'
import TextInput from '@/components/ui/TextInput.vue'
import Button from '@/components/ui/Button.vue'
import Badge from '@/components/ui/Badge.vue'
import DataTable from '@/components/ui/DataTable.vue'
import TableRow from '@/components/ui/TableRow.vue'
import TableCell from '@/components/ui/TableCell.vue'
import Modal from '@/components/ui/Modal.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import FormGrid from '@/components/ui/FormGrid.vue'

interface Supplier {
  id: string
  name: string
  contact: string
  phone: string
  email: string
  address: string
  regNo: string
  licenseNo: string
  balance: number
  purchases: number
  status: string
}
interface SupplierPaymentEntry {
  id: string
  amount: number
  note: string | null
  by: string
  date: string
}

const { t } = useI18n()
const toast = useToast()

const suppliers = ref<Supplier[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const { data } = await api.get<Supplier[]>('/suppliers')
    suppliers.value = data
  } catch {
    toast.show(t('toasts.suppliers.loadFailed'), 'error')
  } finally {
    loading.value = false
  }
}
onMounted(load)

const search = ref('')
const showForm = ref(false)
const editing = ref<Supplier | null>(null)
const deleteSup = ref<Supplier | null>(null)
const showDelete = ref(false)

const blank = {
  name: '', contact: '', phone: '', email: '',
  address: '', regNo: '', licenseNo: '',
}
const form = reactive({ ...blank })

const filtered = computed(() =>
  suppliers.value.filter(
    (s) =>
      !search.value ||
      s.name.toLowerCase().includes(search.value.toLowerCase()) ||
      s.contact.toLowerCase().includes(search.value.toLowerCase()),
  ),
)

// ຍອດຄ້າງຈ່າຍລວມ — ຕົວເລກທີ່ເຈົ້າຂອງຮ້ານຢາກຮູ້ທຸກເດືອນ
const totalOutstanding = computed(() => suppliers.value.reduce((s, x) => s + x.balance, 0))
const totalPurchases = computed(() => suppliers.value.reduce((s, x) => s + x.purchases, 0))

function openAdd() {
  editing.value = null
  Object.assign(form, blank)
  showForm.value = true
}

function openEdit(s: Supplier) {
  editing.value = s
  Object.assign(form, {
    name: s.name, contact: s.contact, phone: s.phone, email: s.email,
    address: s.address, regNo: s.regNo, licenseNo: s.licenseNo,
  })
  showForm.value = true
}

async function save() {
  if (!form.name.trim()) {
    toast.show(t('toasts.suppliers.nameRequired'), 'warning')
    return
  }
  const body = { ...form }

  try {
    if (editing.value) {
      const { data } = await api.put<Supplier>(`/suppliers/${editing.value.id}`, body)
      const i = suppliers.value.findIndex((s) => s.id === data.id)
      if (i !== -1) suppliers.value[i] = { ...suppliers.value[i], ...data }
      toast.show(t('toasts.suppliers.updated'), 'success')
    } else {
      const { data } = await api.post<Supplier>('/suppliers', body)
      suppliers.value.unshift(data)
      toast.show(t('toasts.suppliers.created'), 'success')
    }
    showForm.value = false
  } catch (e: any) {
    toast.show(apiErrorMessage(e, t) || t('toasts.suppliers.saveFailed'), 'error')
  }
}

function askDelete(s: Supplier) {
  // ຍັງຄ້າງເງິນຢູ່ ຫ້າມລຶບ — server ກໍ່ບັງຄັບຄືກັນ
  if (s.balance > 0) {
    toast.show(t('toasts.suppliers.deleteBlockedBalance', { balance: formatMoney(s.balance) }), 'error')
    return
  }
  deleteSup.value = s
  showDelete.value = true
}

async function confirmDelete() {
  if (!deleteSup.value) return
  const id = deleteSup.value.id
  try {
    await api.delete(`/suppliers/${id}`)
    suppliers.value = suppliers.value.filter((x) => x.id !== id)
    toast.show(t('toasts.suppliers.deleted'), 'success')
  } catch (e: any) {
    toast.show(apiErrorMessage(e, t) || t('toasts.suppliers.deleteFailed'), 'error')
  } finally {
    deleteSup.value = null
  }
}

/* ---------- ການຈ່າຍເງິນໃຫ້ຜູ້ສະໜອງ ---------- */
const showPayment = ref(false)
const paymentSupplier = ref<Supplier | null>(null)
const paymentHistory = ref<SupplierPaymentEntry[]>([])
const paymentAmount = ref('')
const paymentNote = ref('')
const paymentSaving = ref(false)

async function openPayment(s: Supplier) {
  paymentSupplier.value = s
  paymentAmount.value = ''
  paymentNote.value = ''
  paymentHistory.value = []
  showPayment.value = true
  try {
    const { data } = await api.get<SupplierPaymentEntry[]>(`/suppliers/${s.id}/payments`)
    paymentHistory.value = data
  } catch {
    toast.show(t('toasts.suppliers.historyLoadFailed'), 'error')
  }
}

async function submitPayment() {
  if (!paymentSupplier.value || paymentSaving.value) return
  const amount = Number(paymentAmount.value)
  if (!amount || amount <= 0) {
    toast.show(t('toasts.suppliers.amountRequired'), 'warning')
    return
  }
  paymentSaving.value = true
  try {
    const { data } = await api.post<{ payment: SupplierPaymentEntry; supplier: Supplier }>(
      `/suppliers/${paymentSupplier.value.id}/payments`,
      { amount, note: paymentNote.value || undefined },
    )
    const i = suppliers.value.findIndex((x) => x.id === data.supplier.id)
    if (i !== -1) suppliers.value[i] = data.supplier
    paymentSupplier.value = data.supplier
    paymentHistory.value.unshift(data.payment)
    paymentAmount.value = ''
    paymentNote.value = ''
    toast.show(t('toasts.suppliers.paymentRecorded', { amount: formatMoney(data.payment.amount) }), 'success')
  } catch (e: any) {
    toast.show(apiErrorMessage(e, t) || t('toasts.suppliers.paymentFailed'), 'error')
  } finally {
    paymentSaving.value = false
  }
}

</script>

<template>
  <div class="space-y-5">
    <PageHeader :title="t('pages.suppliers.title')" :subtitle="t('pages.suppliers.subtitle')">
      <template #actions>
        <Button @click="openAdd"><Plus class="w-4 h-4" /> {{ t('pages.suppliers.addSupplier') }}</Button>
      </template>
    </PageHeader>

    <div class="grid grid-cols-3 gap-4">
      <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
        <div class="text-xs text-slate-500 dark:text-slate-400 font-medium">{{ t('pages.suppliers.totalSuppliers') }}</div>
        <div class="text-2xl font-bold text-slate-800 dark:text-slate-100 font-display mt-1">{{ suppliers.length }}</div>
      </div>
      <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
        <div class="text-xs text-slate-500 dark:text-slate-400 font-medium">{{ t('pages.suppliers.totalPurchases') }}</div>
        <div class="text-2xl font-bold text-slate-800 dark:text-slate-100 font-display mt-1">
          {{ formatMoney(totalPurchases) }}
        </div>
      </div>
      <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
        <div class="text-xs text-slate-500 dark:text-slate-400 font-medium">{{ t('pages.suppliers.outstandingBalance') }}</div>
        <div
          class="text-2xl font-bold font-display mt-1"
          :class="totalOutstanding > 0 ? 'text-red-600' : 'text-emerald-600'"
        >
          {{ formatMoney(totalOutstanding) }}
        </div>
      </div>
    </div>

    <SectionCard>
      <div class="p-4 flex gap-3">
        <SearchInput v-model="search" :placeholder="t('pages.suppliers.searchPlaceholder')" />
        <span class="text-xs text-slate-500 dark:text-slate-400 ml-auto self-center">{{ t('pages.suppliers.suppliersCount', { n: filtered.length }) }}</span>
      </div>

      <DataTable
        :headers="[
          t('pages.suppliers.colSupplierName'), t('pages.suppliers.colContactPerson'), t('common.phone'), t('common.email'), t('common.address'),
          t('pages.suppliers.totalPurchases'), t('pages.suppliers.colOutstanding'), t('common.status'), t('common.actions'),
        ]"
      >
        <TableRow v-for="s in filtered" :key="s.id">
          <TableCell>
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 bg-teal-50 dark:bg-teal-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <span class="text-xs font-bold text-teal-600">{{ s.name[0] }}</span>
              </div>
              <span class="font-medium text-slate-800 dark:text-slate-100">{{ s.name }}</span>
            </div>
          </TableCell>
          <TableCell><span class="text-sm text-slate-600 dark:text-slate-300">{{ s.contact }}</span></TableCell>
          <TableCell><span class="font-mono text-xs text-slate-500 dark:text-slate-400">{{ s.phone }}</span></TableCell>
          <TableCell><span class="text-sm text-slate-500 dark:text-slate-400">{{ s.email }}</span></TableCell>
          <TableCell>
            <span class="text-xs text-slate-500 dark:text-slate-400 block max-w-40 truncate" :title="s.address">{{ s.address }}</span>
          </TableCell>
          <TableCell>
            <span class="font-mono font-semibold text-slate-800 dark:text-slate-100">{{ formatMoney(s.purchases) }}</span>
          </TableCell>
          <TableCell>
            <span
              class="font-mono font-semibold"
              :class="s.balance > 0 ? 'text-red-600' : 'text-emerald-600'"
            >
              {{ s.balance > 0 ? formatMoney(s.balance) : t('pages.suppliers.cleared') }}
            </span>
          </TableCell>
          <TableCell>
            <Badge :variant="s.status === 'Active' ? 'success' : 'muted'">{{ t(`status.${s.status}`) }}</Badge>
          </TableCell>
          <TableCell>
            <div class="flex gap-1">
              <button
                v-if="s.balance > 0"
                class="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded text-emerald-500 transition"
                :title="t('pages.suppliers.recordPayment')"
                @click="openPayment(s)"
              >
                <KipIcon class="w-4 h-4" />
              </button>
              <button class="p-1.5 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded text-amber-500 transition" @click="openEdit(s)">
                <Edit2 class="w-4 h-4" />
              </button>
              <button class="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded text-red-400 transition" @click="askDelete(s)">
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </TableCell>
        </TableRow>
      </DataTable>

      <div v-if="filtered.length === 0" class="py-16 text-center text-slate-400 text-sm">
        {{ t('pages.suppliers.noResults') }}
      </div>
    </SectionCard>

    <Modal v-model:open="showForm" :title="editing ? t('pages.suppliers.editSupplier') : t('pages.suppliers.addSupplier')" size="lg">
      <div class="space-y-4">
        <FormGrid :cols="2">
          <TextInput v-model="form.name" :label="t('pages.suppliers.supplierName')" placeholder="MedSupply Co." required />
          <TextInput v-model="form.contact" :label="t('pages.suppliers.contactPerson')" placeholder="John Anderson" />
          <TextInput v-model="form.phone" :label="t('common.phone')" placeholder="+856 21 000 000" />
          <TextInput v-model="form.email" :label="t('common.email')" placeholder="contact@supplier.com" />
        </FormGrid>
        <TextInput v-model="form.address" :label="t('common.address')" placeholder="123 Pharma St, Vientiane" />
        <FormGrid :cols="2">
          <TextInput v-model="form.regNo" :label="t('pages.suppliers.registrationNumber')" placeholder="REG-2024-001" />
          <TextInput v-model="form.licenseNo" :label="t('pages.suppliers.licenseNumber')" placeholder="LIC-2024-001" />
        </FormGrid>
        <div class="flex justify-end gap-3">
          <Button variant="outline" @click="showForm = false">{{ t('common.cancel') }}</Button>
          <Button @click="save">{{ editing ? t('pages.categories.saveChanges') : t('pages.suppliers.saveSupplier') }}</Button>
        </div>
      </div>
    </Modal>

    <ConfirmModal
      v-model:open="showDelete"
      :title="t('pages.suppliers.deleteTitle')"
      :message="t('pages.suppliers.deleteMessage', { name: deleteSup?.name ?? '' })"
      @confirm="confirmDelete"
    />

    <!-- ຈ່າຍເງິນໃຫ້ຜູ້ສະໜອງ -->
    <Modal v-model:open="showPayment" :title="t('pages.suppliers.recordPayment')" size="md">
      <div v-if="paymentSupplier" class="space-y-4">
        <div class="bg-slate-50 dark:bg-slate-700/40 rounded-lg p-3 flex items-center justify-between">
          <div class="font-semibold text-slate-800 dark:text-slate-100">{{ paymentSupplier.name }}</div>
          <div class="text-right">
            <div class="text-xl font-bold font-mono text-red-600">{{ formatMoney(paymentSupplier.balance) }}</div>
            <div class="text-xs text-slate-400">{{ t('pages.suppliers.currentBalance') }}</div>
          </div>
        </div>

        <FormGrid :cols="2">
          <TextInput v-model="paymentAmount" :label="t('pages.suppliers.amount')" type="number" placeholder="0" required />
          <TextInput v-model="paymentNote" :label="t('pages.suppliers.noteOptional')" placeholder="" />
        </FormGrid>

        <div class="flex justify-end">
          <Button :disabled="paymentSaving" @click="submitPayment">
            {{ paymentSaving ? t('common.saving') : t('pages.suppliers.submitPayment') }}
          </Button>
        </div>

        <div class="border-t border-slate-100 dark:border-slate-700 pt-3">
          <h4 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">{{ t('pages.suppliers.paymentHistory') }}</h4>
          <div v-if="paymentHistory.length === 0" class="text-sm text-slate-400 py-3 text-center">
            {{ t('pages.suppliers.noPayments') }}
          </div>
          <ul v-else class="space-y-2 max-h-48 overflow-y-auto">
            <li v-for="p in paymentHistory" :key="p.id" class="flex items-center justify-between text-sm">
              <div>
                <div class="text-slate-700 dark:text-slate-200">{{ p.date.slice(0, 10) }} <span class="text-xs text-slate-400">{{ t('pages.suppliers.paidBy', { name: p.by }) }}</span></div>
                <div v-if="p.note" class="text-xs text-slate-400">{{ p.note }}</div>
              </div>
              <span class="font-mono font-semibold text-emerald-600">{{ formatMoney(p.amount) }}</span>
            </li>
          </ul>
        </div>

        <div class="flex justify-end">
          <Button variant="outline" @click="showPayment = false">{{ t('common.close') }}</Button>
        </div>
      </div>
    </Modal>
  </div>
</template>