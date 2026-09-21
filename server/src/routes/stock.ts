import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma'
import { requireAuth, requireRole, NOT_CLERK } from '../middleware/auth'
import { asyncHandler } from '../lib/asyncHandler'
import { deductFefo } from '../lib/fefo'

export const stockRouter = Router()
stockRouter.use(requireAuth)

const batchDto = (b: { id: string; batchNo: string; quantity: number; expiryDate: Date }) => ({
  id: b.id,
  batchNo: b.batchNo,
  quantity: b.quantity,
  expiryDate: b.expiryDate.toISOString().slice(0, 10),
})

// ລາຍການ batch ທັງໝົດຂອງທຸກຢາ — ໃຊ້ໂດຍໜ້າ Expiry Tracking ແລະ Reports (ແທນ sampleData)
stockRouter.get(
  '/batches',
  asyncHandler(async (_req, res) => {
    const batches = await prisma.batch.findMany({
      where: { quantity: { gt: 0 } },
      orderBy: { expiryDate: 'asc' },
      include: { medicine: { include: { supplier: true } } },
    })
    res.json(
      batches.map((b) => ({
        id: b.id,
        medicineId: b.medicineId,
        medicine: b.medicine.name,
        batch: b.batchNo,
        qty: b.quantity,
        expiry: b.expiryDate.toISOString().slice(0, 10),
        supplier: b.medicine.supplier?.name ?? null,
      })),
    )
  }),
)

// ລາຍການ batch ຂອງຢາໜຶ່ງລາຍການ — ຮຽງໝົດອາຍຸໄວທີ່ສຸດກ່ອນ (ລຳດັບ FEFO)
stockRouter.get(
  '/medicines/:id/batches',
  asyncHandler(async (req, res) => {
    const batches = await prisma.batch.findMany({
      where: { medicineId: req.params.id, quantity: { gt: 0 } },
      orderBy: { expiryDate: 'asc' },
    })
    res.json(batches.map(batchDto))
  }),
)

const stockInSchema = z.object({
  batchNo: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  expiryDate: z.string().min(1), // 'YYYY-MM-DD'
  reason: z.string().min(1).default('Stock received'),
})

// ຮັບເຂົ້າສະຕັອກໃໝ່ = ສ້າງ batch ໃໝ່ສະເໝີ (ວັນໝົດອາຍຸແຕ່ລະຄັ້ງອາດຕ່າງກັນ ຈຶ່ງບໍ່ລວມກັບ batch ເກົ່າ)
stockRouter.post(
  '/medicines/:id/batches',
  requireRole(...NOT_CLERK),
  asyncHandler(async (req, res) => {
    const parsed = stockInSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ code: 'INVALID_INPUT', error: 'Invalid data', details: parsed.error.issues })
      return
    }
    const { batchNo, quantity, expiryDate, reason } = parsed.data

    const medicine = await prisma.medicine.findUnique({ where: { id: req.params.id } })
    if (!medicine || !medicine.isActive) {
      res.status(404).json({ code: 'NOT_FOUND', error: 'Medicine not found' })
      return
    }

    const branchId = req.user!.branchId ?? 'main'

    const batch = await prisma.$transaction(async (tx) => {
      const b = await tx.batch.create({
        data: { medicineId: medicine.id, branchId, batchNo, quantity, expiryDate: new Date(expiryDate) },
      })
      await tx.stockMovement.create({
        data: {
          batchId: b.id,
          medicineId: medicine.id,
          branchId,
          type: 'STOCK_IN',
          quantity,
          balanceAfter: quantity,
          reason,
          userId: req.user!.id,
        },
      })
      return b
    }, { timeout: 30_000 }) // default 5000ms ບໍ່ພໍ ຖ້າ database ຢູ່ໄກ

    res.status(201).json(batchDto(batch))
  }),
)

const movementSchema = z.object({
  medicineId: z.string().min(1),
  type: z.enum(['STOCK_OUT', 'SALE', 'DAMAGED', 'EXPIRED', 'LOST', 'CORRECTION']),
  quantity: z.coerce.number().int().positive(),
  reason: z.string().min(1),
  batchId: z.string().optional(), // ຕ້ອງມີສະເພາະ CORRECTION — ປະເພດອື່ນຫັກແບບ FEFO ອັດຕະໂນມັດ
})

// ປັບສະຕັອກລົງ (ຂາຍ, ເສຍຫາຍ, ໝົດອາຍຸ, ເສຍ) ຫຼື ແກ້ໄຂຍອດ — ທຸກຄັ້ງບັນທຶກ audit log
stockRouter.post(
  '/stock-movements',
  requireRole(...NOT_CLERK),
  asyncHandler(async (req, res) => {
    const parsed = movementSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ code: 'INVALID_INPUT', error: 'Invalid data', details: parsed.error.issues })
      return
    }
    const { medicineId, type, quantity, reason, batchId } = parsed.data
    const userId = req.user!.id
    const branchId = req.user!.branchId ?? 'main'

    if (type === 'CORRECTION') {
      if (!batchId) {
        res.status(400).json({ code: 'CORRECTION_REQUIRES_BATCH', error: 'CORRECTION requires a batchId' })
        return
      }
      const batch = await prisma.batch.findUnique({ where: { id: batchId } })
      if (!batch || batch.medicineId !== medicineId) {
        res.status(404).json({ code: 'NOT_FOUND', error: 'Batch not found' })
        return
      }
      const delta = quantity - batch.quantity
      await prisma.$transaction([
        prisma.batch.update({ where: { id: batchId }, data: { quantity } }),
        prisma.stockMovement.create({
          data: { batchId, medicineId, branchId, type: 'CORRECTION', quantity: delta, balanceAfter: quantity, reason, userId },
        }),
      ])
      res.json({ ok: true })
      return
    }

    // FEFO ໃຊ້ຮ່ວມກັບ sales.ts — ໃຫ້ InsufficientStockError ຫຼຸດຂຶ້ນໄປໃຫ້ error handler ກາງຈັດການ
    await prisma.$transaction((tx) => deductFefo(tx, { medicineId, branchId, quantity, type, reason, userId }), { timeout: 30_000 })

    res.json({ ok: true })
  }),
)
// ປະຫວັດການເຄື່ອນໄຫວສະຕັອກທັງໝົດ — ສະເພາະ SUPER_ADMIN ເບິ່ງໄດ້ (audit log)
stockRouter.get(
  '/stock-movements',
  requireRole('SUPER_ADMIN'),
  asyncHandler(async (_req, res) => {
    const rows = await prisma.stockMovement.findMany({
      orderBy: { createdAt: 'desc' },
      include: { medicine: true, user: true, batch: true },
    })
    res.json(
      rows.map((m) => ({
        id: m.id,
        medicine: m.medicine.name,
        batchNo: m.batch.batchNo,
        type: m.type,
        quantity: m.quantity,
        balanceAfter: m.balanceAfter,
        reason: m.reason,
        user: m.user.name,
        date: m.createdAt.toISOString(),
      })),
    )
  }),
)

