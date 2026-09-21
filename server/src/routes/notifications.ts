import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { prisma } from '../prisma'
import { requireAuth } from '../middleware/auth'
import { asyncHandler } from '../lib/asyncHandler'
import { daysUntil, expiryStatus } from '../lib/expiry'
import type { NotificationType } from '@prisma/client'


export const notificationsRouter = Router()
notificationsRouter.use(requireAuth)

// ສ້າງ/ອັບເດດແບບບໍ່ແກ້ສະຖານະ read ຖ້າມີແລ້ວ (upsert ກັບ update ຫວ່າງເປົ່າ)
async function upsertNotification(key: string, type: NotificationType, title: string, message: string) {
  await prisma.notification.upsert({
    where: { key },
    update: {},
    create: { key, type, title, message },
  })
}
// ລຶບອອກເມື່ອເງື່ອນໄຂຫາຍໄປແລ້ວ (ສະຕັອກກັບຄືນປົກກະຕິ, ຈ່າຍຢາແລ້ວ, ...)
async function clearNotification(key: string) {
  await prisma.notification.deleteMany({ where: { key } })
}

// ກວດສະພາບຈິງ (ສະຕັອກ, ວັນໝົດອາຍຸ, ໃບສັ່ງຢາທີ່ລໍຖ້າ) ແລ້ວ upsert/clear ແຈ້ງເຕືອນໃຫ້ກົງກັນ — ເອີ້ນທຸກຄັ້ງກ່ອນ list
async function ensureNotifications() {
  const medicines = await prisma.medicine.findMany({
    where: { isActive: true },
    include: { batches: { where: { quantity: { gt: 0 } } } },
  })
  await Promise.all(
    medicines.map((m) => {
      const stock = m.batches.reduce((s, b) => s + b.quantity, 0)
      const key = `stock:${m.id}`
      if (stock === 0) {
        return upsertNotification(key, 'DANGER', `${m.name} is out of stock`, `${m.name} has no remaining stock across all batches.`)
      }
      if (stock < m.minStock) {
        return upsertNotification(key, 'WARNING', `${m.name} is low on stock`, `Only ${stock} left, below the minimum of ${m.minStock}.`)
      }
      return clearNotification(key)
    }),
  )

  const batches = await prisma.batch.findMany({
    where: { quantity: { gt: 0 } },
    include: { medicine: true },
  })
  await Promise.all(
    batches.map((b) => {
      const days = daysUntil(b.expiryDate)
      const status = expiryStatus(days)
      const key = `expiry:${b.id}`
      if (status === 'Expired') {
        return upsertNotification(key, 'DANGER', `${b.medicine.name} batch expired`, `Batch ${b.batchNo} (${b.quantity} units) expired ${Math.abs(days)} day(s) ago.`)
      }
      if (status === 'Critical') {
        return upsertNotification(key, 'DANGER', `${b.medicine.name} expiring soon`, `Batch ${b.batchNo} (${b.quantity} units) expires in ${days} day(s).`)
      }
      if (status === 'Expiring Soon') {
        return upsertNotification(key, 'WARNING', `${b.medicine.name} expiring soon`, `Batch ${b.batchNo} (${b.quantity} units) expires in ${days} day(s).`)
      }
      return clearNotification(key)
    }),
  )

  const prescriptions = await prisma.prescription.findMany({
    select: { id: true, status: true, patientName: true, doctorName: true, rxNo: true },
  })
  await Promise.all(
    prescriptions.map((p) => {
      const key = `rx:${p.id}`
      if (p.status === 'PENDING') {
        return upsertNotification(key, 'INFO', `New prescription ${p.rxNo}`, `${p.patientName} — prescribed by Dr. ${p.doctorName}, awaiting dispensing.`)
      }
      return clearNotification(key)
    }),
  )
}

const toDto = (n: { id: string; type: NotificationType; title: string; message: string; read: boolean; createdAt: Date }) => ({
  id: n.id,
  type: n.type.toLowerCase(),
  title: n.title,
  message: n.message,
  read: n.read,
  time: n.createdAt.toISOString(),
})

notificationsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    await ensureNotifications()
    const rows = await prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
    res.json(rows.map(toDto))
  }),
)

const createSchema = z.object({
  type: z.enum(['INFO', 'WARNING', 'DANGER', 'SUCCESS']).default('WARNING'),
  title: z.string().min(1),
  message: z.string().min(1),
})

// ແຈ້ງເຕືອນແບບ manual (ພະນັກງານກົດ "Notify" ເອງ) — ຄົນລະແບບກັບ ensureNotifications() ທີ່ upsert ຕາມ key ຄົງທີ່
// key ແບບສຸ່ມສະເໝີ ເພື່ອບໍ່ໃຫ້ຂັດກັນກັບແຈ້ງເຕືອນອັດຕະໂນມັດ, ແລະ ໃຫ້ກົດແຈ້ງເຕືອນຊ້ຳໄດ້ຫຼາຍເທື່ອ
notificationsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ code: 'INVALID_INPUT', error: 'Invalid data' }); return }
    const n = await prisma.notification.create({
      data: { key: `manual:${randomUUID()}`, ...parsed.data },
    })
    res.status(201).json(toDto(n))
  }),
)
notificationsRouter.post(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const n = await prisma.notification.update({ where: { id: req.params.id }, data: { read: true } })
    
    res.json(toDto(n))
  }),
)

notificationsRouter.post(
  '/read-all',
  asyncHandler(async (_req, res) => {
    await prisma.notification.updateMany({ where: { read: false }, data: { read: true } })
    res.json({ ok: true })
  }),
)

// ບໍ່ໄດ້ "ປິດການໃຊ້ງານ" ຄືອັນອື່ນ — dismiss ຂອງແຈ້ງເຕືອນຄືການລຶບຈິງ, ຄືກັບປິດ toast
notificationsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.notification.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  }),
)
