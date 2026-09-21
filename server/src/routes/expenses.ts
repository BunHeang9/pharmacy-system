import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma'
import { requireAuth, requireRole, NOT_CLERK } from '../middleware/auth'

import { asyncHandler } from '../lib/asyncHandler'

export const expensesRouter = Router()
expensesRouter.use(requireAuth)
expensesRouter.use(requireRole(...NOT_CLERK))

const bodySchema = z.object({
  category: z.enum(['OWNER_DRAW', 'RENT', 'UTILITIES', 'SALARIES', 'OTHER']),
  amount: z.number().positive(),
  note: z.string().optional(),
})

const toDto = (e: any) => ({
  id: e.id,
  category: e.category,
  amount: Number(e.amount),
  note: e.note,
  recordedBy: e.user.name,
  date: e.createdAt.toISOString(),
})

const PERIOD_DAYS: Record<string, number> = { week: 7, month: 30, quarter: 90, year: 365 }

expensesRouter.get('/', asyncHandler(async (req, res) => {
  const periodParam = typeof req.query.period === 'string' ? req.query.period : undefined
  const days = periodParam ? PERIOD_DAYS[periodParam] : undefined
  const since = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : undefined

  const rows = await prisma.expense.findMany({
    where: since ? { createdAt: { gte: since } } : undefined,
    include: { user: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json(rows.map(toDto))
}))


expensesRouter.post('/', asyncHandler(async (req, res) => {
  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ code: 'INVALID_INPUT', error: 'Invalid data' }); return }

  const branchId = req.user!.branchId ?? 'main'
  const e = await prisma.expense.create({
    data: { ...parsed.data, branchId, userId: req.user!.id },
    include: { user: true },
  })
  res.status(201).json(toDto(e))
}))
