import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma'
import { requireAuth } from '../middleware/auth'
import { asyncHandler } from '../lib/asyncHandler'

export const customersRouter = Router()
customersRouter.use(requireAuth)

const bodySchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  discountPct: z.coerce.number().min(0).max(100).optional().default(0),
})

// sales = ລາຍການທີ່ join ມາຈາກ Sale.customerId (ຄິດຜົນລວມ/ຄັ້ງລ່າສຸດຢູ່ນີ້, browser ບໍ່ຄິດເອງ)
const toDto = (c: any) => {
  const sales: { total: any; createdAt: Date }[] = c.sales ?? []
  const purchases = sales.reduce((s, x) => s + Number(x.total), 0)
  const lastPurchase = sales.length
    ? sales.reduce((latest, x) => (x.createdAt > latest ? x.createdAt : latest), sales[0].createdAt)
    : null
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    discount: Number(c.discountPct),
    purchases,
    lastPurchase: lastPurchase ? lastPurchase.toISOString().slice(0, 10) : null,
    status: c.isActive ? 'Active' : 'Inactive',
  }
}

const withSales = { sales: { select: { total: true, createdAt: true } } } as const

customersRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.customer.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: withSales,
    })
    res.json(rows.map(toDto))
  }),
)

// ປະຫວັດການຊື້ຈິງຂອງລູກຄ້າໜຶ່ງຄົນ — ໃຊ້ໂດຍ modal ໂປຣໄຟລ໌ລູກຄ້າ
customersRouter.get(
  '/:id/sales',
  asyncHandler(async (req, res) => {
    const rows = await prisma.sale.findMany({
      where: { customerId: req.params.id },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    })
    res.json(
      rows.map((s) => ({
        id: s.id,
        saleNo: s.saleNo,
        date: s.createdAt.toISOString(),
        items: s.items.length,
        total: Number(s.total),
        paymentMethod: s.paymentMethod,
      })),
    )
  }),
)

customersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ code: 'INVALID_INPUT', error: 'Invalid data', details: parsed.error.issues })
      return
    }
    const c = await prisma.customer.create({ data: parsed.data })
    res.status(201).json(toDto(c))
  }),
)

customersRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const parsed = bodySchema.partial().safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ code: 'INVALID_INPUT', error: 'Invalid data' })
      return
    }
    const c = await prisma.customer.update({ where: { id: req.params.id }, data: parsed.data })
    res.json(toDto(c))
  }),
)


// ບໍ່ລຶບຈິງ — ປິດການໃຊ້ງານ
customersRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.customer.update({ where: { id: req.params.id }, data: { isActive: false } })
    res.json({ ok: true })
  }),
)
