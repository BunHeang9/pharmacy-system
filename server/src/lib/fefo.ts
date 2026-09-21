import type { Prisma, MovementType } from '@prisma/client'

// tx = Prisma client ຫຼື transaction client (ຮັບໄດ້ທັງສອງແບບ)
type Tx = Prisma.TransactionClient

export class InsufficientStockError extends Error {
  constructor(
    public medicineId: string,
    public requested: number,
    public available: number,
  ) {
    super(`Not enough stock — only ${available} available`)
    this.name = 'InsufficientStockError'
  }
}

// ຫັກສະຕັອກແບບ FEFO (batch ໝົດອາຍຸໄວທີ່ສຸດກ່ອນ) — ໃຊ້ຮ່ວມກັນລະຫວ່າງ stock-movements ແລະ sales
// ຕ້ອງເອີ້ນພາຍໃນ prisma.$transaction — throw InsufficientStockError ຖ້າສະຕັອກບໍ່ພໍ (ຍົກເລີກທັງ transaction)
export async function deductFefo(
  tx: Tx,
  params: {
    medicineId: string
    branchId: string
    quantity: number
    type: MovementType
    reason: string
    userId: string
  },
) {
  const { medicineId, branchId, quantity, type, reason, userId } = params

  const batches = await tx.batch.findMany({
    where: { medicineId, quantity: { gt: 0 } },
    orderBy: { expiryDate: 'asc' },
  })
  const totalAvailable = batches.reduce((s, b) => s + b.quantity, 0)
  if (totalAvailable < quantity) {
    throw new InsufficientStockError(medicineId, quantity, totalAvailable)
  }

  let remaining = quantity
  for (const b of batches) {
    if (remaining <= 0) break
    const take = Math.min(remaining, b.quantity)
    const newQty = b.quantity - take
    await tx.batch.update({ where: { id: b.id }, data: { quantity: newQty } })
    await tx.stockMovement.create({
      data: { batchId: b.id, medicineId, branchId, type, quantity: -take, balanceAfter: newQty, reason, userId },
    })
    remaining -= take
  }
}
