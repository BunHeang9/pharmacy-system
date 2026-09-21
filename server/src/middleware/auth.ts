import type { Request, Response, NextFunction } from 'express'
import { prisma } from '../prisma'
import { COOKIE_NAME, verifyToken } from '../lib/token'

// ເພີ່ມ field `user` ໃສ່ type ຂອງ Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        name: string
        email: string
        role: string
        branchId: string | null
      }
    }
  }
}

// ກັນ route ຕາມ role — ໃຊ້ຫຼັງ requireAuth ສະເໝີ (ຕ້ອງມີ req.user ກ່ອນ)
// ຕົວຢ່າງ: router.use(requireRole(...NOT_CLERK)) ອະນຸຍາດທຸກ role ໃນລາຍການ, ປະຕິເສດຄົນອື່ນ
export function requireRole(...allowed: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowed.includes(req.user.role)) {
      res.status(403).json({ code: 'FORBIDDEN', error: 'You do not have permission to do this' })
      return
    }
    next()
  }
}

// ບົດບາດທັງໝົດຍົກເວັ້ນ Pharmacy Clerk — ໃຊ້ຮ່ວມກັນຫຼາຍບ່ອນ ເພື່ອບໍ່ຕ້ອງພິມລາຍການຊ້ຳ
export const NOT_CLERK = ['SUPER_ADMIN', 'ADMIN', 'PHARMACIST', 'CASHIER', 'INVENTORY_MANAGER']

// ກັນ route ທີ່ຕ້ອງ login ກ່ອນ
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined
  const userId = token ? verifyToken(token) : null
  if (!userId) {
    res.status(401).json({ code: 'NOT_AUTHENTICATED', error: 'Not authenticated' })
    return
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, branchId: true, isActive: true },
  })
  if (!user || !user.isActive) {
    res.status(401).json({ code: 'NOT_AUTHENTICATED', error: 'Not authenticated' })
    return
  }

  req.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    branchId: user.branchId,
  }
  next() // mean Authentication succeeded. Continue to the next middleware/route
}
