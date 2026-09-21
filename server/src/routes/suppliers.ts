import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma'
import { requireAuth, requireRole, NOT_CLERK } from '../middleware/auth'
import { asyncHandler } from '../lib/asyncHandler'

export const suppliersRouter = Router()
suppliersRouter.use(requireAuth)
suppliersRouter.use(requireRole(...NOT_CLERK))


const bodySchema = z.object({
  name: z.string().min(1),
  contact: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  email: z.string().optional().default(''),
  address: z.string().optional().default(''),
  regNo: z.string().optional().default(''),
  licenseNo: z.string().optional().default(''),
})

const paymentSchema = z.object({
  amount: z.coerce.number().positive(),
  note: z.string().optional(),
})

// Prisma ສົ່ງ Decimal ເປັນ string — ແປງເປັນ number ໃຫ້ frontend
// purchases = ຍອດລວມສະເພາະ PO ທີ່ "ຮັບເຄື່ອງ" ແລ້ວ (RECEIVED) — PENDING ຍັງບໍ່ແມ່ນຄ່າໃຊ້ຈ່າຍຈິງ
const toDto = (s: any) => ({
  id: s.id, name: s.name, contact: s.contact, phone: s.phone, email: s.email,
  address: s.address, regNo: s.regNo, licenseNo: s.licenseNo,
  balance: Number(s.balance),
  purchases: (s.purchases ?? []).reduce((sum: number, p: { total: any }) => sum + Number(p.total), 0),
  status: s.isActive ? 'Active' : 'Inactive',
})

const withReceivedPurchases = { purchases: { where: { status: 'RECEIVED' as const }, select: { total: true } } }

suppliersRouter.get('/', asyncHandler(async (_req, res) => {
  const rows = await prisma.supplier.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    include: withReceivedPurchases,
  })
  res.json(rows.map(toDto))
}))

suppliersRouter.post('/', asyncHandler(async (req, res) => {
  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ code: 'INVALID_INPUT', error: 'Invalid data' }); return }
  const s = await prisma.supplier.create({ data: parsed.data })
  res.status(201).json(toDto(s))
}))

suppliersRouter.put('/:id', asyncHandler(async (req, res) => {
  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ code: 'INVALID_INPUT', error: 'Invalid data' }); return }
  const s = await prisma.supplier.update({ where: { id: req.params.id }, data: parsed.data })
  res.json(toDto(s))
}))

// ຫ້າມລຶບຖ້າຍັງຄ້າງເງິນ
suppliersRouter.delete('/:id', asyncHandler(async (req, res) => {
  const s = await prisma.supplier.findUnique({ where: { id: req.params.id } })
  if (!s) { res.status(404).json({ code: 'NOT_FOUND', error: 'Not found' }); return }
  if (Number(s.balance) > 0) {
    res.status(409).json({
      code: 'SUPPLIER_HAS_BALANCE',
      balance: Number(s.balance),
      error: `Cannot delete — outstanding balance $${Number(s.balance).toLocaleString()}`,
    })
    return
  }
  await prisma.supplier.update({ where: { id: req.params.id }, data: { isActive: false } })
  res.json({ ok: true })
}))

// ປະຫວັດການຈ່າຍເງິນໃຫ້ຜູ້ສະໜອງ
suppliersRouter.get('/:id/payments', asyncHandler(async (req, res) => {
  const rows = await prisma.supplierPayment.findMany({
    where: { supplierId: req.params.id },
    orderBy: { createdAt: 'desc' },
    include: { user: true },
  })
  res.json(rows.map((p) => ({
    id: p.id,
    amount: Number(p.amount),
    note: p.note,
    by: p.user.name,
    date: p.createdAt.toISOString(),
  })))
}))

// ບັນທຶກການຈ່າຍເງິນ — ຫັກອອກຈາກ balance ທັນທີ, ຫ້າມຈ່າຍເກີນຍອດຄ້າງ
suppliersRouter.post('/:id/payments', asyncHandler(async (req, res) => {
  const parsed = paymentSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ code: 'INVALID_INPUT', error: 'Invalid data', details: parsed.error.issues }); return }

  const supplier = await prisma.supplier.findUnique({ where: { id: req.params.id } })
  if (!supplier || !supplier.isActive) { res.status(404).json({ code: 'NOT_FOUND', error: 'Supplier not found' }); return }

  const { amount, note } = parsed.data
  if (amount > Number(supplier.balance)) {
    res.status(409).json({
      code: 'PAYMENT_EXCEEDS_BALANCE',
      balance: Number(supplier.balance),
      error: `Payment of $${amount} exceeds outstanding balance of $${Number(supplier.balance)}`,
    })
    return
  }

  const [payment, updatedSupplier] = await prisma.$transaction([
    prisma.supplierPayment.create({
      data: { supplierId: supplier.id, amount, note: note || null, userId: req.user!.id },
    }),
    prisma.supplier.update({
      where: { id: supplier.id },
      data: { balance: { decrement: amount } },
      include: withReceivedPurchases,
    }),
  ])

  res.status(201).json({ payment: { id: payment.id, amount: Number(payment.amount), note: payment.note, date: payment.createdAt.toISOString() }, supplier: toDto(updatedSupplier) })
}))
