import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export type SaleUnit = 'UNIT' | 'PACK'

export interface CartItem {
  id: string
  medicineId: string
  name: string
  saleUnit: SaleUnit
  unitLabel: string
  packUnit: string
  unitsPerPack: number
  price: number
  qty: number
  stock: number
  discount: number
  taxRate: number
}

const STORAGE_KEY = 'pos-cart'

function restoreCart(): CartItem[] {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Partial<CartItem>[]
    if (!Array.isArray(stored)) return []

    return stored.map((item) => {
      const medicineId = item.medicineId ?? item.id ?? ''
      const saleUnit: SaleUnit = item.saleUnit === 'PACK' ? 'PACK' : 'UNIT'
      const unitsPerPack = Math.max(1, Number(item.unitsPerPack) || 1)
      return {
        id: item.id?.includes(':') ? item.id : `${medicineId}:${saleUnit}`,
        medicineId,
        name: item.name ?? '',
        saleUnit,
        unitLabel: item.unitLabel ?? 'unit',
        packUnit: item.packUnit ?? 'pack',
        unitsPerPack,
        price: Number(item.price) || 0,
        qty: Math.max(1, Number(item.qty) || 1),
        stock: Math.max(0, Number(item.stock) || 0),
        discount: Number(item.discount) || 0,
        taxRate: Number(item.taxRate) || 0,
      }
    })
  } catch {
    return []
  }
}

export const useCart = defineStore('cart', () => {
  const items = ref<CartItem[]>(restoreCart())
  const orderDiscount = ref(0)

  watch(items, (v) => localStorage.setItem(STORAGE_KEY, JSON.stringify(v)), { deep: true })

  const count = computed(() => items.value.length)

  const subtotal = computed(() =>
    items.value.reduce((sum, c) => sum + c.price * c.qty * (1 - c.discount / 100), 0),
  )
  const discountAmt = computed(() => (subtotal.value * orderDiscount.value) / 100)
  const taxAmt = computed(() =>
    items.value.reduce((sum, c) => {
      const lineSubtotal = c.price * c.qty * (1 - c.discount / 100)
      const lineShareOfDiscount = subtotal.value > 0 ? (lineSubtotal / subtotal.value) * discountAmt.value : 0
      return sum + (lineSubtotal - lineShareOfDiscount) * (c.taxRate / 100)
    }, 0),
  )
  const total = computed(() => subtotal.value - discountAmt.value + taxAmt.value)

  function maxQty(item: CartItem) {
    const reservedByOtherLines = items.value
      .filter((other) => other.medicineId === item.medicineId && other.id !== item.id)
      .reduce((sum, other) => sum + other.qty * (other.saleUnit === 'PACK' ? other.unitsPerPack : 1), 0)
    const remainingUnits = Math.max(0, item.stock - reservedByOtherLines)
    const unitsPerSale = item.saleUnit === 'PACK' ? item.unitsPerPack : 1
    return Math.floor(remainingUnits / unitsPerSale)
  }

  function add(
    med: {
      id: string
      name: string
      unit: string | null
      packUnit: string | null
      unitsPerPack: number
      sellingPrice: number
      packSellingPrice: number | null
      stock: number
      taxRate: number
    },
    saleUnit: SaleUnit = 'UNIT',
  ) {
    if (saleUnit === 'PACK' && med.packSellingPrice == null) return

    const unitsPerPack = Math.max(1, med.unitsPerPack || 1)
    const id = `${med.id}:${saleUnit}`
    const existing = items.value.find((item) => item.id === id)
    if (existing) {
      if (existing.qty < maxQty(existing)) existing.qty++
      return
    }

    const newItem: CartItem = {
      id,
      medicineId: med.id,
      name: med.name,
      saleUnit,
      unitLabel: med.unit || 'unit',
      packUnit: med.packUnit || 'pack',
      unitsPerPack,
      price: saleUnit === 'PACK' ? med.packSellingPrice! : med.sellingPrice,
      qty: 1,
      stock: med.stock,
      discount: 0,
      taxRate: med.taxRate,
    }
    if (maxQty(newItem) > 0) items.value.push(newItem)
  }

  function updateQty(id: string, delta: number) {
    const item = items.value.find((c) => c.id === id)
    if (!item) return
    item.qty = Math.min(maxQty(item), Math.max(1, item.qty + delta))
  }

  function remove(id: string) {
    items.value = items.value.filter((x) => x.id !== id)
  }

  function clear() {
    items.value = []
    orderDiscount.value = 0
  }

  return { items, orderDiscount, count, subtotal, discountAmt, taxAmt, total, maxQty, add, updateQty, remove, clear }
})
