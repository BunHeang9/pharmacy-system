import { Router } from 'express'
import { prisma } from '../prisma'
import { requireAuth, requireRole, NOT_CLERK } from '../middleware/auth'

import { asyncHandler } from '../lib/asyncHandler'

export const reportsRouter = Router()
reportsRouter.use(requireAuth)
reportsRouter.use(requireRole(...NOT_CLERK))


const PERIOD_DAYS: Record<string, number> = { week: 7, month: 30, quarter: 90, year: 365 }
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const dayKey = (d: Date) => d.toISOString().slice(0, 10)
const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`
const round2 = (n: number) => Math.round(n * 100) / 100

// ສະຫຼຸບລາຍງານ — ທຸກຕົວເລກເງິນຄິດຢູ່ server, browser ບໍ່ຄິດເອງ (ຄືກັນກັບ sales/purchases checkout)
reportsRouter.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const periodParam = typeof req.query.period === 'string' ? req.query.period : 'month'
    const period = PERIOD_DAYS[periodParam] ? periodParam : 'month'
    const since = new Date(Date.now() - PERIOD_DAYS[period] * 24 * 60 * 60 * 1000)

    // ຄ່າຊື້ນັບສະເພາະໃບສັ່ງຊື້ທີ່ "ຮັບເຄື່ອງ" ແລ້ວ — PENDING ຍັງບໍ່ແມ່ນຄ່າໃຊ້ຈ່າຍຈິງ
    const [sales, purchases] = await Promise.all([
      prisma.sale.findMany({ where: { createdAt: { gte: since } }, select: { total: true } }),
      prisma.purchase.findMany({ where: { createdAt: { gte: since }, status: 'RECEIVED' }, select: { total: true } }),
    ])
    const totalSales = sales.reduce((s, r) => s + Number(r.total), 0)
    const totalPurchases = purchases.reduce((s, r) => s + Number(r.total), 0)

    // ຍອດຂາຍ/ຊື້ 7 ມື້ຫຼ້າສຸດ — ໃຊ້ສະແດງ trend ລາຍວັນ, ບໍ່ອີງໃສ່ period ທີ່ເລືອກ
    const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const [sales7, purchases7] = await Promise.all([
      prisma.sale.findMany({ where: { createdAt: { gte: since7 } }, select: { total: true, createdAt: true } }),
      prisma.purchase.findMany({ where: { createdAt: { gte: since7 }, status: 'RECEIVED' }, select: { total: true, createdAt: true } }),
    ])
    const salesByDayMap = new Map<string, number>()
    const purchasesByDayMap = new Map<string, number>()
    for (const s of sales7) salesByDayMap.set(dayKey(s.createdAt), (salesByDayMap.get(dayKey(s.createdAt)) ?? 0) + Number(s.total))
    for (const p of purchases7) purchasesByDayMap.set(dayKey(p.createdAt), (purchasesByDayMap.get(dayKey(p.createdAt)) ?? 0) + Number(p.total))
    const salesByDay = Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(Date.now() - (6 - idx) * 24 * 60 * 60 * 1000)
      const key = dayKey(d)
      return { day: WEEKDAY_LABELS[d.getDay()], sales: salesByDayMap.get(key) ?? 0, purchases: purchasesByDayMap.get(key) ?? 0 }
    })

    // ຍອດຂາຍ 6 ເດືອນຫຼ້າສຸດ
    const since6mo = new Date()
    since6mo.setDate(1)
    since6mo.setMonth(since6mo.getMonth() - 5)
    const salesForMonths = await prisma.sale.findMany({ where: { createdAt: { gte: since6mo } }, select: { total: true, createdAt: true } })
    const salesByMonthMap = new Map<string, number>()
    for (const s of salesForMonths) {
      const k = monthKey(s.createdAt)
      salesByMonthMap.set(k, (salesByMonthMap.get(k) ?? 0) + Number(s.total))
    }
    const salesByMonth = Array.from({ length: 6 }, (_, idx) => {
      const d = new Date()
      d.setDate(1)
      d.setMonth(d.getMonth() - (5 - idx))
      return { month: MONTH_LABELS[d.getMonth()], sales: salesByMonthMap.get(monthKey(d)) ?? 0 }
    })

    // ສ່ວນແບ່ງຍອດຂາຍຕາມໝວດໝູ່ (ໃນຊ່ວງ period ທີ່ເລືອກ)
    const saleItems = await prisma.saleItem.findMany({
      where: { sale: { createdAt: { gte: since } } },
      select: { lineTotal: true, medicine: { select: { category: { select: { name: true } } } } },
    })
    const categoryMap = new Map<string, number>()
    for (const it of saleItems) {
      const name = it.medicine.category?.name ?? 'Other'
      categoryMap.set(name, (categoryMap.get(name) ?? 0) + Number(it.lineTotal))
    }
    const categoryShare = [...categoryMap.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    res.json({
      period,
      totalSales: round2(totalSales),
      totalPurchases: round2(totalPurchases),
      grossProfit: round2(totalSales - totalPurchases),
      txnCount: sales.length,
      salesByDay: salesByDay.map((d) => ({ ...d, sales: round2(d.sales), purchases: round2(d.purchases) })),
      salesByMonth: salesByMonth.map((m) => ({ ...m, sales: round2(m.sales) })),
      categoryShare: categoryShare.map((c) => ({ ...c, value: round2(c.value) })),
    })
  }),
)
