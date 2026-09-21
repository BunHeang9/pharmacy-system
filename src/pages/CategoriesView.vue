<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Edit2, Trash2 } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import api from '@/api/client'
import { useToast } from '@/stores/toast'
import { apiErrorMessage } from '@/lib/apiError'

import PageHeader from '@/components/ui/PageHeader.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import SearchInput from '@/components/ui/SearchInput.vue'
import TextInput from '@/components/ui/TextInput.vue'
import Button from '@/components/ui/Button.vue'
import Modal from '@/components/ui/Modal.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'

interface Category {
  id: string
  name: string
  description: string
  icon: string
  medicines: number
}

const { t } = useI18n()
const toast = useToast()
const router = useRouter()

const categories = ref<Category[]>([])
const loading = ref(false)

// ໂຫຼດຈາກ server ຕອນເປີດໜ້າ
async function load() {
  loading.value = true
  try {
    const { data } = await api.get<Category[]>('/categories')
    categories.value = data
  } catch {
    toast.show(t('toasts.categories.loadFailed'), 'error')
  } finally {
    loading.value = false
  }
}
onMounted(load)

const search = ref('')
const showForm = ref(false)
const editing = ref<Category | null>(null)
const deleteItem = ref<Category | null>(null)
const showDelete = ref(false)

const ICONS = ['💊', '🦠', '🌿', '💉', '❤️', '🤧', '🌸', '🫁', '🧴', '👶', '🫀']

const blank = { name: '', description: '', icon: '💊' }
const form = reactive({ ...blank })

const filtered = computed(() =>
  categories.value.filter((c) => !search.value || c.name.toLowerCase().includes(search.value.toLowerCase())),
)

function openCategory(c: Category) {
  router.push({ name: 'medicines', query: { category: c.name } })
}

function openAdd() {
  editing.value = null
  Object.assign(form, blank)
  showForm.value = true
}

function openEdit(c: Category) {
  editing.value = c
  Object.assign(form, { name: c.name, description: c.description, icon: c.icon })
  showForm.value = true
}

async function save() {
  const name = form.name.trim()
  if (!name) {
    toast.show(t('toasts.categories.nameRequired'), 'warning')
    return
  }
  const body = { name, description: form.description, icon: form.icon }

  try {
    if (editing.value) {
      const { data } = await api.put<Category>(`/categories/${editing.value.id}`, body)
      const i = categories.value.findIndex((c) => c.id === data.id)
      if (i !== -1) categories.value[i] = { ...categories.value[i], ...data }
      toast.show(t('toasts.categories.updated'), 'success')
    } else {
      const { data } = await api.post<Category>('/categories', body)
      categories.value.push(data)
      toast.show(t('toasts.categories.created'), 'success')
    }
    showForm.value = false
  } catch (e: any) {
    toast.show(apiErrorMessage(e, t) || t('toasts.categories.saveFailed'), 'error')
  }
}

function askDelete(c: Category) {
  // ກວດໄວກ່ອນ — server ກໍ່ບັງຄັບຄືກັນ
  if (c.medicines > 0) {
    toast.show(t('toasts.categories.deleteBlocked', { count: c.medicines }), 'error')
    return
  }
  deleteItem.value = c
  showDelete.value = true
}

async function confirmDelete() {
  if (!deleteItem.value) return
  const id = deleteItem.value.id
  try {
    await api.delete(`/categories/${id}`)
    categories.value = categories.value.filter((x) => x.id !== id)
    toast.show(t('toasts.categories.deleted'), 'success')
  } catch (e: any) {
    toast.show(apiErrorMessage(e, t) || t('toasts.categories.deleteFailed'), 'error')
  } finally {
    deleteItem.value = null
  }
}

</script>

<template>
  <div class="space-y-5">
    <PageHeader :title="t('pages.categories.title')" :subtitle="t('pages.categories.subtitle')">
      <template #actions>
        <Button @click="openAdd"><Plus class="w-4 h-4" /> {{ t('pages.categories.addCategory') }}</Button>
      </template>
    </PageHeader>

    <SectionCard>
      <div class="p-4">
        <SearchInput v-model="search" :placeholder="t('pages.categories.searchPlaceholder')" />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 pt-0">
        <div
          v-for="c in filtered"
          :key="c.id"
          class="border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition group cursor-pointer"
          role="button"
          tabindex="0"
          @click="openCategory(c)"
          @keydown.enter="openCategory(c)"
        >
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 rounded-lg flex items-center justify-center text-xl">
                {{ c.icon }}
              </div>
              <div>
                <h3 class="font-semibold text-slate-800 dark:text-slate-100">{{ c.name }}</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{{ c.description }}</p>
              </div>
            </div>
            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition">
              <button class="p-1.5 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded text-amber-400 transition" @click.stop="openEdit(c)">
                <Edit2 class="w-3.5 h-3.5" />
              </button>
              <button class="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded text-red-400 transition" @click.stop="askDelete(c)">
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <span class="text-xs text-slate-500 dark:text-slate-400">{{ t('pages.categories.medicinesCount', { n: c.medicines }) }}</span>
            <span class="text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-full">
              {{ t('pages.categories.itemsCount', { n: c.medicines }) }}
            </span>
          </div>
        </div>
      </div>

      <div v-if="filtered.length === 0" class="py-16 text-center text-slate-400 text-sm">
        {{ t('pages.categories.noResults') }}
      </div>
    </SectionCard>

    <Modal v-model:open="showForm" :title="editing ? t('pages.categories.editCategory') : t('pages.categories.addCategory')" size="sm">
      <div class="space-y-4">
        <TextInput v-model="form.name" :label="t('pages.categories.categoryName')" placeholder="e.g. Antibiotics" required />

        <div>
          <label class="block text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">{{ t('pages.categories.icon') }}</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="ic in ICONS"
              :key="ic"
              class="w-9 h-9 rounded-lg text-lg flex items-center justify-center border transition"
              :class="form.icon === ic ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'"
              @click="form.icon = ic"
            >
              {{ ic }}
            </button>
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">{{ t('pages.categories.description') }}</label>
          <textarea
            v-model="form.description"
            rows="3"
            :placeholder="t('pages.categories.descriptionPlaceholder')"
            class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
          />
        </div>

        <div class="flex justify-end gap-3">
          <Button variant="outline" @click="showForm = false">{{ t('common.cancel') }}</Button>
          <Button @click="save">{{ editing ? t('pages.categories.saveChanges') : t('pages.categories.addCategory') }}</Button>
        </div>
      </div>
    </Modal>

    <ConfirmModal
      v-model:open="showDelete"
      :title="t('pages.categories.deleteTitle')"
      :message="t('pages.categories.deleteMessage', { name: deleteItem?.name ?? '' })"
      @confirm="confirmDelete"
    />
  </div>
</template>