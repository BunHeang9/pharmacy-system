<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus, Eye, Edit2, Trash2, Users } from 'lucide-vue-next'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import { useI18n } from 'vue-i18n'
import api from '@/api/client'
import { useToast } from '@/stores/toast'
import { apiErrorMessage } from '@/lib/apiError'
import { formatMoney } from '@/utils/money'

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
import FormGrid from '@/components/ui/FormGrid.vue'

interface Customer {
  id: string
  name: string
  phone: string | null
  discount: number
  purchases: number
  lastPurchase: string | null
  status: 'Active' | 'Inactive'
}
interface CustomerSale {
  id: string
  saleNo: string
  date: string
  items: number
  total: number
  paymentMethod: string
}

const { t } = useI18n()
const toast = useToast()

const customers = ref<Customer[]>([])

async function load() {
  try {
    const { data } = await api.get<Customer[]>('/customers')
    customers.value = data
  } catch {
    toast.show(t('toasts.customers.loadFailed'), 'error')
  }
}
onMounted(load)

const search = ref('')
const viewCustomer = ref<Customer | null>(null)
const customerSales = ref<CustomerSale[]>([])
const showAdd = ref(false)
const editing = ref<Customer | null>(null)
const deleteItem = ref<Customer | null>(null)
const showDelete = ref(false)

async function openView(c: Customer) {
  viewCustomer.value = c
  customerSales.value = []
  try {
    const { data } = await api.get<CustomerSale[]>(`/customers/${c.id}/sales`)
    customerSales.value = data
  } catch {
    toast.show(t('toasts.customers.salesLoadFailed'), 'error')
  }
}
const paymentMethodLabel = (m: string) => t(`pages.pos.paymentMethods.${m.toLowerCase()}`)

const filtered = computed(() =>
  customers.value.filter(
    (c) =>
      !search.value ||
      c.name.toLowerCase().includes(search.value.toLowerCase()) ||
      (c.phone ?? '').includes(search.value),
  ),
)

const activeCount = computed(() => customers.value.filter((c) => c.status === 'Active').length)
const totalRevenue = computed(() => customers.value.reduce((s, c) => s + c.purchases, 0))

const blank = { name: '', phone: '', discountPct: '' }
const form = reactive({ ...blank })

function openAdd() {
  editing.value = null
  Object.assign(form, blank)
  showAdd.value = true
}

function openEdit(c: Customer) {
  editing.value = c
  Object.assign(form, { name: c.name, phone: c.phone ?? '', discountPct: String(c.discount) })
  showAdd.value = true
}
async function saveCustomer() {
  if (!form.name.trim()) {
    toast.show(t('toasts.customers.nameRequired'), 'warning')
    return
  }
  const discountPct = Number(form.discountPct || 0)
  if (discountPct < 0 || discountPct > 100) {
    toast.show(t('toasts.customers.discountRange'), 'warning')
    return
  }
  const body = { name: form.name, phone: form.phone || undefined, discountPct }

  try {
    if (editing.value) {
      const { data } = await api.put<Customer>(`/customers/${editing.value.id}`, body)
      const i = customers.value.findIndex((c) => c.id === data.id)
      if (i !== -1) customers.value[i] = { ...customers.value[i], ...data }
      toast.show(t('toasts.customers.updated'), 'success')
    } else {
      const { data } = await api.post<Customer>('/customers', body)
      customers.value.unshift(data)
      toast.show(t('toasts.customers.created'), 'success')
    }
    showAdd.value = false
  } catch (e: any) {
    // ເຊັ່ນ: ເບີໂທຊ້ຳ (409) — server ກວດໃຫ້
    toast.show(apiErrorMessage(e, t) || t('toasts.customers.saveFailed'), 'error')
  }
}

function askDelete(c: Customer) {
  deleteItem.value = c
  showDelete.value = true
}

async function confirmDelete() {
  if (!deleteItem.value) return
  const id = deleteItem.value.id
  try {
    await api.delete(`/customers/${id}`)
    customers.value = customers.value.filter((x) => x.id !== id)
    toast.show(t('toasts.customers.deleted'), 'success')
  } catch (e: any) {
    toast.show(apiErrorMessage(e, t) || t('toasts.customers.deleteFailed'), 'error')
  } finally {
    deleteItem.value = null
  }
}

</script>

<template>
  <div class="space-y-5">
    <PageHeader :title="t('pages.customers.title')" :subtitle="t('pages.customers.subtitle')">
      <template #actions>
        <Button @click="openAdd"><Plus class="w-4 h-4" /> {{ t('pages.customers.addCustomer') }}</Button>
      </template>
    </PageHeader>

    <div class="grid grid-cols-3 gap-4">
      <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
        <div class="text-xs text-slate-500 dark:text-slate-400 font-medium">{{ t('pages.customers.totalCustomers') }}</div>
        <div class="text-2xl font-bold text-slate-800 dark:text-slate-100 font-display mt-1">{{ customers.length }}</div>
      </div>
      <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
        <div class="text-xs text-slate-500 dark:text-slate-400 font-medium">{{ t('pages.customers.activeCustomers') }}</div>
        <div class="text-2xl font-bold text-slate-800 dark:text-slate-100 font-display mt-1">{{ activeCount }}</div>
      </div>
      <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
        <div class="text-xs text-slate-500 dark:text-slate-400 font-medium">{{ t('pages.customers.totalRevenue') }}</div>
        <div class="text-2xl font-bold text-slate-800 dark:text-slate-100 font-display mt-1">{{ formatMoney(totalRevenue) }}</div>
      </div>
    </div>

    <SectionCard>
      <div class="p-4 flex gap-3">
        <SearchInput v-model="search" :placeholder="t('pages.customers.searchPlaceholder')" />
        <span class="text-xs text-slate-500 dark:text-slate-400 ml-auto self-center">{{ t('pages.customers.customersCount', { n: filtered.length }) }}</span>
      </div>

      <DataTable :headers="[t('common.name'), t('common.phone'), t('common.discount'), t('pages.customers.colTotalPurchases'), t('common.status'), t('common.actions')]">
        <TableRow v-for="c in filtered" :key="c.id">
          <TableCell>
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 bg-purple-50 dark:bg-purple-500/15 rounded-full flex items-center justify-center flex-shrink-0">
                <span class="text-xs font-bold text-purple-600 dark:text-purple-300">{{ c.name[0] }}</span>
              </div>
              <span class="font-medium text-slate-800 dark:text-slate-100">{{ c.name }}</span>
            </div>
          </TableCell>
          <TableCell><span class="font-mono text-xs text-slate-500 dark:text-slate-400">{{ c.phone || '—' }}</span></TableCell>
          <TableCell>
            <Badge :variant="c.discount > 0 ? 'info' : 'muted'">{{ c.discount }}%</Badge>
          </TableCell>
          <TableCell><span class="font-mono font-semibold text-slate-800 dark:text-slate-100">{{ formatMoney(c.purchases) }}</span></TableCell>
          <TableCell>
            <Badge :variant="c.status === 'Active' ? 'success' : 'muted'">{{ t(`status.${c.status}`) }}</Badge>
          </TableCell>
          <TableCell>
            <div class="flex items-center gap-1">
              <button class="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded text-blue-500 transition" @click="openView(c)">
                <Eye class="w-4 h-4" />
              </button>
              <button class="p-1.5 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded text-amber-400 transition" @click="openEdit(c)">
                <Edit2 class="w-4 h-4" />
              </button>
              <button class="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded text-red-400 transition" @click="askDelete(c)">
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </TableCell>
        </TableRow>
      </DataTable>

      <div v-if="filtered.length === 0" class="py-16 text-center text-slate-400 text-sm">
        {{ t('pages.customers.noResults') }}
      </div>
    </SectionCard>

    <!-- ໂປຣໄຟລ໌ລູກຄ້າ -->
    <Modal :open="viewCustomer !== null" :title="t('pages.customers.customerProfile')" size="lg" @update:open="(v) => !v && (viewCustomer = null)">
      <div v-if="viewCustomer" class="space-y-5">
        <div class="flex items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
          <div class="w-14 h-14 bg-purple-100 dark:bg-purple-500/15 rounded-full flex items-center justify-center">
            <Users class="w-7 h-7 text-purple-500" />
          </div>
          <div>
            <h2 class="text-lg font-bold text-slate-800 dark:text-slate-100 font-display">{{ viewCustomer.name }}</h2>
          </div>
          <div class="ml-auto text-right">
            <div class="text-xl font-bold text-slate-800 dark:text-slate-100 font-mono">{{ formatMoney(viewCustomer.purchases) }}</div>
            <div class="text-xs text-slate-400">{{ t('pages.customers.totalPurchasesLabel') }}</div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="bg-slate-50 dark:bg-slate-700/40 rounded-lg p-3">
            <div class="text-xs text-slate-400 mb-0.5">{{ t('common.phone') }}</div>
            <div class="text-sm font-medium text-slate-800 dark:text-slate-100">{{ viewCustomer.phone || '—' }}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-700/40 rounded-lg p-3">
            <div class="text-xs text-slate-400 mb-0.5">{{ t('pages.customers.memberDiscount') }}</div>
            <div class="text-sm font-medium text-slate-800 dark:text-slate-100">{{ viewCustomer.discount }}%</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-700/40 rounded-lg p-3">
            <div class="text-xs text-slate-400 mb-0.5">{{ t('pages.customers.lastPurchase') }}</div>
            <div class="text-sm font-medium text-slate-800 dark:text-slate-100">{{ viewCustomer.lastPurchase || t('pages.customers.noPurchasesYet') }}</div>
          </div>
        </div>

        <div class="border-t border-slate-100 dark:border-slate-700 pt-3">
          <h4 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">{{ t('pages.customers.purchaseHistory') }}</h4>
          <DataTable v-if="customerSales.length" :headers="[t('pages.sales.colInvoiceNo'), t('common.date'), t('pages.purchases.colItems'), t('common.total'), t('pages.sales.colMethod')]">
            <TableRow v-for="s in customerSales" :key="s.id">
              <TableCell><span class="font-mono text-xs text-blue-600">{{ s.saleNo }}</span></TableCell>
              <TableCell><span class="text-sm">{{ s.date.slice(0, 10) }}</span></TableCell>
              <TableCell><span class="font-mono">{{ s.items }}</span></TableCell>
              <TableCell><span class="font-mono font-semibold">{{ formatMoney(s.total) }}</span></TableCell>
              <TableCell><Badge variant="muted">{{ paymentMethodLabel(s.paymentMethod) }}</Badge></TableCell>
            </TableRow>
          </DataTable>
          <p v-else class="text-sm text-slate-400 text-center py-4">{{ t('pages.customers.noPurchasesYet') }}</p>
        </div>
      </div>
    </Modal>

    <!-- ເພີ່ມ/ແກ້ໄຂລູກຄ້າ -->
    <Modal v-model:open="showAdd" :title="editing ? t('pages.customers.editCustomer') : t('pages.customers.addCustomer')" size="md">
      <div class="space-y-4">
        <FormGrid :cols="2">
          <TextInput v-model="form.name" :label="t('pages.customers.fullName')" placeholder="Margaret Thompson" required />
          <TextInput v-model="form.phone" :label="t('common.phone')" placeholder="+856 20 5555 0201" />
          <TextInput v-model="form.discountPct" :label="t('pages.customers.memberDiscountPercent')" type="number" placeholder="0" />
        </FormGrid>
        <div class="flex justify-end gap-3">
          <Button variant="outline" @click="showAdd = false">{{ t('common.cancel') }}</Button>
          <Button @click="saveCustomer">{{ editing ? t('common.saveChanges') : t('pages.customers.saveCustomer') }}</Button>
        </div>
      </div>
    </Modal>

    <ConfirmModal
      v-model:open="showDelete"
      :title="t('pages.customers.deleteTitle')"
      :message="t('pages.customers.deleteMessage', { name: deleteItem?.name ?? '' })"
      @confirm="confirmDelete"
    />
  </div>
</template>
