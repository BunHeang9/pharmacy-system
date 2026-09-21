import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma'
import { requireAuth } from '../middleware/auth'
import { asyncHandler } from '../lib/asyncHandler'
import { deductFefo } from '../lib/fefo'

export const salesRouter = Router()
salesRouter.use(requireAuth)

const checkoutSchema = z.object({
  customerId: z.string().optional(), // ເລືອກລູກຄ້າຈາກ Customers — ວ່າງ = ລູກຄ້າຈອນ
  customerName: z.string().optional(),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  paymentMethod: z.enum(['CASH', 'CARD', 'QR', 'OTHER']).default('CASH'),
  items: z
    .array(
      z.object({
        medicineId: z.string().min(1),
        quantity: z.coerce.number().int().positive(),
      }),
    )
    .min(1),
})

const toDto = (s: any) => ({
  id: s.id,
  saleNo: s.saleNo,
  date: s.createdAt.toISOString(),
  customer: s.customerName || 'Walk-in Customer',
  customerId: s.customerId ?? null,
  cashier: s.cashier?.name ?? '',
  items: s.items.length,
  subtotal: Number(s.subtotal),
  discount: Number(s.discountAmount),
  tax: Number(s.taxAmount),
  total: Number(s.total),
  paymentMethod: s.paymentMethod,
})

const withRels = { cashier: true, items: true } as const

// ປະຫວັດການຂາຍ (100 ລາຍການຫຼ້າສຸດ)
salesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.sale.findMany({
      orderBy: { createdAt: 'desc' },
      include: withRels,
      take: 100,
    })
    res.json(rows.map(toDto))
  }),
)

// ລາຍລະອຽດການຂາຍໜຶ່ງໃບ (ລວມລາຍການ + ຊື່ຢາ) — ໃຊ້ໂດຍ modal ໃບບິນ
salesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const s = await prisma.sale.findUnique({
      where: { id: req.params.id },
      include: { cashier: true, items: { include: { medicine: true } } },
    })
    if (!s) {
      res.status(404).json({ code: 'NOT_FOUND', error: 'Not found' })
      return
    }
    res.json({
      ...toDto(s),
      lines: s.items.map((i) => ({
        medicineId: i.medicineId,
        medicine: i.medicine.name,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        lineTotal: Number(i.lineTotal),
      })),
    })
  }),
)

// ຂາຍ — ຄິດລາຄາ/ພາສີ/ຫັກສະຕັອກຢູ່ server ທັງໝົດ, ບໍ່ຮັບຄ່າຈາກ browser
salesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = checkoutSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ code: 'INVALID_INPUT', error: 'Invalid data', details: parsed.error.issues })
      return
    }
    const { customerId, customerName, discountPercent, paymentMethod, items } = parsed.data
    const userId = req.user!.id
    const branchId = req.user!.branchId ?? 'main'

    // ຖ້າເລືອກລູກຄ້າ — ໃຊ້ຊື່ຈິງຂອງລູກຄ້າເປັນ snapshot (ຄືກັນກັບລາຄາຢາ, ບໍ່ອີງໃສ່ຂໍ້ມູນປັດຈຸບັນພາຍຫຼັງ)
    let resolvedCustomerName = customerName || null
    if (customerId) {
      const customer = await prisma.customer.findUnique({ where: { id: customerId } })
      if (!customer || !customer.isActive) {
        res.status(404).json({ code: 'NOT_FOUND', error: 'Customer not found' })
        return
      }
      resolvedCustomerName = customer.name
    }

    // ດຶງລາຄາ/taxRate ຈິງຈາກ database — browser ສົ່ງມາແຕ່ medicineId + quantity ເທົ່ານັ້ນ
    const medIds = [...new Set(items.map((i) => i.medicineId))]
    const meds = await prisma.medicine.findMany({ where: { id: { in: medIds }, isActive: true } })
    const medById = new Map(meds.map((m) => [m.id, m]))

    for (const i of items) {
      if (!medById.has(i.medicineId)) {
        res.status(404).json({ code: 'NOT_FOUND', error: 'One or more medicines were not found' })
        return
      }
    }

    let subtotal = 0
    const lines = items.map((i) => {
      const m = medById.get(i.medicineId)!
      const unitPrice = Number(m.sellingPrice)
      const lineSubtotal = unitPrice * i.quantity
      subtotal += lineSubtotal
      return { medicineId: i.medicineId, quantity: i.quantity, unitPrice, lineSubtotal, taxRate: Number(m.taxRate) }
    })

    const discountAmount = (subtotal * discountPercent) / 100
    // ພາສີແຍກຄິດຕໍ່ລາຍການຕາມ taxRate ຂອງແຕ່ລະຢາ, ຫັກສ່ວນຫຼຸດອອກກ່ອນຕາມສັດສ່ວນ
    const taxAmount = lines.reduce((sum, l) => {
      const lineShareOfDiscount = subtotal > 0 ? (l.lineSubtotal / subtotal) * discountAmount : 0
      const taxableAmount = l.lineSubtotal - lineShareOfDiscount
      return sum + taxableAmount * (l.taxRate / 100)
    }, 0)
    const total = subtotal - discountAmount + taxAmount

    const saleNo = `INV-${new Date().getFullYear()}-${String((await prisma.sale.count()) + 1).padStart(4, '0')}`

    const sale = await prisma.$transaction(async (tx) => {
      // ຂາຍ = ຫັກສະຕັອກແບບ FEFO ຄືກັນກັບ Inventory — ຖ້າສະຕັອກບໍ່ພໍ ຈະ throw ແລະຍົກເລີກທັງໃບຂາຍ
      for (const l of lines) {
        await deductFefo(tx, {
          medicineId: l.medicineId,
          branchId,
          quantity: l.quantity,
          type: 'SALE',
          reason: `Sale ${saleNo}`,
          userId,
        })
      }

      return tx.sale.create({
        data: {
          saleNo,
          branchId,
          cashierId: userId,
          customerId: customerId || null,
          customerName: resolvedCustomerName,
          subtotal,
          discountAmount,
          taxAmount,
          total,
          paymentMethod,
          items: {
            create: lines.map((l) => ({
              medicineId: l.medicineId,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              lineTotal: l.unitPrice * l.quantity,
            })),
          },
        },
        include: withRels,
      })
    }, { timeout: 30_000 })
    // ↑ default 5000ms ບໍ່ພໍ ຖ້າ database ຢູ່ໄກ (network latency) ແລະ sale ມີຫຼາຍລາຍການ —
    // ແຕ່ລະລາຍການ deductFefo ໃຊ້ຫຼາຍ round trip (find batch + update + ບັນທຶກ movement)

    res.status(201).json(toDto(sale))
  }),
)
