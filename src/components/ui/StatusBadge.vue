<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Badge from './Badge.vue'

const { t, te } = useI18n()

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted'

// ໃຊ້ component ດຽວແທນ StockBadge / ExpiryBadge / PaymentBadge / PrescriptionBadge / RoleBadge
const props = defineProps<{
  status: string
  kind?: 'stock' | 'expiry' | 'payment' | 'prescription' | 'role' | 'movement'
}>()

const maps: Record<string, Record<string, BadgeVariant>> = {
  stock: { 'In Stock': 'success', 'Low Stock': 'warning', 'Out of Stock': 'danger' },
  expiry: { Safe: 'success', 'Expiring Soon': 'warning', Critical: 'danger', Expired: 'danger' },
  payment: { Paid: 'success', Pending: 'warning', Partial: 'info', Refunded: 'muted' },
  prescription: { Pending: 'warning', Processing: 'info', Completed: 'success', Cancelled: 'danger' },
  role: {
    'Super Admin': 'danger',
    Admin: 'info',
    Pharmacist: 'success',
    Cashier: 'default',
    'Inventory Manager': 'warning',
    'Pharmacy Clerk': 'muted',
  },
    movement: {
    STOCK_IN: 'success',
    STOCK_OUT: 'default',
    SALE: 'info',
    DAMAGED: 'danger',
    EXPIRED: 'danger',
    LOST: 'danger',
    CORRECTION: 'warning',
  },


}

const variant = computed<BadgeVariant>(() => {
  const map = props.kind ? maps[props.kind] : undefined
  if (map && map[props.status]) return map[props.status]
  // ຖ້າບໍ່ໄດ້ບອກ kind — ຄົ້ນຫາທຸກ map
  for (const m of Object.values(maps)) if (m[props.status]) return m[props.status]
  return 'muted'
})

// ຄຳສະຖານະທັງໝົດແປຢູ່ status.* namespace ດຽວ — ຖ້າບໍ່ພົບ key ໃຫ້ໃຊ້ຄ່າດິບ
const label = computed(() => (te(`status.${props.status}`) ? t(`status.${props.status}`) : props.status))
</script>

<template>
  <Badge :variant="variant">{{ label }}</Badge>
</template>
