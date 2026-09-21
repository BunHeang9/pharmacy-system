import { Router } from 'express'
import { compare } from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../prisma'
import { signToken, COOKIE_NAME, cookieOptions } from '../lib/token'
import { requireAuth } from '../middleware/auth'
import { asyncHandler } from '../lib/asyncHandler'

export const authRouter = Router()

const loginSchema = z.object({
  email: z.string().min(3),
  password: z.string().min(1),
})

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ code: 'INVALID_INPUT', error: 'Email and password are required' })
      return
    }
    const { email, password } = parsed.data
    const user = await prisma.user.findUnique({ where: { email } })

    // ຂໍ້ຄວາມດຽວກັນສະເໝີ — ບໍ່ບອກວ່າ email ຫຼື password ຜິດ
    if (!user || !user.isActive || !(await compare(password, user.passwordHash))) {
      res.status(401).json({ code: 'INVALID_CREDENTIALS', error: 'Invalid email or password' })
      return
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })

    res.cookie(COOKIE_NAME, signToken(user.id), cookieOptions)
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
      },
    })
  }),
)

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' })
  res.json({ ok: true })
})

// ໜ້າ frontend ເອີ້ນຕອນເປີດແອັບ ເພື່ອກູ້ session
authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})
