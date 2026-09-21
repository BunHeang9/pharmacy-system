import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  i18n,
  readStoredLocale,
  SUPPORTED_LOCALES,
  LOCALE_STORAGE_KEY,
  type LocaleCode,
} from '@/i18n'

// ຊື່ພາສາ ສະແດງໃນຕົວເລືອກ — ຂຽນເປັນພາສານັ້ນໆ ບໍ່ຕ້ອງແປ
export const LOCALE_LABELS: Record<LocaleCode, string> = {
  lo: 'ລາວ',
  th: 'ไทย',
  en: 'English',
}

// ບ່ອນເກັບພາສາປັດຈຸບັນຮ່ວມກັນທັງແອັບ — header switcher ແລະ ໜ້າ Settings ໃຊ້ອັນດຽວກັນ
export const useLocale = defineStore('locale', () => {
  const current = ref<LocaleCode>(readStoredLocale())

  function setLocale(code: LocaleCode) {
    if (!SUPPORTED_LOCALES.includes(code)) return
    current.value = code
    i18n.global.locale.value = code
    document.documentElement.setAttribute('lang', code)
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, code)
    } catch {
      // ບໍ່ເປັນຫຍັງ ຖ້າ save ບໍ່ໄດ້
    }
    // TODO: api.patch('/me/preferences', { locale: code }) ເມື່ອ backend ພ້ອມ
  }

  // ຕັ້ງໃຫ້ i18n ແລະ <html lang> ກົງກັບ store ຕັ້ງແຕ່ເລີ່ມ
  setLocale(current.value)

  return { current, setLocale }
})
