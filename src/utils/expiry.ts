// ຄິດໄລ່ວັນທີ່ເຫຼືອ ແລະ ສະຖານະ ຈາກວັນໝົດອາຍຸຈິງ (ບໍ່ແມ່ນເລກ hard-code)
export function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

export type ExpiryStatus = 'Expired' | 'Critical' | 'Expiring Soon' | 'Safe'

// ເກນ: ໝົດແລ້ວ / ນ້ອຍກວ່າ 30 ວັນ / ນ້ອຍກວ່າ 90 ວັນ / ປອດໄພ
export function expiryStatus(days: number): ExpiryStatus {
  if (days < 0) return 'Expired'
  if (days < 30) return 'Critical'
  if (days < 90) return 'Expiring Soon'
  return 'Safe'
}

export function daysLabel(days: number): string {
  return days < 0 ? `Expired ${Math.abs(days)}d ago` : `${days} days`
}
