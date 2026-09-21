import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma'
import { requireAuth, requireRole, NOT_CLERK } from '../middleware/auth'

import { asyncHandler } from '../lib/asyncHandler'
import { Prisma } from '@prisma/client'


export const purchasesRouter = Router()
purchasesRouter.use(requireAuth)
purchasesRouter.use(requireRole(...NOT_CLERK))

const createSchema = z.object({
  supplierId: z.string().min(1),
  items: z
    .array(
      z.object({
        medicineId: z.string().min(1),
        quantity: z.coerce.number().int().positive(),
        unitCost: z.coerce.number().min(0),
        batchNo: z.string().min(1),
        expiryDate: z.string().min(1),
      }),
    )
    .min(1),
})

const toDto = (p: any) => ({ //toDto mean convert Purchase -> DTO(data transfer object)
    id: p.id, //p mean purchase returned from Prisma
     purchaseNo: p.purchaseNo,// mean get the purchase number
  supplier: p.supplier?.name ?? null,
  supplierId: p.supplierId,
  status: p.status,
  items: p.items.length,
  subtotal: Number(p.subtotal),
  total: Number(p.total),
  date: p.createdAt.toISOString().slice(0, 10),
  receivedAt: p.receivedAt ? p.receivedAt.toISOString().slice(0, 10) : null,
})

const withRels = { supplier: true, items: true } as const

// ລາຍການໃບສັ່ງຊື້
purchasesRouter.get( // This create GET endpoint 
  '/',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.purchase.findMany({
      orderBy: { createdAt: 'desc' },
      include: withRels,
    })
    res.json(rows.map(toDto))
  }),
)
// ສ້າງໃບສັ່ງຊື້ໃໝ່ — ຍັງບໍ່ກະທົບສະຕັອກ (ລໍຖ້າ receive)
purchasesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ code: 'INVALID_INPUT', error: 'Invalid data', details: parsed.error.issues })
      return
    }
    const { supplierId, items } = parsed.data
    const branchId = req.user!.branchId ?? 'main'

    const lines = items.map((i) => ({ ...i, lineTotal: i.quantity * i.unitCost }))
    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0)

    const purchaseNo = `PO-${new Date().getFullYear()}-${String((await prisma.purchase.count()) + 1).padStart(4, '0')}`

    const purchase = await prisma.purchase.create({
      data: {
        purchaseNo,
        supplierId,
        branchId,
        createdById: req.user!.id,
        subtotal,
        total: subtotal, // ບໍ່ມີພາສີ/ຄ່າຂົນສົ່ງໃນ MVP ນີ້
        items: {
          create: lines.map((l) => ({
            medicineId: l.medicineId,
            quantity: l.quantity,
            unitCost: l.unitCost,
            lineTotal: l.lineTotal,
            batchNo: l.batchNo,
            expiryDate: new Date(l.expiryDate),
          })),
        },
      },
      include: withRels,
    })

    res.status(201).json(toDto(purchase))
  }),
)
// ລາຍລະອຽດໃບສັ່ງຊື້ໜຶ່ງໃບ (ລວມລາຍການ + ຊື່ຢາ)
purchasesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const p = await prisma.purchase.findUnique({
      where: { id: req.params.id },
      include: { supplier: true, items: { include: { medicine: true } } },
    })
    if (!p) {
      res.status(404).json({ code: 'NOT_FOUND', error: 'Not found' })
      return
    }
    res.json({
      ...toDto(p),
      items: p.items.map((i) => ({
        medicineId: i.medicineId,
        medicine: i.medicine.name,
        quantity: i.quantity,
        unitCost: Number(i.unitCost),
        lineTotal: Number(i.lineTotal),
        batchNo: i.batchNo,
        expiryDate: i.expiryDate.toISOString().slice(0, 10),
      })),
    })
  }),
)

// ຮັບເຄື່ອງ — ສ້າງ batch ໃໝ່ໃຫ້ທຸກລາຍການ + ເພີ່ມຍອດຄ້າງຈ່າຍໃຫ້ຜູ້ສະໜອງ, ຄັ້ງດຽວເທົ່ານັ້ນ
purchasesRouter.post(
  '/:id/receive',
  asyncHandler(async (req, res) => {
    const existing = await prisma.purchase.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    })
    if (!existing) {
      res.status(404).json({ code: 'NOT_FOUND', error: 'Not found' })
      return
    }
    if (existing.status !== 'PENDING') {
      res.status(409).json({
        code: 'PURCHASE_NOT_PENDING',
        status: existing.status,
        error: `Purchase is already ${existing.status.toLowerCase()}`,
      })
      return
    }

    const userId = req.user!.id

    const purchase = await prisma.$transaction(async (tx) => {
      for (const item of existing.items) {
        const batch = await tx.batch.create({
          data: {
            medicineId: item.medicineId,
            branchId: existing.branchId,
            batchNo: item.batchNo,
            quantity: item.quantity,
            expiryDate: item.expiryDate,
          },
        })
        await tx.stockMovement.create({
          data: {
            batchId: batch.id,
            medicineId: item.medicineId,
            branchId: existing.branchId,
            type: 'STOCK_IN',
            quantity: item.quantity,
            balanceAfter: item.quantity,
            reason: `Purchase ${existing.purchaseNo}`,
            userId,
          },
        })
      }

      await tx.supplier.update({
        where: { id: existing.supplierId },
        data: { balance: { increment: existing.total } },
      })

      return tx.purchase.update({
        where: { id: existing.id },
        data: { status: 'RECEIVED', receivedAt: new Date() },
        include: { supplier: true, items: true },
      })
    }, { timeout: 30_000 })
    // ↑ default 5000ms ບໍ່ພໍ ຖ້າ database ຢູ່ໄກ — ສ້າງ batch/movement ຕໍ່ລາຍການໃຊ້ຫຼາຍ round trip

    res.json(toDto(purchase))
  }),
)

// ແກ້ໄຂ — ອະນຸຍາດສະເພາະ PENDING (ຍັງບໍ່ໄດ້ receive, ຍັງບໍ່ກະທົບສະຕັອກ/ຍອດຄ້າງຈ່າຍ)
purchasesRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.purchase.findUnique({ where: { id: req.params.id } })
    if (!existing) {
      res.status(404).json({ code: 'NOT_FOUND', error: 'Not found' })
      return
    }
    if (existing.status !== 'PENDING') {
      res.status(409).json({
        code: 'PURCHASE_NOT_PENDING',
        status: existing.status,
        error: `Purchase is already ${existing.status.toLowerCase()}`,
      })
      return
    }
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ code: 'INVALID_INPUT', error: 'Invalid data', details: parsed.error.issues })
      return
    }
    const { supplierId, items } = parsed.data
    const lines = items.map((i) => ({ ...i, lineTotal: i.quantity * i.unitCost }))
    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0)

    const purchase = await prisma.$transaction(async (tx) => {
      // ລຶບລາຍການເກົ່າແລ້ວສ້າງໃໝ່ທັງໝົດ — ງ່າຍກວ່າ diff ເທື່ອລະລາຍການ ແລະ ບໍ່ມີຄວາມສ່ຽງເລື່ອງ stale item
      await tx.purchaseItem.deleteMany({ where: { purchaseId: existing.id } })
      return tx.purchase.update({
        where: { id: existing.id },
        data: {
          supplierId,
          subtotal,
          total: subtotal,
          items: {
            create: lines.map((l) => ({
              medicineId: l.medicineId,
              quantity: l.quantity,
              unitCost: l.unitCost,
              lineTotal: l.lineTotal,
              batchNo: l.batchNo,
              expiryDate: new Date(l.expiryDate),
            })),
          },
        },
        include: withRels,
      })
    })

    res.json(toDto(purchase))
  }),
)

// ຍົກເລີກ — ອະນຸຍາດສະເພາະ PENDING; ບໍ່ລຶບແຖວ, ແຕ່ປ່ຽນສະຖານະເປັນ CANCELLED (ຄືກັນກັບ soft-delete ບ່ອນອື່ນ)
purchasesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.purchase.findUnique({ where: { id: req.params.id } })
    if (!existing) {
      res.status(404).json({ code: 'NOT_FOUND', error: 'Not found' })
      return
    }
    if (existing.status !== 'PENDING') {
      res.status(409).json({
        code: 'PURCHASE_NOT_PENDING',
        status: existing.status,
        error: `Purchase is already ${existing.status.toLowerCase()}`,
      })
      return
    }
    await prisma.purchase.update({ where: { id: existing.id }, data: { status: 'CANCELLED' } })
    res.json({ ok: true })
  }),
)
