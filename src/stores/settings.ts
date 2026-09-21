import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api/client'

// ຊື່ຮ້ານທີ່ໃຊ້ຮ່ວມກັນ — sidebar ແລະ ໜ້າ login ດຶງຈາກບ່ອນດຽວກັນນີ້ (Setting.shopName ໃນ database)
export const useSettings = defineStore('settings', () => {
  const shopName = ref('')

  async function load() {
    try {
      const { data } = await api.get('/settings')
      shopName.value = data.shopName
    } catch {
      // ບໍ່ໃຫ້ sidebar crash ຖ້າໂຫຼດບໍ່ໄດ້ — ຄ່ອຍລອງໃໝ່ຄັ້ງຕໍ່ໄປ
    }
  }

  return { shopName, load }
})
