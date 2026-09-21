import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma'
import { requireAuth, requireRole, NOT_CLERK } from '../middleware/auth'

import { asyncHandler } from '../lib/asyncHandler'

export const settingsRouter = Router()

const bodySchema = z.object({
  shopName: z.string(),
  phone: z.string(),
  address: z.string(),
  timezone: z.string(),
  currency: z.string(),
  taxRate: z.number(),
  invoicePrefix: z.string(),
  receiptFooter: z.string(),
  lowStockAlert: z.boolean(),
  expiryAlert: z.boolean(),
  expiryWarningDays: z.number().int(),
})

const toDto = (s: any) => ({
  shopName: s.shopName,
  phone: s.phone,
  address: s.address,
  timezone: s.timezone,
  currency: s.currency,
  taxRate: Number(s.taxRate),
  invoicePrefix: s.invoicePrefix,
  receiptFooter: s.receiptFooter,
  lowStockAlert: s.lowStockAlert,
  expiryAlert: s.expiryAlert,
  expiryWarningDays: s.expiryWarningDays,
})

// ຍັງບໍ່ມີແຖວ settings ຂອງສາຂານີ້ → ສ້າງແຖວຄ່າ default ໃຫ້ (upsert ກັບ update ຫວ່າງເປົ່າ)
async function ensureSetting(branchId: string) {
  return prisma.setting.upsert({
    where: { branchId },
    update: {},
    create: { branchId },
  })
}

// ໜ້າ login ຍັງບໍ່ login ຈຶ່ງເອີ້ນ /api/settings (ຕ້ອງ login) ບໍ່ໄດ້ — ເສັ້ນທາງນີ້ຢູ່ກ່ອນ requireAuth
// ຈຶ່ງບໍ່ຕ້ອງ login, ແຕ່ສົ່ງຄືນສະເພາະ shopName ເທົ່ານັ້ນ (ບໍ່ແມ່ນຂໍ້ມູນທັງໝົດ)
settingsRouter.get('/public', asyncHandler(async (_req, res) => {
  const s = await ensureSetting('main')
  res.json({ shopName: s.shopName })
}))

settingsRouter.use(requireAuth)

// GET ເປີດໃຫ້ທຸກ role — AppLayout ຮຽກທຸກໜ້າເພື່ອເອົາຊື່ຮ້ານ/ສະກຸນເງິນ/ອັດຕາພາສີ ມາໃຊ້ໃນ UI
// ມີແຕ່ PUT (ແກ້ໄຂ) ເທົ່ານັ້ນທີ່ Pharmacy Clerk ເຮັດບໍ່ໄດ້
settingsRouter.get('/', asyncHandler(async (req, res) => {
  const branchId = req.user!.branchId ?? 'main'
  const s = await ensureSetting(branchId)
  res.json(toDto(s))
}))

settingsRouter.put('/', requireRole(...NOT_CLERK), asyncHandler(async (req, res) => {
  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ code: 'INVALID_INPUT', error: 'Invalid data' }); return }

  const branchId = req.user!.branchId ?? 'main'
  await ensureSetting(branchId)
  const s = await prisma.setting.update({ where: { branchId }, data: parsed.data })
  res.json(toDto(s))
}))
