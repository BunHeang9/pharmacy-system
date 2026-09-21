<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'

import {
  Search,
  Scan,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  QrCode,
  ShoppingBag,
  CheckCircle,
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import api from '@/api/client'
import { useCart } from '@/stores/cart'
import { useToast } from '@/stores/toast'
import { apiErrorMessage } from '@/lib/apiError'
import { formatMoney } from '@/utils/money'
import Badge from '@/components/ui/Badge.vue'
import CustomerPicker from '@/components/CustomerPicker.vue'

interface Medicine {
  id: string
  name: string
  generic: string
  category: string | null
  form: string
  strength: string
  barcode: string | null
  sellingPrice: number
  taxRate: number
  stock: number
  minStock: number
}
interface CustomerOption {
  id: string
  name: string
  phone: string | null
  discount: number
}

const { t } = useI18n()
const cart = useCart()
const toast = useToast()

const medicines = ref<Medicine[]>([])
const customers = ref<CustomerOption[]>([])
const selectedCustomerId = ref('')

async function loadMedicines() {
  try {
    const { data } = await api.get<Medicine[]>('/medicines')
    medicines.value = data
  } catch {
    toast.show(t('toasts.pos.loadFailed'), 'error')
  }
}
async function loadCustomers() {
  try {
    const { data } = await api.get<CustomerOption[]>('/customers')
    customers.value = data
  } catch {
    // ບໍ່ສຳຄັນເທົ່າກັບຢາ — ຖ້າໂຫຼດບໍ່ໄດ້ ຂາຍແບບລູກຄ້າຈອນໄດ້ຕາມປົກກະຕິ
  }
}
onMounted(loadMedicines)
onMounted(loadCustomers)

// ເລືອກລູກຄ້າ → ໃສ່ສ່ວນຫຼຸດຂອງລູກຄ້ານັ້ນອັດຕະໂນມັດ (ຖ້າມີ) — ພະນັກງານຍັງແກ້ໄດ້ຫຼັງຈາກນັ້ນຖ້າຕ້ອງການ
watch(selectedCustomerId, (id) => {
  const c = customers.value.find((x) => x.id === id)
  cart.orderDiscount = c?.discount ?? 0
})

const search = ref('')
const category = ref('All')
const payMethod = ref<'cash' | 'card' | 'qr' | 'other'>('cash')
const cashAmount = ref('')
const showSuccess = ref(false)
const lastSaleTotal = ref(0)
const checkingOut = ref(false)
const searchBox = ref<HTMLInputElement | null>(null)

// ໝວດໝູ່ດຶງມາຈາກຢາທີ່ໂຫຼດແລ້ວ — ບໍ່ hard-code ອີກຕໍ່ໄປ
const categories = computed(() => [
  'All',
  ...new Set(medicines.value.map((m) => m.category).filter((c): c is string => !!c)),
])

const PAYMENT_METHOD_DEFS = [
  { id: 'cash', icon: Banknote },
  { id: 'card', icon: CreditCard },
  { id: 'qr', icon: QrCode },
  { id: 'other', icon: ShoppingBag },
] as const
const PAYMENT_METHODS = computed(() =>
  PAYMENT_METHOD_DEFS.map((pm) => ({ ...pm, label: t(`pages.pos.paymentMethods.${pm.id}`) })),
)

const filteredMeds = computed(() =>
  medicines.value.filter((m) => {
    if (m.stock === 0) return false
    if (category.value !== 'All' && m.category !== category.value) return false
    if (search.value) {
      const q = search.value.toLowerCase()
      // ຄົ້ນຫາໄດ້ທັງຊື່, ຊື່ສາມັນ ແລະ barcode
      const hit =
        m.name.toLowerCase().includes(q) ||
        m.generic.toLowerCase().includes(q) ||
        (m.barcode ?? '').includes(q)
      if (!hit) return false
    }
    return true
  }),
)

// ເຄື່ອງສະແກນ barcode ເຮັດວຽກຄືແປ້ນພິມ: ພິມເລກ ແລ້ວກົດ Enter
function onScan() {
  const code = search.value.trim()
  if (!code) return

  const found = medicines.value.find((m) => m.barcode === code)
  if (found) {
    if (found.stock === 0) {
      toast.show(t('toasts.pos.outOfStock', { name: found.name }), 'warning')
    } else {
      cart.add(found)
    }
    search.value = ''
    return
  }

  // ຖ້າກອງເຫຼືອລາຍການດຽວ ໃຫ້ເພີ່ມລາຍການນັ້ນເລີຍ
  if (filteredMeds.value.length === 1) {
    cart.add(filteredMeds.value[0])
    search.value = ''
    return
  }

  toast.show(t('toasts.pos.notFound'), 'error')
}

function addToCart(med: Medicine) {
  cart.add(med)
  focusSearch()
}

async function focusSearch() {
  await nextTick()
  searchBox.value?.focus()
}

// ຕົວກະພິບຕ້ອງຢູ່ໃນຊ່ອງຄົ້ນຫາສະເໝີ ເພື່ອໃຫ້ສະແກນໄດ້ທັນທີ
onMounted(focusSearch)

const change = computed(() => Number(cashAmount.value) - cart.total)

const canComplete = computed(() => {
  if (cart.count === 0 || checkingOut.value) return false
  if (payMethod.value === 'cash' && cashAmount.value !== '' && change.value < 0) return false
  return true
})

async function completeSale() {
  if (!canComplete.value) return
  checkingOut.value = true
  try {
    // browser ສົ່ງແຕ່ medicineId + quantity — server ຄິດລາຄາ/ພາສີ/ຫັກສະຕັອກເອງທັງໝົດ
    const { data } = await api.post('/sales', {
      customerId: selectedCustomerId.value || undefined,
      discountPercent: cart.orderDiscount,
      paymentMethod: payMethod.value.toUpperCase(),
      items: cart.items.map((i) => ({ medicineId: i.id, quantity: i.qty })),
    })
    lastSaleTotal.value = data.total
    showSuccess.value = true
    cart.clear()
    cashAmount.value = ''
    selectedCustomerId.value = ''
    await loadMedicines() // ສະຕັອກປ່ຽນແລ້ວ — ໂຫຼດຄືນໃຫ້ໜ້າຈໍທັນສະໄໝ
    setTimeout(() => {
      showSuccess.value = false
      focusSearch()
    }, 2000)
  } catch (e: any) {
    // ເຊັ່ນ: ຄົນອື່ນຂາຍໄປກ່ອນຈົນສະຕັອກບໍ່ພໍ — server ປະຕິເສດ, cart ບໍ່ຖືກລ້າງ
    toast.show(apiErrorMessage(e, t) || t('toasts.pos.saleFailed'), 'error')
  } finally {
    checkingOut.value = false
  }
}

const money = formatMoney
</script>

<template>
  <div class="flex h-[calc(100vh-120px)] gap-5">
    <!-- ຊ້າຍ: ເລືອກສິນຄ້າ -->
    <div class="flex-1 flex flex-col min-w-0">
      <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-4 shadow-sm">
        <div class="flex gap-3 mb-3">
          <div class="relative flex-1">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref="searchBox"
              v-model="search"
              type="text"
              :placeholder="t('pages.pos.searchPlaceholder')"
              class="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              @keyup.enter="onScan"
            />
          </div>
          <button
            class="px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-lg text-slate-600 dark:text-slate-300 transition flex items-center gap-2 text-sm"
            @click="focusSearch"
          >
            <Scan class="w-4 h-4" /> {{ t('pages.pos.scan') }}
          </button>
        </div>
        <div class="flex gap-2 overflow-x-auto pb-1">
          <button
            v-for="cat in categories"
            :key="cat"
            class="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition"
            :class="category === cat ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'"
            @click="category = cat"
          >
            {{ cat === 'All' ? t('pages.pos.allCategories') : cat }}
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto">
        <div class="grid grid-cols-2 xl:grid-cols-3 gap-3">
          <button
            v-for="med in filteredMeds"
            :key="med.id"
            class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-left hover:border-blue-300 hover:shadow-md transition-all group"
            @click="addToCart(med)"
          >
            <div
              class="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 group-hover:bg-blue-100 rounded-lg flex items-center justify-center mb-3 transition"
            >
              <span class="text-lg">💊</span>
            </div>
            <div class="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">{{ med.name }}</div>
            <div class="text-xs text-slate-400 mt-0.5">{{ med.strength }} · {{ med.form }}</div>
            <div class="flex items-center justify-between mt-3">
              <span class="text-base font-bold text-blue-600">{{ money(med.sellingPrice) }}</span>
              <span
                class="text-xs px-2 py-0.5 rounded-full"
                :class="med.stock < med.minStock ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'"
              >
                {{ t('pages.pos.leftSuffix', { n: med.stock }) }}
              </span>
            </div>
          </button>
        </div>
        <div v-if="filteredMeds.length === 0" class="flex items-center justify-center h-40 text-slate-400 text-sm">
          {{ t('pages.pos.noMedicinesFound') }}
        </div>
      </div>
    </div>

    <!-- ຂວາ: ກະຕ່າ -->
    <div class="w-80 flex flex-col bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <div class="p-4 border-b border-slate-100 dark:border-slate-700 space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200 font-display">{{ t('pages.pos.shoppingCart') }}</h3>
          <Badge :variant="cart.count > 0 ? 'default' : 'muted'">{{ t('pages.pos.itemsCount', { n: cart.count }) }}</Badge>
        </div>
        <CustomerPicker v-model="selectedCustomerId" :customers="customers" />
      </div>

      <div class="flex-1 overflow-y-auto p-3 space-y-2">
        <div v-if="cart.count === 0" class="flex flex-col items-center justify-center h-32 text-slate-300">
          <ShoppingBag class="w-10 h-10 mb-2" />
          <p class="text-xs">{{ t('pages.pos.cartEmpty') }}</p>
        </div>

        <div v-for="item in cart.items" :key="item.id" class="bg-slate-50 dark:bg-slate-700/40 rounded-lg p-3">
          <div class="flex items-start justify-between mb-2">
            <span class="text-xs font-medium text-slate-800 dark:text-slate-100 leading-tight flex-1 pr-2">{{ item.name }}</span>
            <button
              class="text-slate-300 hover:text-red-400 transition flex-shrink-0"
              @click="cart.remove(item.id)"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <button
                class="w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
                @click="cart.updateQty(item.id, -1)"
              >
                <Minus class="w-3 h-3" />
              </button>
              <span class="text-sm font-semibold text-slate-700 dark:text-slate-200 w-6 text-center">{{ item.qty }}</span>
              <button
                class="w-6 h-6 bg-blue-500 text-white rounded-md flex items-center justify-center hover:bg-blue-600 transition disabled:opacity-40"
                :disabled="item.qty >= item.stock"
                @click="cart.updateQty(item.id, 1)"
              >
                <Plus class="w-3 h-3" />
              </button>
            </div>
            <div class="text-right">
              <div class="text-xs text-slate-400">{{ money(item.price) }} × {{ item.qty }}</div>
              <div class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ money(item.price * item.qty) }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="border-t border-slate-100 dark:border-slate-700 p-4 space-y-2">
        <div class="flex justify-between text-sm text-slate-600 dark:text-slate-300">
          <span>{{ t('common.subtotal') }}</span>
          <span class="font-mono">{{ money(cart.subtotal) }}</span>
        </div>
        <div class="flex justify-between items-center text-sm text-slate-600 dark:text-slate-300">
          <span>{{ t('common.discount') }}</span>
          <div class="flex items-center gap-1">
            <input
              v-model.number="cart.orderDiscount"
              type="number"
              min="0"
              max="100"
              class="w-14 px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded text-right font-mono"
            />
            <span class="text-xs text-slate-400">%</span>
            <span class="font-mono text-red-500 ml-1">-{{ money(cart.discountAmt) }}</span>
          </div>
        </div>
        <div class="flex justify-between text-sm text-slate-600 dark:text-slate-300">
          <span>{{ t('common.tax') }}</span>
          <span class="font-mono">+{{ money(cart.taxAmt) }}</span>
        </div>
        <div class="flex justify-between text-base font-bold text-slate-800 dark:text-slate-100 border-t border-slate-100 dark:border-slate-700 pt-2">
          <span class="font-display">{{ t('pages.pos.total') }}</span>
          <span class="font-mono text-blue-600">{{ money(cart.total) }}</span>
        </div>

        <div class="grid grid-cols-4 gap-1.5 pt-2">
          <button
            v-for="pm in PAYMENT_METHODS"
            :key="pm.id"
            class="flex flex-col items-center gap-1 py-2 px-1 rounded-lg border text-xs font-medium transition"
            :class="
              payMethod === pm.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600'
                : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
            "
            @click="payMethod = pm.id"
          >
            <component :is="pm.icon" class="w-4 h-4" />
            {{ pm.label }}
          </button>
        </div>

        <div v-if="payMethod === 'cash'" class="pt-1">
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{{ t('pages.pos.cashReceived') }}</span>
            <input
              v-model="cashAmount"
              type="number"
              placeholder="0"
              class="flex-1 px-2 py-1 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100  dark:placeholder:text-slate-500 rounded font-mono"
            />
          </div>
          <div v-if="cashAmount && change >= 0" class="flex justify-between text-sm mt-1 text-emerald-600 font-medium">
            <span>{{ t('pages.pos.change') }}</span>
            <span class="font-mono">{{ money(change) }}</span>
          </div>
          <div v-else-if="cashAmount" class="flex justify-between text-sm mt-1 text-red-500 font-medium">
            <span>{{ t('toasts.pos.insufficientCash') }}</span>
            <span class="font-mono">{{ money(Math.abs(change)) }}</span>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2 pt-1">
          <button
            class="px-2 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
          >
            {{ t('pages.pos.hold') }}
          </button>
          <button
            class="px-2 py-2 border border-red-200 dark:border-red-500/30 text-red-500 rounded-lg text-xs font-medium hover:bg-red-50 dark:hover:bg-red-500/10 transition"
            @click="cart.clear()"
          >
            {{ t('pages.pos.clear') }}
          </button>
          <button
            class="px-2 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition"
            :disabled="!canComplete"
            @click="completeSale"
          >
            {{ checkingOut ? '...' : t('pages.pos.complete') }}
          </button>
        </div>
      </div>
    </div>

    <!-- ຂາຍສຳເລັດ -->
    <Teleport to="body">
      <div v-if="showSuccess" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4">
          <div class="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center">
            <CheckCircle class="w-10 h-10 text-emerald-500" />
          </div>
          <div class="text-center">
            <h3 class="text-lg font-bold text-slate-800 dark:text-slate-100 font-display">{{ t('pages.pos.saleComplete') }}</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {{ t('pages.pos.total') }}: <span class="font-mono font-semibold text-emerald-600">{{ money(lastSaleTotal) }}</span>
            </p>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
