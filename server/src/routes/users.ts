import { Router } from 'express'
import { z } from 'zod'
import { hash } from 'bcryptjs'
import { prisma } from '../prisma'
import { requireAuth, requireRole, NOT_CLERK } from '../middleware/auth'

import { asyncHandler } from '../lib/asyncHandler'

export const usersRouter = Router()
usersRouter.use(requireAuth)
usersRouter.use(requireRole(...NOT_CLERK))

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'PHARMACIST', 'CASHIER', 'INVENTORY_MANAGER', 'PHARMACY_CLERK'] as const


const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum(ROLES),
  password: z.string().min(8),
})
const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.enum(ROLES).optional(),
  password: z.string().min(8).optional(), // ໃສ່ສະເພາະເມື່ອຕ້ອງການປ່ຽນລະຫັດ
})

const toDto = (u: any) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  status: u.isActive ? 'Active' : 'Inactive',
  lastLogin: u.lastLoginAt ? u.lastLoginAt.toISOString().slice(0, 16).replace('T', ' ') : '—',
})

usersRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.user.findMany({ orderBy: { name: 'asc' } })
    res.json(rows.map(toDto))
  }),
)

usersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ code: 'INVALID_INPUT', error: 'Invalid data', details: parsed.error.issues })
      return
    }
    const { password, ...rest } = parsed.data
    const passwordHash = await hash(password, 10)
    const u = await prisma.user.create({
      data: { ...rest, passwordHash, branchId: req.user!.branchId },
    })
    res.status(201).json(toDto(u))
  }),
)

usersRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ code: 'INVALID_INPUT', error: 'Invalid data' })
      return
    }
    const { password, ...rest } = parsed.data
    const data: any = { ...rest }
    if (password) data.passwordHash = await hash(password, 10)

    const u = await prisma.user.update({ where: { id: req.params.id }, data })
    res.json(toDto(u))
  }),
)

// ບໍ່ລຶບຜູ້ໃຊ້ — ສະຫຼັບ Active/Inactive, ແລະ ຫ້າມປິດບັນຊີຕົນເອງ
usersRouter.post(
  '/:id/toggle-status',
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user!.id) {
      res.status(409).json({ code: 'CANNOT_DEACTIVATE_SELF', error: 'You cannot deactivate your own account' })
      return
    }
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } })
    if (!existing) {
      res.status(404).json({ code: 'NOT_FOUND', error: 'Not found' })
      return
    }
    const u = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: !existing.isActive },
    })
    res.json(toDto(u))
  }),
)
