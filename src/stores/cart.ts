import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export interface CartItem {
  id: string
  name: string
  price: number
  qty: number
  stock: number
  discount: number
  taxRate: number
}

const STORAGE_KEY = 'pos-cart'

export const useCart = defineStore('cart', () => {
  // ກູ້ຄືນ cart ຖ້າ browser ປິດກາງຄັນ — ພະນັກງານບໍ່ເສຍລາຍການລູກຄ້າ
  const saved = localStorage.getItem(STORAGE_KEY)
  const items = ref<CartItem[]>(saved ? JSON.parse(saved) : [])
  const orderDiscount = ref(0)

  watch(items, (v) => localStorage.setItem(STORAGE_KEY, JSON.stringify(v)), { deep: true })

  const count = computed(() => items.value.length)

  const subtotal = computed(() =>
    items.value.reduce((sum, c) => sum + c.price * c.qty * (1 - c.discount / 100), 0),
  )
  const discountAmt = computed(() => (subtotal.value * orderDiscount.value) / 100)
  // ພາສີເປັນຄ່າປະມານ — ຄິດແຍກຕໍ່ລາຍການຕາມ taxRate ຂອງແຕ່ລະຢາ
  // (server ເປັນຜູ້ຄິດຄ່າຈິງຕອນ checkout — ຕົວເລກນີ້ໃຊ້ສະແດງກ່ອນຢືນຢັນເທົ່ານັ້ນ)
  const taxAmt = computed(() =>
    items.value.reduce((sum, c) => {
      const lineSubtotal = c.price * c.qty * (1 - c.discount / 100)
      const lineShareOfDiscount = subtotal.value > 0 ? (lineSubtotal / subtotal.value) * discountAmt.value : 0
      return sum + (lineSubtotal - lineShareOfDiscount) * (c.taxRate / 100)
    }, 0),
  )
  const total = computed(() => subtotal.value - discountAmt.value + taxAmt.value)

  function add(med: { id: string; name: string; sellingPrice: number; stock: number; taxRate: number }) {
    const existing = items.value.find((c) => c.id === med.id)
    if (existing) {
      // ບໍ່ໃຫ້ເກີນສະຕັອກທີ່ມີ
      if (existing.qty < existing.stock) existing.qty++
      return
    }
    items.value.push({
      id: med.id,
      name: med.name,
      price: med.sellingPrice,
      qty: 1,
      stock: med.stock,
      discount: 0,
      taxRate: med.taxRate,
    })
  }

  function updateQty(id: string, delta: number) {
    const item = items.value.find((c) => c.id === id)
    if (!item) return
    item.qty = Math.min(item.stock, Math.max(1, item.qty + delta))
  }

  function remove(id: string) {
    items.value = items.value.filter((c) => c.id !== id)
  }

  function clear() {
    items.value = []
    orderDiscount.value = 0
  }

  return { items, orderDiscount, count, subtotal, discountAmt, taxAmt, total, add, updateQty, remove, clear }
})
