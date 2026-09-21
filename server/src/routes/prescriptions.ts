import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma'
import { requireAuth, requireRole, NOT_CLERK } from '../middleware/auth'

import { asyncHandler } from '../lib/asyncHandler'
import { deductFefo } from '../lib/fefo'

export const prescriptionsRouter = Router()
prescriptionsRouter.use(requireAuth)
prescriptionsRouter.use(requireRole(...NOT_CLERK))

const createSchema = z.object({
  patientName: z.string().min(1),
  doctorName: z.string().min(1),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        medicineId: z.string().min(1),
        quantity: z.coerce.number().int().positive(),
        dosageInstructions: z.string().optional(),
      }),
    )
    .min(1),
})

const toDto = (p: any) => ({
  id: p.id,
  rxNo: p.rxNo,
  patient: p.patientName,
  doctor: p.doctorName,
  pharmacist: p.pharmacist?.name ?? null,
  status: p.status,
  medicines: p.items?.length ?? 0,
  date: p.createdAt.toISOString().slice(0, 10),
  completedAt: p.completedAt ? p.completedAt.toISOString().slice(0, 10) : null,
  notes: p.notes,
})

const withRels = { pharmacist: true, items: true } as const

prescriptionsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.prescription.findMany({ orderBy: { createdAt: 'desc' }, include: withRels })
    res.json(rows.map(toDto))
  }),
)

// ລາຍລະອຽດ — ໃຊ້ key "lines" ສຳລັບລາຍການຢາ (ບໍ່ໃຊ້ "medicines" ຊ້ຳກັບ count ຂອງ toDto)
prescriptionsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const p = await prisma.prescription.findUnique({
      where: { id: req.params.id },
      include: { pharmacist: true, items: { include: { medicine: true } } },
    })
    if (!p) {
      res.status(404).json({ code: 'NOT_FOUND', error: 'Not found' })
      return
    }
    res.json({
      ...toDto(p),
      lines: p.items.map((i) => ({
        medicineId: i.medicineId,
        medicine: i.medicine.name,
        quantity: i.quantity,
        dosageInstructions: i.dosageInstructions,
      })),
    })
  }),
)

// ສ້າງໃບສັ່ງຢາ — ຍັງບໍ່ກະທົບສະຕັອກ
prescriptionsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ code: 'INVALID_INPUT', error: 'Invalid data', details: parsed.error.issues })
      return
    }
    const { patientName, doctorName, notes, items } = parsed.data
    const branchId = req.user!.branchId ?? 'main'
    const rxNo = `RX-${new Date().getFullYear()}-${String((await prisma.prescription.count()) + 1).padStart(4, '0')}`

    const rx = await prisma.prescription.create({
      data: {
        rxNo,
        patientName,
        doctorName,
        notes,
        branchId,
        items: {
          create: items.map((i) => ({
            medicineId: i.medicineId,
            quantity: i.quantity,
            dosageInstructions: i.dosageInstructions,
          })),
        },
      },
      include: withRels,
    })
    res.status(201).json(toDto(rx))
  }),
)

// ແກ້ໄຂ — ອະນຸຍາດເມື່ອຍັງບໍ່ COMPLETED/CANCELLED (ຄືກັນກັບເງື່ອນໄຂ /:id/status ແລະ /:id/complete)
prescriptionsRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.prescription.findUnique({ where: { id: req.params.id } })
    if (!existing) {
      res.status(404).json({ code: 'NOT_FOUND', error: 'Not found' })
      return
    }
    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
      res.status(409).json({
        code: 'PRESCRIPTION_ALREADY_PROCESSED',
        status: existing.status,
        error: `Prescription is already ${existing.status.toLowerCase()}`,
      })
      return
    }
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ code: 'INVALID_INPUT', error: 'Invalid data', details: parsed.error.issues })
      return
    }
    const { patientName, doctorName, notes, items } = parsed.data

    const rx = await prisma.$transaction(async (tx) => {
      // ລຶບລາຍການເກົ່າແລ້ວສ້າງໃໝ່ທັງໝົດ — ງ່າຍກວ່າ diff ເທື່ອລະລາຍການ
      await tx.prescriptionItem.deleteMany({ where: { prescriptionId: existing.id } })
      return tx.prescription.update({
        where: { id: existing.id },
        data: {
          patientName,
          doctorName,
          notes,
          items: {
            create: items.map((i) => ({
              medicineId: i.medicineId,
              quantity: i.quantity,
              dosageInstructions: i.dosageInstructions,
            })),
          },
        },
        include: withRels,
      })
    })
    res.json(toDto(rx))
  }),
)

const statusSchema = z.object({ status: z.enum(['PROCESSING', 'CANCELLED']) })

// ປ່ຽນສະຖານະແບບບໍ່ກະທົບສະຕັອກ (Pending→Processing, ຫຼື ຍົກເລີກ)
prescriptionsRouter.post(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const parsed = statusSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ code: 'INVALID_INPUT', error: 'Invalid data' })
      return
    }
    const existing = await prisma.prescription.findUnique({ where: { id: req.params.id } })
    if (!existing) {
      res.status(404).json({ code: 'NOT_FOUND', error: 'Not found' })
      return
    }
    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
      res.status(409).json({
        code: 'PRESCRIPTION_ALREADY_PROCESSED',
        status: existing.status,
        error: `Prescription is already ${existing.status.toLowerCase()}`,
      })
      return
    }
    const rx = await prisma.prescription.update({
      where: { id: req.params.id },
      data: { status: parsed.data.status },
      include: withRels,
    })
    res.json(toDto(rx))
  }),
)

// ຈ່າຍຢາ (dispense) — ຫັກສະຕັອກແບບ FEFO ຄືກັນກັບ Sales, ບັນທຶກຜູ້ຈ່າຍ
prescriptionsRouter.post(
  '/:id/complete',
  asyncHandler(async (req, res) => {
    const existing = await prisma.prescription.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    })
    if (!existing) {
      res.status(404).json({ code: 'NOT_FOUND', error: 'Not found' })
      return
    }
    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
      res.status(409).json({
        code: 'PRESCRIPTION_ALREADY_PROCESSED',
        status: existing.status,
        error: `Prescription is already ${existing.status.toLowerCase()}`,
      })
      return
    }

    const userId = req.user!.id
    const branchId = existing.branchId

    const rx = await prisma.$transaction(async (tx) => {
      for (const item of existing.items) {
        await deductFefo(tx, {
          medicineId: item.medicineId,
          branchId,
          quantity: item.quantity,
          type: 'STOCK_OUT',
          reason: `Prescription ${existing.rxNo} dispensed`,
          userId,
        })
      }
      return tx.prescription.update({
        where: { id: existing.id },
        data: { status: 'COMPLETED', completedAt: new Date(), pharmacistId: userId },
        include: withRels,
      })
    }, { timeout: 30_000 })
    // ↑ default 5000ms ບໍ່ພໍ ຖ້າ database ຢູ່ໄກ — deductFefo ຕໍ່ລາຍການໃຊ້ຫຼາຍ round trip

    res.json(toDto(rx))
  }),
)
