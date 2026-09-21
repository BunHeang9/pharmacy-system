import { defineStore } from 'pinia'
import { ref } from 'vue'

type Theme = 'light' | 'dark'
const STORAGE_KEY = 'theme'

function readStoredTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export const useTheme = defineStore('theme', () => {
  const current = ref<Theme>(readStoredTheme())

  function setTheme(t: Theme) {
    current.value = t
    document.documentElement.classList.toggle('dark', t === 'dark')
    try {
      localStorage.setItem(STORAGE_KEY, t)
    } catch {
      // ບໍ່ເປັນຫຍັງ ຖ້າ save ບໍ່ໄດ້
    }
  }

  function toggle() {
    setTheme(current.value === 'dark' ? 'light' : 'dark')
  }

  // ຕັ້ງ class ໃຫ້ກົງກັບ store ຕັ້ງແຕ່ເລີ່ມ (ເຜື່ອ script ໃນ index.html ບໍ່ໄດ້ແລ່ນ)
  setTheme(current.value)

  return { current, setTheme, toggle }
})
