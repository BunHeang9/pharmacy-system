import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma'
import { requireAuth, requireRole, NOT_CLERK } from '../middleware/auth'
import { asyncHandler } from '../lib/asyncHandler'

export const categoriesRouter = Router()
categoriesRouter.use(requireAuth)

const bodySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(''),
  icon: z.string().optional().default('💊'),
})

const toDto = (c: any) => ({
  id: c.id, name: c.name, description: c.description, icon: c.icon,
  medicines: c._count?.medicines ?? 0,
})

categoriesRouter.get('/', asyncHandler(async (_req, res) => {
  const rows = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    include: { _count: { select: { medicines: { where: { isActive: true } } } } },
  })
  res.json(rows.map(toDto))
}))

categoriesRouter.post('/', requireRole(...NOT_CLERK), asyncHandler(async (req, res) => {
  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ code: 'INVALID_INPUT', error: 'Invalid data' }); return }

  const dup = await prisma.category.findUnique({ where: { name: parsed.data.name } })
  if (dup) { res.status(409).json({ code: 'DUPLICATE_VALUE', field: 'name', error: 'A category with this name already exists' }); return }

  const c = await prisma.category.create({ data: parsed.data })
  res.status(201).json(toDto(c))
}))

categoriesRouter.put('/:id', requireRole(...NOT_CLERK), asyncHandler(async (req, res) => {
  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ code: 'INVALID_INPUT', error: 'Invalid data' }); return }
  const c = await prisma.category.update({ where: { id: req.params.id }, data: parsed.data })
  res.json(toDto(c))
}))

// ບໍ່ລຶບຈິງ — ປິດການໃຊ້ງານ, ແລະ ຫ້າມຖ້າຍັງມີຢາ
categoriesRouter.delete('/:id', requireRole(...NOT_CLERK), asyncHandler(async (req, res) => {
  const count = await prisma.medicine.count({ where: { categoryId: req.params.id, isActive: true } })
  if (count > 0) {
    res.status(409).json({ code: 'CATEGORY_HAS_MEDICINES', count, error: `Cannot delete — ${count} medicine(s) still in this category` })
    return
  }
  await prisma.category.update({ where: { id: req.params.id }, data: { isActive: false } })
  res.json({ ok: true })
}))
