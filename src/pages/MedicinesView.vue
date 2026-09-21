<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Plus, Eye, Edit2, Trash2, Pill } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import api from '@/api/client'
import { useAuth } from '@/stores/auth'
import { useToast } from '@/stores/toast'
import { apiErrorMessage } from '@/lib/apiError'
import { formatMoney } from '@/utils/money'

import PageHeader from '@/components/ui/PageHeader.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import SearchInput from '@/components/ui/SearchInput.vue'
import SelectInput from '@/components/ui/SelectInput.vue'
import TextInput from '@/components/ui/TextInput.vue'
import Button from '@/components/ui/Button.vue'
import DataTable from '@/components/ui/DataTable.vue'
import TableRow from '@/components/ui/TableRow.vue'
import TableCell from '@/components/ui/TableCell.vue'
import Badge from '@/components/ui/Badge.vue'
import Modal from '@/components/ui/Modal.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import FormGrid from '@/components/ui/FormGrid.vue'
import DetailRow from '@/components/DetailRow.vue'

interface Medicine {
  id: string
  name: string
  generic: string
  brand: string
  category: string | null
  categoryId: string
  supplier: string | null
  supplierId: string | null
  form: string
  strength: string
  unit: string
  barcode: string | null
  sku: string | null
  manufacturer: string
  purchasePrice: number
  sellingPrice: number
  taxRate: number
  minStock: number
  prescription: boolean
}
interface Option { id: string; name: string }

const { t } = useI18n()
const toast = useToast()
const route = useRoute()
const auth = useAuth()

// ບໍ່ໃຫ້ Pharmacy Clerk ເພີ່ມ/ແກ້ໄຂ/ລຶບຢາ — backend ກັນໄວ້ແລ້ວ, ນີ້ແມ່ນເສີມ UX
const canEdit = computed(() => auth.user?.role !== 'PHARMACY_CLERK')

const DOSAGE_FORMS = ['Tablet', 'Capsule', 'Inhaler', 'Syrup', 'Injection', 'Cream', 'Drops']
const opts = (arr: string[]) => arr.map((v) => ({ value: v, label: v }))

const medicines = ref<Medicine[]>([])
const categories = ref<Option[]>([])
const suppliers = ref<Option[]>([])
const loading = ref(false)

async function loadAll() {
  loading.value = true
  try {
    const [medsRes, catsRes] = await Promise.all([
      api.get<Medicine[]>('/medicines'),
      api.get<Option[]>('/categories'),
    ])
    medicines.value = medsRes.data
    categories.value = catsRes.data

    // Pharmacy Clerk ເຫັນ /suppliers ບໍ່ໄດ້ (backend ກັນໄວ້) — ບໍ່ຕ້ອງການເນື່ອງຈາກລາວເພີ່ມ/ແກ້ໄຂຢາບໍ່ໄດ້ຢູ່ແລ້ວ
    if (canEdit.value) {
      const supsRes = await api.get<Option[]>('/suppliers')
      suppliers.value = supsRes.data
    }
  } catch {
    toast.show(t('toasts.medicines.loadFailed'), 'error')
  } finally {
    loading.value = false
  }
}
onMounted(loadAll)

const search = ref('')
const categoryFilter = ref((route.query.category as string) || 'All Categories')
const formFilter = ref('All Forms')

const showAdd = ref(false)
const editing = ref<Medicine | null>(null)
const viewMed = ref<Medicine | null>(null)
const deleteMed = ref<Medicine | null>(null)
const showDelete = ref(false)

const categoryFilterOptions = computed(() => [
  { value: 'All Categories', label: t('pages.medicines.allCategories') },
  ...categories.value.map((c) => ({ value: c.name, label: c.name })),
])
const formFilterOptions = computed(() => [
  { value: 'All Forms', label: t('pages.medicines.allForms') },
  ...DOSAGE_FORMS.map((v) => ({ value: v, label: t(`pages.medicines.forms.${v}`) })),
])

const filtered = computed(() =>
  medicines.value.filter((m) => {
    if (search.value) {
      const q = search.value.toLowerCase()
      if (!m.name.toLowerCase().includes(q) && !m.generic.toLowerCase().includes(q)) return false
    }
    if (categoryFilter.value !== 'All Categories' && m.category !== categoryFilter.value) return false
    if (formFilter.value !== 'All Forms' && m.form !== formFilter.value) return false
    return true
  }),
)

function openView(m: Medicine) {
  viewMed.value = m
}

function askDelete(m: Medicine) {
  deleteMed.value = m
  showDelete.value = true
}

async function confirmDelete() {
  if (!deleteMed.value) return
  const id = deleteMed.value.id
  const name = deleteMed.value.name
  try {
    await api.delete(`/medicines/${id}`)
    medicines.value = medicines.value.filter((x) => x.id !== id)
    toast.show(t('toasts.medicines.deleted', { name }), 'success')
  } catch (e: any) {
    toast.show(apiErrorMessage(e, t) || t('toasts.medicines.deleteFailed'), 'error')
  } finally {
    deleteMed.value = null
  }
}

// ຟອມເພີ່ມຢາໃໝ່
const blankForm = {
  name: '', generic: '', brand: '',
  categoryId: '', supplierId: '',
  form: 'Tablet', strength: '', manufacturer: '',
  barcode: '', sku: '',
  purchasePrice: '', sellingPrice: '', taxRate: '', minStock: '',
  prescription: false,
}
const newMed = reactive({ ...blankForm })

function openAdd() {
  editing.value = null
  Object.assign(newMed, blankForm, { categoryId: categories.value[0]?.id ?? '' })
  showAdd.value = true
}

function openEdit(m: Medicine) {
  editing.value = m
  Object.assign(newMed, {
    name: m.name,
    generic: m.generic,
    brand: m.brand,
    categoryId: m.categoryId,
    supplierId: m.supplierId ?? '',
    form: m.form,
    strength: m.strength,
    manufacturer: m.manufacturer,
    barcode: m.barcode ?? '',
    sku: m.sku ?? '',
    purchasePrice: String(m.purchasePrice),
    sellingPrice: String(m.sellingPrice),
    taxRate: String(m.taxRate),
    minStock: String(m.minStock),
    prescription: m.prescription,
  })
  showAdd.value = true
}

const saving = ref(false)

async function saveMedicine() {
  if (saving.value) return // ກັນກົດ Save ຊ້ຳຂະນະທີ່ request ທຳອິດຍັງບໍ່ສຳເລັດ
  if (!newMed.name || !newMed.generic || !newMed.sellingPrice || !newMed.categoryId) {
    toast.show(t('toasts.medicines.requiredFields'), 'warning')
    return
  }
  saving.value = true

  const body = {
    name: newMed.name,
    genericName: newMed.generic,
    brand: newMed.brand,
    categoryId: newMed.categoryId,
    supplierId: newMed.supplierId || null,
    form: newMed.form,
    strength: newMed.strength,
    manufacturer: newMed.manufacturer,
    barcode: newMed.barcode || null,
    sku: newMed.sku || null,
    purchasePrice: Number(newMed.purchasePrice || 0),
    sellingPrice: Number(newMed.sellingPrice),
    taxRate: Number(newMed.taxRate || 0),
    minStock: Number(newMed.minStock || 0),
    prescriptionRequired: newMed.prescription,
  }

  try {
    if (editing.value) {
      const { data } = await api.put<Medicine>(`/medicines/${editing.value.id}`, body)
      const i = medicines.value.findIndex((x) => x.id === data.id)
      if (i !== -1) medicines.value[i] = data
      toast.show(t('toasts.medicines.updated'), 'success')
    } else {
      const { data } = await api.post<Medicine>('/medicines', body)
      medicines.value.unshift(data)
      toast.show(t('toasts.medicines.created'), 'success')
    }
    showAdd.value = false
  } catch (e: any) {
    toast.show(apiErrorMessage(e, t) || t('toasts.medicines.saveFailed'), 'error')
  } finally {
    saving.value = false
  }
}

const money = formatMoney
</script>

<template>
  <div class="space-y-5">
    <PageHeader :title="t('pages.medicines.title')" :subtitle="t('pages.medicines.subtitle')">
      <template #actions>
        <Button v-if="canEdit" class="font-display" @click="openAdd">
          <Plus class="w-4 h-4" /> {{ t('pages.medicines.addMedicine') }}
        </Button>
      </template>
    </PageHeader>

    <SectionCard>
      <div class="p-4 flex flex-wrap gap-3 items-center">
        <SearchInput v-model="search" :placeholder="t('pages.medicines.searchPlaceholder')" />
        <SelectInput v-model="categoryFilter" :options="categoryFilterOptions" />
        <SelectInput v-model="formFilter" :options="formFilterOptions" />
        <span class="text-xs text-slate-500 dark:text-slate-400 ml-auto">{{ t('pages.medicines.medicinesFound', { n: filtered.length }) }}</span>
      </div>

      <DataTable
        :headers="[
          t('pages.medicines.colMedicineName'), t('pages.medicines.colGenericName'), t('common.category'),
          t('pages.medicines.colBrand'), t('pages.medicines.colForm'), t('pages.medicines.colStrength'),
          t('pages.medicines.colPurchase'), t('pages.medicines.colSelling'), t('pages.dashboard.minStock'),
          t('common.actions'),
        ]"
      >
        <TableRow v-for="m in filtered" :key="m.id">
          <TableCell>
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 bg-blue-50 dark:bg-blue-500/15 rounded-lg flex items-center justify-center flex-shrink-0">
                <Pill class="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <div class="font-medium text-slate-800 dark:text-slate-100 text-sm">{{ m.name }}</div>
                <span v-if="m.prescription" class="text-xs text-purple-500 font-medium">Rx</span>
              </div>
            </div>
          </TableCell>
          <TableCell><span class="text-slate-500 dark:text-slate-400 text-xs">{{ m.generic }}</span></TableCell>
          <TableCell><Badge variant="muted">{{ m.category }}</Badge></TableCell>
          <TableCell><span class="text-sm text-slate-600 dark:text-slate-300">{{ m.brand }}</span></TableCell>
          <TableCell><span class="text-sm text-slate-600 dark:text-slate-300">{{ m.form }}</span></TableCell>
          <TableCell><span class="font-mono text-xs text-slate-600 dark:text-slate-300">{{ m.strength }}</span></TableCell>
          <TableCell><span class="font-mono text-sm">{{ money(m.purchasePrice) }}</span></TableCell>
          <TableCell><span class="font-mono text-sm font-medium text-slate-800 dark:text-slate-100">{{ money(m.sellingPrice) }}</span></TableCell>
          <TableCell><span class="font-mono text-sm text-slate-500 dark:text-slate-400">{{ m.minStock }}</span></TableCell>
          <TableCell>
            <div class="flex items-center gap-1">
              <button class="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded text-blue-500 transition" @click="openView(m)">
                <Eye class="w-4 h-4" />
              </button>
              <button v-if="canEdit" class="p-1.5 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded text-amber-400 transition" @click="openEdit(m)">
                <Edit2 class="w-4 h-4" />
              </button>
              <button v-if="canEdit" class="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded text-red-400 transition" @click="askDelete(m)">
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </TableCell>
        </TableRow>
      </DataTable>

      <div v-if="filtered.length === 0" class="py-16 text-center text-slate-400 text-sm">
        {{ t('pages.medicines.noMatch') }}
      </div>

      <div class="px-4 py-3 border-t border-slate-100 dark:border-slate-700">
        <span class="text-xs text-slate-500 dark:text-slate-400">{{ t('pages.medicines.showingOf', { shown: filtered.length, total: medicines.length }) }}</span>
      </div>
    </SectionCard>

    <!-- ເພີ່ມ/ແກ້ໄຂຢາ -->
    <Modal v-model:open="showAdd" :title="editing ? t('pages.medicines.editMedicine') : t('pages.medicines.addNewMedicine')" size="xl">
      <div class="space-y-5">
        <div>
          <h4 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">{{ t('pages.medicines.sectionBasicInfo') }}</h4>
          <FormGrid :cols="2">
            <TextInput v-model="newMed.name" :label="t('pages.medicines.colMedicineName')" placeholder="e.g. Amoxicillin" required />
            <TextInput v-model="newMed.generic" :label="t('pages.medicines.colGenericName')" placeholder="e.g. Amoxicillin Trihydrate" required />
            <TextInput v-model="newMed.brand" :label="t('pages.medicines.brandName')" placeholder="e.g. Amoxil" />
            <SelectInput v-model="newMed.categoryId" :label="t('common.category')" :options="categories.map((c) => ({ value: c.id, label: c.name }))" />
          </FormGrid>
        </div>

        <div>
          <h4 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">{{ t('pages.medicines.sectionProductDetails') }}</h4>
          <FormGrid :cols="3">
            <SelectInput v-model="newMed.form" :label="t('pages.medicines.dosageForm')" :options="opts(DOSAGE_FORMS).map((o) => ({ value: o.value, label: t(`pages.medicines.forms.${o.value}`) }))" />
            <TextInput v-model="newMed.strength" :label="t('pages.medicines.colStrength')" placeholder="e.g. 500mg" />
            <TextInput v-model="newMed.manufacturer" :label="t('pages.medicines.manufacturer')" placeholder="e.g. GSK" />
            <SelectInput
              v-model="newMed.supplierId"
              :label="t('common.supplier')"
              :options="[{ value: '', label: t('pages.medicines.noSupplier') }, ...suppliers.map((s) => ({ value: s.id, label: s.name }))]"
            />
            <TextInput v-model="newMed.barcode" :label="t('pages.medicines.barcode')" placeholder="8901030865068" />
            <TextInput v-model="newMed.sku" :label="t('pages.medicines.sku')" placeholder="AMX-500-CAP" />
          </FormGrid>
        </div>

        <div>
          <h4 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">{{ t('pages.medicines.sectionPricing') }}</h4>
          <FormGrid :cols="3">
            <TextInput v-model="newMed.purchasePrice" :label="t('pages.medicines.purchasePrice')" type="number" placeholder="0" />
            <TextInput v-model="newMed.sellingPrice" :label="t('pages.medicines.sellingPrice')" type="number" placeholder="0" required />
            <TextInput v-model="newMed.taxRate" :label="t('pages.medicines.taxPercent')" type="number" placeholder="0" />
            <TextInput v-model="newMed.minStock" :label="t('pages.medicines.minimumStock')" type="number" placeholder="10" />
          </FormGrid>
        </div>

        <div class="flex items-center gap-2">
          <input id="rx" v-model="newMed.prescription" type="checkbox" class="rounded" />
          <label for="rx" class="text-sm text-slate-700 dark:text-slate-300">{{ t('pages.medicines.prescriptionRequired') }}</label>
        </div>

        <!-- TODO: ຈຳນວນສະຕັອກ, batch, ວັນໝົດອາຍຸ ຈະເພີ່ມຕອນເຮັດ Batch/FEFO model (ຮອບຕໍ່ໄປ) -->

        <div class="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
          <Button variant="outline" @click="showAdd = false">{{ t('common.cancel') }}</Button>
          <Button :disabled="saving" @click="saveMedicine">{{ saving ? t('common.saving') : (editing ? t('common.saveChanges') : t('pages.medicines.saveMedicine')) }}</Button>
        </div>
      </div>
    </Modal>

    <!-- ລາຍລະອຽດຢາ -->
    <Modal :open="viewMed !== null" :title="t('pages.medicines.medicineDetails')" size="lg" @update:open="(v) => !v && (viewMed = null)">
      <div v-if="viewMed" class="space-y-5">
        <div class="flex items-start gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
          <div class="w-16 h-16 bg-blue-50 dark:bg-blue-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
            <Pill class="w-8 h-8 text-blue-500" />
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <h2 class="text-lg font-bold text-slate-800 dark:text-slate-100 font-display">{{ viewMed.name }}</h2>
              <Badge v-if="viewMed.prescription" variant="info">Rx</Badge>
            </div>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{{ viewMed.generic }} · {{ viewMed.brand }}</p>
            <p class="text-xs text-slate-400 mt-1">{{ viewMed.form }} · {{ viewMed.strength }} · {{ viewMed.category }}</p>
          </div>
          <div class="text-right">
            <div class="text-2xl font-bold text-slate-800 dark:text-slate-100 font-display">{{ money(viewMed.sellingPrice) }}</div>
            <div class="text-xs text-slate-500 dark:text-slate-400">{{ t('pages.medicines.sellingPriceLabel') }}</div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-5">
          <div class="space-y-3">
            <DetailRow :label="t('pages.medicines.barcode')" :value="viewMed.barcode || '—'" mono />
            <DetailRow :label="t('pages.medicines.sku')" :value="viewMed.sku || '—'" mono />
            <DetailRow :label="t('pages.medicines.manufacturer')" :value="viewMed.manufacturer || '—'" />
            <DetailRow :label="t('common.supplier')" :value="viewMed.supplier || '—'" />
          </div>
          <div class="space-y-3">
            <DetailRow :label="t('pages.medicines.minimumStock')" :value="String(viewMed.minStock)" mono />
            <DetailRow :label="t('pages.medicines.purchasePrice')" :value="money(viewMed.purchasePrice)" mono />
            <DetailRow :label="t('pages.medicines.sellingPrice')" :value="money(viewMed.sellingPrice)" mono />
            <DetailRow :label="t('pages.medicines.taxRate')" :value="`${viewMed.taxRate}%`" mono />
          </div>
        </div>

        <p class="text-xs text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-3">
          {{ t('pages.medicines.historyNote') }}
        </p>
      </div>
    </Modal>

    <ConfirmModal
      v-model:open="showDelete"
      :title="t('pages.medicines.deleteTitle')"
      :message="t('pages.medicines.deleteMessage', { name: deleteMed?.name ?? '' })"
      @confirm="confirmDelete"
    />
  </div>
</template>
