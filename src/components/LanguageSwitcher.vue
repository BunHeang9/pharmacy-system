<script setup lang="ts">
import { computed } from 'vue'
import { Languages } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useLocale, LOCALE_LABELS } from '@/stores/locale'
import { SUPPORTED_LOCALES } from '@/i18n'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'

const { t } = useI18n()
const locale = useLocale()

// ໃຊ້ DropdownMenu ຂອງ ui kit — ບໍ່ສ້າງ dropdown ໃໝ່
const items = computed(() =>
  SUPPORTED_LOCALES.map((code) => ({
    label: locale.current === code ? `${LOCALE_LABELS[code]}  ✓` : LOCALE_LABELS[code],
    onClick: () => locale.setLocale(code),
  })),
)
</script>

<template>
  <DropdownMenu :items="items">
    <template #trigger>
      <button
        :title="t('language.switcherLabel')"
        class="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition text-xs font-medium"
      >
        <Languages class="w-4 h-4" />
        <span class="hidden sm:inline">{{ LOCALE_LABELS[locale.current] }}</span>
      </button>
    </template>
  </DropdownMenu>
</template>
