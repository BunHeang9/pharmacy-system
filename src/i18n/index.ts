import { createI18n } from 'vue-i18n'
import en from './locales/en'
import lo from './locales/lo'
import th from './locales/th'

// ພາສາທີ່ຮອງຮັບ — ລຽງຕາມລຳດັບທີ່ຢາກໃຫ້ຂຶ້ນໃນຕົວເລືອກ
export const SUPPORTED_LOCALES = ['lo', 'th', 'en'] as const
export type LocaleCode = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: LocaleCode = 'lo'
export const LOCALE_STORAGE_KEY = 'locale'

function isLocale(v: unknown): v is LocaleCode {
  return typeof v === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(v)
}

// ອ່ານພາສາທີ່ຜູ້ໃຊ້ເລືອກໄວ້ຄັ້ງກ່ອນ (ຖ້າມີ)
export function readStoredLocale(): LocaleCode {
  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (isLocale(saved)) return saved
  } catch {
    // localStorage ອາດຖືກປິດ — ໃຊ້ຄ່າ default
  }
  return DEFAULT_LOCALE
}

export const i18n = createI18n({
  legacy: false,
  locale: readStoredLocale(),
  fallbackLocale: 'en',
  messages: { en, lo, th },
})
