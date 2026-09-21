import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { authRouter } from './routes/auth'
import { categoriesRouter } from './routes/categories'
import { suppliersRouter } from './routes/suppliers'
import { medicinesRouter } from './routes/medicines'
import { stockRouter } from './routes/stock'
import { salesRouter } from './routes/sales'
import { purchasesRouter } from './routes/purchases'
import { prescriptionsRouter } from './routes/prescriptions'
import { customersRouter } from './routes/customers'
import { usersRouter } from './routes/users'
import { reportsRouter } from './routes/reports'
import { notificationsRouter } from './routes/notifications'
import { settingsRouter } from './routes/settings'
import { expensesRouter } from './routes/expenses'



import { InsufficientStockError } from './lib/fefo'

const app = express()
const PORT = Number(process.env.PORT) || 3000
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }))
app.use(express.json())
app.use(cookieParser())

app.get('/api/health', async (_req, res) => {
  const users = await prisma.user.count()
  res.json({ ok: true, users })
})

app.use('/api/auth', authRouter)
app.use('/api/categories', categoriesRouter)
app.use('/api/suppliers', suppliersRouter)
app.use('/api/medicines', medicinesRouter)
app.use('/api/sales', salesRouter)
app.use('/api/purchases', purchasesRouter)
app.use('/api/prescriptions', prescriptionsRouter)
app.use('/api/customers', customersRouter)
app.use('/api/users', usersRouter)
app.use('/api/reports', reportsRouter)
app.use('/api/notifications', notificationsRouter)
// settingsRouter ມີ /public ທີ່ບໍ່ຕ້ອງ login (ໜ້າ login ໃຊ້) — ຕ້ອງ mount ກ່ອນ stockRouter
// ບໍ່ດັ່ງນັ້ນ stockRouter ທີ່ mount ຢູ່ /api ເລີຍ (ບໍ່ມີ path ກັ່ນ) ຈະດັກ requireAuth ຂອງມັນເອງໃສ່
// ທຸກ request ທີ່ຂຶ້ນຕົ້ນດ້ວຍ /api ກ່ອນ, ເຮັດໃຫ້ /api/settings/public ກາຍເປັນຕ້ອງ login ໄປນຳ
app.use('/api/settings', settingsRouter)
app.use('/api/expenses', expensesRouter)
// batches ຢູ່ໃຕ້ /api/medicines/:id/batches ແລະ /api/stock-movements — ຄົນລະ router ຈາກ catalogue CRUD
// mount ຢູ່ທ້າຍສຸດໂດຍເຈດຕະນາ — ມັນ mount ຢູ່ /api ເລີຍ (ບໍ່ມີ path ກັ່ນ) ຈຶ່ງຕ້ອງມາຫຼັງ router ອື່ນໆ
// ທັງໝົດ ບໍ່ດັ່ງນັ້ນ requireAuth ຂອງມັນຈະດັກທຸກ request /api/* ກ່ອນ router ທີ່ຖືກຕ້ອງ
app.use('/api', stockRouter)


// error handler — ຕ້ອງຢູ່ທ້າຍສຸດ ແລະ ຮັບ 4 arguments
// `code` = ຄ່າຄົງທີ່ໃຫ້ client ແປເປັນພາສາທີ່ຜູ້ໃຊ້ເລືອກ. `error` = ຂໍ້ຄວາມພາສາອັງກິດ ໄວ້ debug/fallback ເທົ່ານັ້ນ
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // ສະຕັອກບໍ່ພໍ (ຈາກ deductFefo — stock-movements ຫຼື sales) → 409
  if (err instanceof InsufficientStockError) {
    res.status(409).json({ code: 'INSUFFICIENT_STOCK', available: err.available, error: err.message })
    return
  }
  // ຄ່າຊ້ຳ (barcode/sku/email/name ທີ່ເປັນ @unique) → 409 ພ້ອມຂໍ້ຄວາມທີ່ເຂົ້າໃຈໄດ້
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    const field = (err.meta?.target as string[] | undefined)?.[0] || 'value'
    res.status(409).json({ code: 'DUPLICATE_VALUE', field, error: `${field} is already used by another record` })
    return
  }
  // ອ້າງອິງ record ທີ່ບໍ່ມີ (ຖືກລຶບ/ແກ້ໄປແລ້ວ) → 404
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
    res.status(404).json({ code: 'NOT_FOUND', error: 'Record not found' })
    return
  }

  console.error(err)
  res.status(500).json({ code: 'SERVER_ERROR', error: 'Server error' })
})

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
