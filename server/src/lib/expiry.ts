// ຄິດໄລ່ວັນທີ່ເຫຼືອ ແລະ ສະຖານະ ຈາກວັນໝົດອາຍຸຈິງ — ຄືກັນກັບ src/utils/expiry.ts ຝັ່ງ client
export function daysUntil(date: Date): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

export type ExpiryStatus = 'Expired' | 'Critical' | 'Expiring Soon' | 'Safe'

export function expiryStatus(days: number): ExpiryStatus {
  if (days < 0) return 'Expired'
  if (days < 30) return 'Critical'
  if (days < 90) return 'Expiring Soon'
  return 'Safe'
}
