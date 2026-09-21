// ສະກຸນເງິນກີບລາວ — ບໍ່ໃຊ້ຈຸດທົດສະນິຍົມ (ອັດ/ອັດຕະ ບໍ່ໄດ້ໃຊ້ຈິງ), ໃຊ້ຈໍ້າຄັ່ນຫຼັກພັນ
export const CURRENCY_SYMBOL = '₭'

export function formatMoney(amount: number): string {
  return `${CURRENCY_SYMBOL}${Math.round(amount).toLocaleString('en-US')}`
}

// ໃຊ້ຕອນຕ້ອງການແຕ່ຕົວເລກ (ບໍ່ມີສັນຍາລັກ) ເຊັ່ນໃນ tooltip ຂອງ chart
export function formatNumber(amount: number): string {
  return Math.round(amount).toLocaleString('en-US')
}

// ໃຊ້ໃສ່ແກນ chart — ຕົວເລກກີບໃຫຍ່ຫຼາຍກວ່າໂດລາ, ຈຶ່ງຫຍໍ້ເປັນ k/M ແທນສະແດງເຕັມ
export function formatCompactMoney(amount: number): string {
  const abs = Math.abs(amount)
  if (abs >= 1_000_000) return `${CURRENCY_SYMBOL}${(amount / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${CURRENCY_SYMBOL}${(amount / 1_000).toFixed(0)}k`
  return `${CURRENCY_SYMBOL}${Math.round(amount)}`
}
