<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Eye, Edit2, FileText, Plus, Trash2 } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import api from '@/api/client'
import { useToast } from '@/stores/toast'
import { apiErrorMessage } from '@/lib/apiError'

import PageHeader from '@/components/ui/PageHeader.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import SearchInput from '@/components/ui/SearchInput.vue'
import SelectInput from '@/components/ui/SelectInput.vue'
import TextInput from '@/components/ui/TextInput.vue'
import Button from '@/components/ui/Button.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import DataTable from '@/components/ui/DataTable.vue'
import TableRow from '@/components/ui/TableRow.vue'
import TableCell from '@/components/ui/TableCell.vue'
import Modal from '@/components/ui/Modal.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'

interface Rx {
  id: string
  rxNo: string
  patient: string
  doctor: string
  pharmacist: string | null
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED'
  medicines: number
  date: string
  completedAt: string | null
  notes: string | null
}
interface RxLine {
  medicineId: string
  medicine: string
  quantity: number
  dosageInstructions: string | null
}
type RxDetail = Rx & { lines: RxLine[] }
interface MedOption { id: string; name: string; strength: string }

// StatusBadge (kind="prescription") ໃຊ້ label ແບບ "Pending" — server ສົ່ງມາເປັນ "PENDING"
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending', PROCESSING: 'Processing', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
}

const { t } = useI18n()
const toast = useToast()

const prescriptions = ref<Rx[]>([])
const medicines = ref<MedOption[]>([])

async function loadAll() {
  try {
    const [rxRes, medRes] = await Promise.all([
      api.get<Rx[]>('/prescriptions'),
      api.get<MedOption[]>('/medicines'),
    ])
    prescriptions.value = rxRes.data
    medicines.value = medRes.data
  } catch {
    toast.show(t('toasts.prescriptions.loadFailed'), 'error')
  }
}
onMounted(loadAll)

const search = ref('')
const status = ref('All')
const viewRx = ref<RxDetail | null>(null)
const showAdd = ref(false)
const editing = ref<Rx | null>(null)
const cancelItem = ref<Rx | null>(null)
const showCancel = ref(false)

const STATUS_VALUES = ['All', 'Pending', 'Processing', 'Completed', 'Cancelled']
const STATUSES = computed(() =>
  STATUS_VALUES.map((v) => ({ value: v, label: v === 'All' ? t('pages.prescriptions.allStatuses') : t(`status.${v}`) })),
)
const COUNT_STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED']

const filtered = computed(() =>
  prescriptions.value.filter((p) => {
    if (search.value) {
      const q = search.value.toLowerCase()
      if (!p.rxNo.toLowerCase().includes(q) && !p.patient.toLowerCase().includes(q)) return false
    }
    if (status.value !== 'All' && STATUS_LABELS[p.status] !== status.value) return false
    return true
  }),
)

function countBy(s: string) {
  return prescriptions.value.filter((p) => p.status === s).length
}

async function openRx(p: Rx) {
  try {
    const { data } = await api.get<RxDetail>(`/prescriptions/${p.id}`)
    viewRx.value = data
  } catch {
    toast.show(t('toasts.prescriptions.detailFailed'), 'error')
  }
}

/* ---------- ຟອມສ້າງໃບສັ່ງຢາໃໝ່ ---------- */
interface RxFormLine { medicineId: string; quantity: number | string; dosageInstructions: string }
function blankLine(): RxFormLine {
  return { medicineId: '', quantity: 1, dosageInstructions: '' }
}
const form = reactive({
  patientName: '',
  doctorName: '',
  notes: '',
  lines: [blankLine()] as RxFormLine[],
})

function openAdd() {
  editing.value = null
  Object.assign(form, { patientName: '', doctorName: '', notes: '', lines: [blankLine()] })
  showAdd.value = true
}

// ແກ້ໄຂໄດ້ສະເພາະ PENDING/PROCESSING — ດຶງລາຍລະອຽດເຕັມມາໃສ່ຟອມດຽວກັນກັບຟອມສ້າງ
async function openEdit(p: Rx) {
  try {
    const { data } = await api.get<RxDetail>(`/prescriptions/${p.id}`)
    editing.value = p
    Object.assign(form, {
      patientName: data.patient,
      doctorName: data.doctor,
      notes: data.notes || '',
      lines: data.lines.map((l) => ({
        medicineId: l.medicineId,
        quantity: l.quantity,
        dosageInstructions: l.dosageInstructions || '',
      })),
    })
    showAdd.value = true
  } catch {
    toast.show(t('toasts.prescriptions.detailFailed'), 'error')
  }
}

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

async function createRx() {
  const valid = form.lines.filter((l) => l.medicineId && Number(l.quantity) > 0)
  if (!valid.length) {
    toast.show(t('toasts.prescriptions.minOneMed'), 'warning')
    return
  }
  if (!form.patientName.trim() || !form.doctorName.trim()) {
    toast.show(t('toasts.prescriptions.patientDoctorRequired'), 'warning')
    return
  }
  const body = {
    patientName: form.patientName,
    doctorName: form.doctorName,
    notes: form.notes || undefined,
    items: valid.map((l) => ({
      medicineId: l.medicineId,
      quantity: Number(l.quantity),
      dosageInstructions: l.dosageInstructions || undefined,
    })),
  }

  try {
    if (editing.value) {
      const { data } = await api.put<Rx>(`/prescriptions/${editing.value.id}`, body)
      updateInList(data)
      toast.show(t('toasts.prescriptions.updated'), 'success')
    } else {
      const { data } = await api.post<Rx>('/prescriptions', body)
      prescriptions.value.unshift(data)
      toast.show(t('toasts.prescriptions.created'), 'success')
    }
    showAdd.value = false
  } catch (e: any) {
    toast.show(apiErrorMessage(e, t) || t('toasts.prescriptions.createFailed'), 'error')
  }
}

/* ---------- ຂັ້ນຕອນຈ່າຍຢາ: Pending → Processing → Completed, ຫຼື Cancel ----------*/
function updateInList(rx: Rx) {
  const i = prescriptions.value.findIndex((x) => x.id === rx.id)
  if (i !== -1) prescriptions.value[i] = rx
}

async function setStatus(p: Rx, s: 'PROCESSING' | 'CANCELLED') {
  try {
    const { data } = await api.post<Rx>(`/prescriptions/${p.id}/status`, { status: s })
    updateInList(data)
    viewRx.value = null
    toast.show(
      s === 'CANCELLED' ? t('toasts.prescriptions.cancelled', { no: p.rxNo }) : t('toasts.prescriptions.startDispensing', { no: p.rxNo }),
      s === 'CANCELLED' ? 'warning' : 'info',
    )
  } catch (e: any) {
    toast.show(apiErrorMessage(e, t) || t('toasts.prescriptions.actionFailed'), 'error')
  }
}

function askCancel(p: Rx) {
  cancelItem.value = p
  showCancel.value = true
}

async function confirmCancel() {
  if (!cancelItem.value) return
  await setStatus(cancelItem.value, 'CANCELLED')
  cancelItem.value = null
}

async function complete(p: RxDetail) {
  try {
    const { data } = await api.post<Rx>(`/prescriptions/${p.id}/complete`)
    updateInList(data)
    viewRx.value = null
    toast.show(t('toasts.prescriptions.completed', { no: p.rxNo }), 'success')
  } catch (e: any) {
    toast.show(apiErrorMessage(e, t) || t('toasts.prescriptions.completeFailed'), 'error')
  }
}
</script>

<template>
  <div class="space-y-5">
    <PageHeader :title="t('pages.prescriptions.title')" :subtitle="t('pages.prescriptions.subtitle')">
      <template #actions>
        <Button @click="openAdd"><FileText class="w-4 h-4" /> {{ t('pages.prescriptions.newPrescription') }}</Button>
      </template>
    </PageHeader>

    <div class="grid grid-cols-4 gap-4">
      <div v-for="s in COUNT_STATUSES" :key="s" class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
        <div class="text-xs text-slate-500 dark:text-slate-400 font-medium">{{ STATUS_LABELS[s] ? t(`status.${STATUS_LABELS[s]}`) : s }}</div>
        <div class="text-2xl font-bold text-slate-800 dark:text-slate-100 font-display mt-1">{{ countBy(s) }}</div>
      </div>
    </div>

    <SectionCard>
      <div class="p-4 flex gap-3 flex-wrap">
        <SearchInput v-model="search" :placeholder="t('pages.prescriptions.searchPlaceholder')" />
        <SelectInput v-model="status" :options="STATUSES" />
        <span class="text-xs text-slate-500 dark:text-slate-400 ml-auto self-center">{{ t('pages.prescriptions.prescriptionsCount', { n: filtered.length }) }}</span>
      </div>

      <DataTable :headers="[t('pages.prescriptions.colRxNo'), t('pages.prescriptions.colPatient'), t('pages.prescriptions.colDoctor'), t('common.date'), t('common.medicine'), t('common.status'), t('pages.prescriptions.colPharmacist'), t('common.actions')]">
        <TableRow v-for="p in filtered" :key="p.id">
          <TableCell><span class="font-mono text-xs text-blue-600 font-medium">{{ p.rxNo }}</span></TableCell>
          <TableCell><span class="font-medium text-slate-800 dark:text-slate-100">{{ p.patient }}</span></TableCell>
          <TableCell><span class="text-sm text-slate-500 dark:text-slate-400">{{ p.doctor }}</span></TableCell>
          <TableCell><span class="text-sm text-slate-500 dark:text-slate-400">{{ p.date }}</span></TableCell>
          <TableCell><span class="font-mono">{{ p.medicines }}</span></TableCell>
          <TableCell><StatusBadge kind="prescription" :status="STATUS_LABELS[p.status] ?? p.status" /></TableCell>
          <TableCell><span class="text-sm text-slate-500 dark:text-slate-400">{{ p.pharmacist || '—' }}</span></TableCell>
          <TableCell>
            <div class="flex items-center gap-1">
              <button class="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded text-blue-500 transition" @click="openRx(p)">
                <Eye class="w-4 h-4" />
              </button>
              <template v-if="p.status === 'PENDING' || p.status === 'PROCESSING'">
                <button class="p-1.5 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded text-amber-400 transition" @click="openEdit(p)">
                  <Edit2 class="w-4 h-4" />
                </button>
                <button class="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded text-red-400 transition" @click="askCancel(p)">
                  <Trash2 class="w-4 h-4" />
                </button>
              </template>
            </div>
          </TableCell>
        </TableRow>
      </DataTable>

      <div v-if="filtered.length === 0" class="py-16 text-center text-slate-400 text-sm">
        {{ t('pages.prescriptions.noResults') }}
      </div>
    </SectionCard>

    <!-- ສ້າງໃບສັ່ງຢາໃໝ່ -->
    <Modal v-model:open="showAdd" :title="editing ? t('pages.prescriptions.editPrescription') : t('pages.prescriptions.newPrescription')" size="xl">
      <div class="space-y-5">
        <div class="grid grid-cols-2 gap-4">
          <TextInput v-model="form.patientName" :label="t('pages.prescriptions.colPatient')" placeholder="e.g. James Rodriguez" required />
          <TextInput v-model="form.doctorName" :label="t('pages.prescriptions.colDoctor')" placeholder="e.g. Dr. Sarah Mitchell" required />
        </div>

        <div>
          <h4 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">{{ t('pages.prescriptions.prescribedMedicines') }}</h4>
          <div class="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40">
                    <th v-for="h in [t('common.medicine'), t('pages.purchases.colQty'), t('pages.prescriptions.colDosage'), '']" :key="h" class="text-left px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap">
                      {{ h }}
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-50 dark:divide-slate-700/60">
                  <tr v-for="(l, i) in form.lines" :key="i">
                    <td class="px-3 py-2">
                      <select v-model="l.medicineId" class="w-48 px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded">
                        <option value="">{{ t('pages.prescriptions.selectMedicine') }}</option>
                        <option v-for="m in medicines" :key="m.id" :value="m.id">{{ m.name }} {{ m.strength }}</option>
                      </select>
                    </td>
                    <td class="px-3 py-2">
                      <input v-model.number="l.quantity" type="number" min="1" class="w-16 px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded font-mono" />
                    </td>
                    <td class="px-3 py-2">
                      <input v-model="l.dosageInstructions" placeholder="e.g. Take twice daily after meals" class="w-64 px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 rounded" />
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
            <div class="p-3 border-t border-slate-100 dark:border-slate-700">
              <button class="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1" @click="addLine">
                <Plus class="w-4 h-4" /> {{ t('pages.prescriptions.addMedicine') }}
              </button>
            </div>
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">{{ t('pages.prescriptions.notesOptional') }}</label>
          <textarea v-model="form.notes" rows="2" :placeholder="t('pages.prescriptions.notesPlaceholder')" class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-lg placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
        </div>

        <div class="flex justify-end gap-3">
          <Button variant="outline" @click="showAdd = false">{{ t('common.cancel') }}</Button>
          <Button @click="createRx">{{ editing ? t('common.saveChanges') : t('pages.prescriptions.createPrescription') }}</Button>
        </div>
      </div>
    </Modal>

    <!-- ລາຍລະອຽດໃບສັ່ງຢາ -->
    <Modal :open="viewRx !== null" :title="t('pages.prescriptions.detailTitle', { no: viewRx?.rxNo ?? '' })" size="lg" @update:open="(v) => !v && (viewRx = null)">
      <div v-if="viewRx" class="space-y-4">
        <div class="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
          <div>
            <div class="text-xs text-slate-400 mb-1">{{ t('pages.prescriptions.colPatient') }}</div>
            <div class="font-semibold text-slate-800 dark:text-slate-100">{{ viewRx.patient }}</div>
          </div>
          <div>
            <div class="text-xs text-slate-400 mb-1">{{ t('pages.prescriptions.colDoctor') }}</div>
            <div class="font-semibold text-slate-800 dark:text-slate-100">{{ viewRx.doctor }}</div>
          </div>
          <div>
            <div class="text-xs text-slate-400 mb-1">{{ t('pages.prescriptions.prescriptionDate') }}</div>
            <div class="text-slate-700 dark:text-slate-200">{{ viewRx.date }}</div>
          </div>
          <div>
            <div class="text-xs text-slate-400 mb-1">{{ t('common.status') }}</div>
            <StatusBadge kind="prescription" :status="STATUS_LABELS[viewRx.status] ?? viewRx.status" />
          </div>
          <div v-if="viewRx.pharmacist">
            <div class="text-xs text-slate-400 mb-1">{{ t('pages.prescriptions.colPharmacist') }}</div>
            <div class="text-slate-700 dark:text-slate-200">{{ viewRx.pharmacist }}</div>
          </div>
          <div v-if="viewRx.notes">
            <div class="text-xs text-slate-400 mb-1">{{ t('pages.prescriptions.notesOptional') }}</div>
            <div class="text-slate-700 dark:text-slate-200">{{ viewRx.notes }}</div>
          </div>
        </div>

        <h4 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{{ t('pages.prescriptions.prescribedMedicines') }}</h4>
        <DataTable :headers="[t('common.medicine'), t('pages.inventory.quantity'), t('pages.prescriptions.colDosage')]">
          <TableRow v-for="(l, idx) in viewRx.lines" :key="idx">
            <TableCell><span class="font-medium">{{ l.medicine }}</span></TableCell>
            <TableCell><span class="font-mono">{{ l.quantity }}</span></TableCell>
            <TableCell><span class="text-xs text-slate-500 dark:text-slate-400">{{ l.dosageInstructions || '—' }}</span></TableCell>
          </TableRow>
        </DataTable>

        <div class="flex justify-end gap-3">
          <Button variant="outline" @click="viewRx = null">{{ t('common.close') }}</Button>
          <Button
            v-if="viewRx.status === 'PENDING' || viewRx.status === 'PROCESSING'"
            variant="danger"
            @click="setStatus(viewRx, 'CANCELLED')"
          >
            {{ t('pages.prescriptions.cancelRx') }}
          </Button>
          <Button v-if="viewRx.status === 'PENDING'" @click="setStatus(viewRx, 'PROCESSING')">{{ t('pages.prescriptions.startDispensing') }}</Button>
          <Button v-else-if="viewRx.status === 'PROCESSING'" variant="secondary" @click="complete(viewRx)">
            {{ t('pages.prescriptions.markComplete') }}
          </Button>
        </div>
      </div>
    </Modal>

    <ConfirmModal
      v-model:open="showCancel"
      :title="t('pages.prescriptions.cancelTitle')"
      :message="t('pages.prescriptions.cancelMessage', { no: cancelItem?.rxNo ?? '' })"
      @confirm="confirmCancel"
    />
  </div>
</template>
