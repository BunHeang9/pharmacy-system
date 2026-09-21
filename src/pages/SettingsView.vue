<script setup lang="ts">
import { computed, reactive, ref, onMounted } from 'vue'
import { Save } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import api from '@/api/client'
import { apiErrorMessage } from '@/lib/apiError'
import { useToast } from '@/stores/toast'
import { useLocale, LOCALE_LABELS } from '@/stores/locale'
import { useSettings } from '@/stores/settings'
import { SUPPORTED_LOCALES, type LocaleCode } from '@/i18n'

import PageHeader from '@/components/ui/PageHeader.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import TabsBar from '@/components/ui/TabsBar.vue'
import FormGrid from '@/components/ui/FormGrid.vue'
import TextInput from '@/components/ui/TextInput.vue'
import SelectInput from '@/components/ui/SelectInput.vue'
import Button from '@/components/ui/Button.vue'

const { t } = useI18n()
const toast = useToast()
const locale = useLocale()
const settings = useSettings()
const loading = ref(false)
const saving = ref(false)

const TAB_VALUES = ['General', 'Sales & Tax', 'Alerts']
const TABS = computed(() => TAB_VALUES.map((v) => ({ value: v, label: t(`pages.settings.tabs.${v}`) })))
const activeTab = ref('General')

// ຄ່າຕັ້ງທັງໝົດຢູ່ໃນ object ດຽວ — ໃຊ້ reactive ເພາະເຮົາແກ້ເທື່ອລະ field
// ຄ່າ default ລຸ່ມນີ້ໃຊ້ຊົ່ວຄາວ ກ່ອນ loadSettings() ຈະແທນທີ່ດ້ວຍຄ່າຈາກ server
const form = reactive({
  // General
  shopName: '',
  phone: '',
  address: '',
  timezone: 'Asia/Vientiane',

  // Sales & Tax
  currency: 'LAK',
  taxRate: '0',
  invoicePrefix: 'INV-',
  receiptFooter: '',

  // Alerts
  lowStockAlert: true,
  expiryAlert: true,
  expiryWarningDays: '90',
})
// ຕົວເລືອກພາສາ ດຶງມາຈາກລາຍການທີ່ລະບົບຮອງຮັບ (lo / th / en)
const languageOptions = SUPPORTED_LOCALES.map((c) => ({ value: c, label: LOCALE_LABELS[c] }))

function onLanguageChange(v: string | undefined) {
  if (v) locale.setLocale(v as LocaleCode)
}
const currencyOptions = [
  { value: 'LAK', label: 'ກີບ (LAK)' },
  { value: 'THB', label: 'Baht (THB)' },
  { value: 'USD', label: 'US Dollar (USD)' },
]
const timezoneOptions = [
  { value: 'Asia/Vientiane', label: 'Asia/Vientiane (GMT+7)' },
  { value: 'Asia/Bangkok', label: 'Asia/Bangkok (GMT+7)' },
]

async function save() {
  if (saving.value) return
  saving.value = true
  try {
    await api.put('/settings', {
      ...form,
      taxRate: Number(form.taxRate),
      expiryWarningDays: Number(form.expiryWarningDays),
    })
    await settings.load()
    toast.show(t('toasts.settings.saved'), 'success')
  } catch (e: any) {
    toast.show(apiErrorMessage(e, t) || t('toasts.settings.saveFailed'), 'error')
  } finally {
    saving.value = false
  }
}

async function loadSettings() {
  loading.value = true
  try {
    const { data } = await api.get('/settings')
    Object.assign(form, { ...data, taxRate: String(data.taxRate), expiryWarningDays: String(data.expiryWarningDays) })
  } catch {
    toast.show(t('toasts.settings.loadFailed'), 'error')
  } finally {
    loading.value = false
  }
}
onMounted(loadSettings)
</script>
<template>
  <div class="space-y-5">
    <PageHeader :title="t('pages.settings.title')" :subtitle="t('pages.settings.subtitle')">
      <template #actions>
        <Button :disabled="saving" @click="save"><Save class="w-4 h-4" /> {{ saving ? t('common.saving') : t('pages.settings.saveChanges') }}</Button>
      </template>
    </PageHeader>

    <TabsBar v-model="activeTab" :tabs="TABS" />

    <!-- ============ General ============ -->
    <SectionCard v-if="activeTab === 'General'" :title="t('pages.settings.shopInformation')">
      <div class="p-5">
        <FormGrid :cols="2">
          <TextInput v-model="form.shopName" :label="t('pages.settings.shopName')" />
          <TextInput v-model="form.phone" :label="t('common.phone')" />
          <TextInput v-model="form.address" :label="t('common.address')" />
          <div>
            <SelectInput
              :model-value="locale.current"
              :label="t('settings.general.language')"
              :options="languageOptions"
              @update:model-value="onLanguageChange"
            />
            <p class="mt-1 text-xs text-slate-400">{{ t('settings.general.languageHint') }}</p>
          </div>
          <SelectInput v-model="form.timezone" :label="t('pages.settings.timezone')" :options="timezoneOptions" />
        </FormGrid>
      </div>
    </SectionCard>

    <!-- ============ Sales & Tax ============ -->
    <SectionCard v-else-if="activeTab === 'Sales & Tax'" :title="t('pages.settings.salesAndTax')">
      <div class="p-5">
        <FormGrid :cols="2">
          <SelectInput v-model="form.currency" :label="t('pages.settings.currency')" :options="currencyOptions" />
          <TextInput v-model="form.taxRate" :label="t('pages.settings.taxRatePercent')" type="number" />
          <TextInput v-model="form.invoicePrefix" :label="t('pages.settings.invoicePrefix')" />
          <TextInput v-model="form.receiptFooter" :label="t('pages.settings.receiptFooterText')" />
        </FormGrid>
        <p class="mt-3 text-xs text-slate-400">
          {{ t('pages.settings.taxRateNote') }}
        </p>
      </div>
    </SectionCard>

    <!-- ============ Alerts ============ -->
    <SectionCard v-else :title="t('pages.settings.alertPreferences')">
      <div class="p-5 space-y-4">
        <!-- toggle: low stock -->
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-slate-800 dark:text-slate-100">{{ t('pages.settings.lowStockAlerts') }}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">{{ t('pages.settings.lowStockAlertsHint') }}</p>
          </div>
          <button
            type="button"
            role="switch"
            :aria-checked="form.lowStockAlert"
            class="relative w-11 h-6 rounded-full transition-colors"
            :class="form.lowStockAlert ? 'bg-[#1d6fcd]' : 'bg-slate-300'"
            @click="form.lowStockAlert = !form.lowStockAlert"
          >
            <span
              class="absolute top-0.5 left-0.5 w-5 h-5 bg-white dark:bg-slate-800 rounded-full shadow transition-transform"
              :class="form.lowStockAlert ? 'translate-x-5' : 'translate-x-0'"
            />
          </button>
        </div>

        <!-- toggle: expiry -->
        <div class="flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-4">
          <div>
            <p class="text-sm font-medium text-slate-800 dark:text-slate-100">{{ t('pages.settings.expiryAlerts') }}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">{{ t('pages.settings.expiryAlertsHint') }}</p>
          </div>
          <button
            type="button"
            role="switch"
            :aria-checked="form.expiryAlert"
            class="relative w-11 h-6 rounded-full transition-colors"
            :class="form.expiryAlert ? 'bg-[#1d6fcd]' : 'bg-slate-300'"
            @click="form.expiryAlert = !form.expiryAlert"
          >
            <span
              class="absolute top-0.5 left-0.5 w-5 h-5 bg-white dark:bg-slate-800 rounded-full shadow transition-transform"
              :class="form.expiryAlert ? 'translate-x-5' : 'translate-x-0'"
            />
          </button>
        </div>

        <div class="border-t border-slate-100 dark:border-slate-700 pt-4 max-w-xs">
          <TextInput
            v-model="form.expiryWarningDays"
            :label="t('pages.settings.warnDaysBefore')"
            type="number"
          />
        </div>
      </div>
    </SectionCard>
  </div>
</template>

