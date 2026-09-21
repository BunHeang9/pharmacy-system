<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus, Edit2, Trash2, Shield, Check } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import api from '@/api/client'
import { useToast } from '@/stores/toast'
import { useAuth } from '@/stores/auth'
import { apiErrorMessage } from '@/lib/apiError'

import PageHeader from '@/components/ui/PageHeader.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import SearchInput from '@/components/ui/SearchInput.vue'
import TextInput from '@/components/ui/TextInput.vue'
import SelectInput from '@/components/ui/SelectInput.vue'
import Button from '@/components/ui/Button.vue'
import Badge from '@/components/ui/Badge.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import DataTable from '@/components/ui/DataTable.vue'
import TableRow from '@/components/ui/TableRow.vue'
import TableCell from '@/components/ui/TableCell.vue'
import Modal from '@/components/ui/Modal.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import FormGrid from '@/components/ui/FormGrid.vue'

type Role = 'SUPER_ADMIN' | 'ADMIN' | 'PHARMACIST' | 'CASHIER' | 'INVENTORY_MANAGER'|'PHARMACY_CLERK'

interface Staff {
  id: string
  name: string
  email: string
  phone: string | null
  role: Role
  status: 'Active' | 'Inactive'
  lastLogin: string
}

// StatusBadge (kind="role") ໃຊ້ label ແບບ "Super Admin" — server ສົ່ງມາເປັນ "SUPER_ADMIN"
const ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN', 'PHARMACIST', 'CASHIER', 'INVENTORY_MANAGER', 'PHARMACY_CLERK']
const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  PHARMACIST: 'Pharmacist',
  CASHIER: 'Cashier',
  INVENTORY_MANAGER: 'Inventory Manager',
  PHARMACY_CLERK: 'Pharmacy Clerk',
}


const { t, tm } = useI18n()
const toast = useToast()
const auth = useAuth()

const staff = ref<Staff[]>([])

async function load() {
  try {
    const { data } = await api.get<Staff[]>('/users')
    staff.value = data
  } catch {
    toast.show(t('toasts.users.loadFailed'), 'error')
  }
}
onMounted(load)

const search = ref('')
const showForm = ref(false)
const showRoles = ref(false)
const selectedRole = ref<Role>('ADMIN')
const editing = ref<Staff | null>(null)
const deactivateItem = ref<Staff | null>(null)
const showDeactivate = ref(false)

const blank = { name: '', email: '', phone: '', role: 'CASHIER' as Role, password: '', confirm: '' }
const form = reactive({ ...blank })

const filtered = computed(() =>
  staff.value.filter(
    (s) =>
      !search.value ||
      s.name.toLowerCase().includes(search.value.toLowerCase()) ||
      s.email.toLowerCase().includes(search.value.toLowerCase()),
  ),
)

function countRole(role: Role) {
  return staff.value.filter((s) => s.role === role).length
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2)
}

function openAdd() {
  editing.value = null
  Object.assign(form, blank)
  showForm.value = true
}

function openEdit(s: Staff) {
  editing.value = s
  Object.assign(form, { name: s.name, email: s.email, phone: s.phone ?? '', role: s.role, password: '', confirm: '' })
  showForm.value = true
}

async function save() {
  if (!form.name.trim() || !form.email.trim()) {
    toast.show(t('toasts.users.nameEmailRequired'), 'warning')
    return
  }

  if (editing.value) {
    if (form.password && form.password.length < 8) {
      toast.show(t('toasts.users.passwordTooShort'), 'warning')
      return
    }
    if (form.password && form.password !== form.confirm) {
      toast.show(t('toasts.users.passwordMismatch'), 'error')
      return
    }
    try {
      const { data } = await api.put<Staff>(`/users/${editing.value.id}`, {
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        role: form.role,
        ...(form.password ? { password: form.password } : {}),
      })
      const i = staff.value.findIndex((s) => s.id === data.id)
      if (i !== -1) staff.value[i] = data
      toast.show(t('toasts.users.updated'), 'success')
      showForm.value = false
    } catch (e: any) {
      toast.show(apiErrorMessage(e, t) || t('toasts.users.updateFailed'), 'error')
    }
  } else {
    if (!form.password) {
      toast.show(t('toasts.users.passwordRequired'), 'warning')
      return
    }
    if (form.password.length < 8) {
      toast.show(t('toasts.users.passwordTooShort'), 'warning')
      return
    }
    if (form.password !== form.confirm) {
      toast.show(t('toasts.users.passwordMismatch'), 'error')
      return
    }
    try {
      const { data } = await api.post<Staff>('/users', {
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        role: form.role,
        password: form.password,
      })
      staff.value.unshift(data)
      toast.show(t('toasts.users.created'), 'success')
      showForm.value = false
    } catch (e: any) {
      toast.show(apiErrorMessage(e, t) || t('toasts.users.createFailed'), 'error')
    }
  }
}

async function toggleStatus(s: Staff) {
  try {
    const { data } = await api.post<Staff>(`/users/${s.id}/toggle-status`)
    const i = staff.value.findIndex((x) => x.id === s.id)
    if (i !== -1) staff.value[i] = data
    toast.show(t('toasts.users.statusChanged', { name: data.name, status: t(`toasts.users.status.${data.status}`) }), 'info')
  } catch (e: any) {
    // ເຊັ່ນ: ພະຍາຍາມປິດບັນຊີຕົນເອງ (409)
    toast.show(apiErrorMessage(e, t) || t('toasts.users.actionFailed'), 'error')
  }
}

// "delete" ຂອງພະນັກງານ = ປິດການໃຊ້ງານ (deactivate) ບໍ່ແມ່ນລຶບຈິງ — server ບໍ່ມີ true delete ໃຫ້ user
function askDeactivate(s: Staff) {
  deactivateItem.value = s
  showDeactivate.value = true
}

async function confirmDeactivate() {
  if (!deactivateItem.value) return
  await toggleStatus(deactivateItem.value)
  deactivateItem.value = null
}
</script>

<template>
  <div class="space-y-5">
    <PageHeader :title="t('pages.users.title')" :subtitle="t('pages.users.subtitle')">
      <template #actions>
        <Button variant="outline" @click="showRoles = true"><Shield class="w-4 h-4" /> {{ t('pages.users.rolePermissions') }}</Button>
        <Button @click="openAdd"><Plus class="w-4 h-4" /> {{ t('pages.users.addStaff') }}</Button>
      </template>
    </PageHeader>

        <div class="grid grid-cols-3 md:grid-cols-6 gap-3">
      <div v-for="role in ROLES" :key="role" class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 shadow-sm text-center">
        <div class="text-xl font-bold text-slate-800 dark:text-slate-100 font-display">{{ countRole(role) }}</div>
        <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">{{ t(`status.${ROLE_LABELS[role]}`) }}</div>
      </div>
    </div>

    <SectionCard>
      <div class="p-4">
        <SearchInput v-model="search" :placeholder="t('pages.users.searchPlaceholder')" />
      </div>

      <DataTable :headers="[t('pages.users.colStaffName'), t('common.email'), t('common.phone'), t('pages.users.colRole'), t('common.status'), t('pages.users.colLastLogin'), t('common.actions')]">
        <TableRow v-for="s in filtered" :key="s.id">
          <TableCell>
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                <span class="text-xs font-bold text-indigo-600">{{ initials(s.name) }}</span>
              </div>
              <span class="font-medium text-slate-800 dark:text-slate-100">{{ s.name }}</span>
            </div>
          </TableCell>
          <TableCell><span class="text-sm text-slate-500 dark:text-slate-400">{{ s.email }}</span></TableCell>
          <TableCell><span class="font-mono text-xs text-slate-500 dark:text-slate-400">{{ s.phone || '—' }}</span></TableCell>
          <TableCell><StatusBadge kind="role" :status="ROLE_LABELS[s.role]" /></TableCell>
          <TableCell>
            <button @click="toggleStatus(s)">
              <Badge :variant="s.status === 'Active' ? 'success' : 'muted'">{{ t(`status.${s.status}`) }}</Badge>
            </button>
          </TableCell>
          <TableCell><span class="text-xs text-slate-500 dark:text-slate-400">{{ s.lastLogin }}</span></TableCell>
          <TableCell>
            <div class="flex items-center gap-1">
              <button class="p-1.5 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded text-amber-500 transition" @click="openEdit(s)">
                <Edit2 class="w-4 h-4" />
              </button>
              <button
                v-if="s.status === 'Active' && s.id !== auth.user?.id"
                class="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded text-red-400 transition"
                @click="askDeactivate(s)"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </TableCell>
        </TableRow>
      </DataTable>

      <div v-if="filtered.length === 0" class="py-16 text-center text-slate-400 text-sm">
        {{ t('pages.users.noResults') }}
      </div>
    </SectionCard>

    <!-- ເພີ່ມ / ແກ້ໄຂພະນັກງານ -->
    <Modal v-model:open="showForm" :title="editing ? t('pages.users.editStaffMember') : t('pages.users.addStaffMember')" size="md">
      <div class="space-y-4">
        <FormGrid :cols="2">
          <TextInput v-model="form.name" :label="t('pages.users.fullName')" placeholder="John Smith" required />
          <TextInput v-model="form.email" :label="t('common.email')" placeholder="john@rxpharm.com" required />
          <TextInput v-model="form.phone" :label="t('common.phone')" placeholder="+856 20 5555 0306" />
          <SelectInput v-model="form.role" :label="t('pages.users.colRole')" :options="ROLES.map((r) => ({ value: r, label: t(`status.${ROLE_LABELS[r]}`) }))" />
        </FormGrid>

        <FormGrid :cols="2">
          <TextInput
            v-model="form.password"
            :label="editing ? t('pages.users.newPasswordKeep') : t('pages.users.password')"
            type="password"
            placeholder="••••••••"
          />
          <TextInput v-model="form.confirm" :label="t('pages.users.confirmPassword')" type="password" placeholder="••••••••" />
        </FormGrid>

        <div class="flex justify-end gap-3">
          <Button variant="outline" @click="showForm = false">{{ t('common.cancel') }}</Button>
          <Button @click="save">{{ editing ? t('pages.categories.saveChanges') : t('pages.users.createAccount') }}</Button>
        </div>
      </div>
    </Modal>

    <!-- ສິດການໃຊ້ງານ -->
    <Modal v-model:open="showRoles" :title="t('pages.users.rolePermissions')" size="lg">
      <div class="space-y-4">
        <div class="flex gap-2 flex-wrap">
          <button
            v-for="r in ROLES"
            :key="r"
            class="px-3 py-1.5 rounded-lg text-sm font-medium transition"
            :class="selectedRole === r ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'"
            @click="selectedRole = r"
          >
            {{ t(`status.${ROLE_LABELS[r]}`) }}
          </button>
        </div>

        <div class="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-4">
          <h4 class="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">{{ t('pages.users.permissionsTitle', { role: t(`status.${ROLE_LABELS[selectedRole]}`) }) }}</h4>
          <div class="space-y-2">
            <div v-for="p in (tm(`pages.users.permissions.${selectedRole}`) as unknown as string[])" :key="p" class="flex items-center gap-2">
              <div class="w-5 h-5 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Check class="w-3 h-3 text-emerald-600" stroke-width="3" />
              </div>
              <span class="text-sm text-slate-700 dark:text-slate-200">{{ p }}</span>
            </div>
          </div>
        </div>

        <p class="text-xs text-slate-400">
          {{ t('pages.users.permissionsFooterNote') }}
        </p>
      </div>
    </Modal>

    <ConfirmModal
      v-model:open="showDeactivate"
      :title="t('pages.users.deactivateTitle')"
      :message="t('pages.users.deactivateMessage', { name: deactivateItem?.name ?? '' })"
      @confirm="confirmDeactivate"
    />
  </div>
</template>
