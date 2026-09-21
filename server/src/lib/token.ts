import jwt from 'jsonwebtoken'

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is missing in server/.env')
}
const JWT_SECRET = process.env.JWT_SECRET

const MAX_AGE_SEC = 60 * 60 * 24 * 7 // 7 ວັນ

export const COOKIE_NAME = 'token'

// ຕັ້ງຄ່າ cookie — httpOnly ເພື່ອບໍ່ໃຫ້ JavaScript ອ່ານໄດ້ (ປ້ອງກັນ XSS)
export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production', // https ເທົ່ານັ້ນ ຕອນ deploy
  maxAge: MAX_AGE_SEC * 1000,
  path: '/',
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: MAX_AGE_SEC })
}

export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub?: string }
    return payload.sub ?? null
  } catch {
    return null
  }
}
