// ສະຄຣິບໃຊ້ຄັ້ງດຽວ — ປັບຄ່າເງິນທີ່ມີຢູ່ແລ້ວໃນຖານຂໍ້ມູນຈາກ USD-scale ເປັນ Kip-scale
// (ຄູນທຸກຊ່ອງເງິນດ້ວຍຄ່າດຽວກັນ 20,000 ຈຶ່ງຮັກສາຄວາມສຳພັນທາງຄະນິດສາດໄວ້ຄົບ —
// lineTotal = unitPrice * qty, subtotal = ຜົນລວມແຖວ, tax = subtotal * taxRate% ບໍ່ປ່ຽນ).
// ບໍ່ແຕະ Medicine.taxRate ແລະ Customer.discountPct — ອັນນັ້ນເປັນ % ບໍ່ແມ່ນເງິນ.
// ໃຊ້ raw SQL UPDATE ຕໍ່ຕາຕະລາງ (ບໍ່ແມ່ນ loop ຕໍ່ແຖວ) ເພື່ອບໍ່ໃຫ້ transaction ໝົດເວລາຜ່ານທາງ network ໄປ Neon.
// ແລ່ນຄັ້ງດຽວ: npx tsx prisma/rescaleToKip.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const FACTOR = 20_000

async function main() {
  const results = await prisma.$transaction([
    prisma.$executeRaw`UPDATE "Supplier" SET balance = balance * ${FACTOR}`,
    prisma.$executeRaw`UPDATE "Medicine" SET "purchasePrice" = "purchasePrice" * ${FACTOR}, "sellingPrice" = "sellingPrice" * ${FACTOR}`,
    prisma.$executeRaw`UPDATE "Sale" SET subtotal = subtotal * ${FACTOR}, "discountAmount" = "discountAmount" * ${FACTOR}, "taxAmount" = "taxAmount" * ${FACTOR}, total = total * ${FACTOR}`,
    prisma.$executeRaw`UPDATE "SaleItem" SET "unitPrice" = "unitPrice" * ${FACTOR}, "lineTotal" = "lineTotal" * ${FACTOR}`,
    prisma.$executeRaw`UPDATE "Purchase" SET subtotal = subtotal * ${FACTOR}, total = total * ${FACTOR}`,
    prisma.$executeRaw`UPDATE "PurchaseItem" SET "unitCost" = "unitCost" * ${FACTOR}, "lineTotal" = "lineTotal" * ${FACTOR}`,
    prisma.$executeRaw`UPDATE "SupplierPayment" SET amount = amount * ${FACTOR}`,
  ])

  const [sup, med, sale, si, pur, pi, pay] = results
  console.log(
    `✅ Rescaled to Kip (×${FACTOR}): ${sup} suppliers, ${med} medicines, ${sale} sales, ` +
      `${si} sale items, ${pur} purchases, ${pi} purchase items, ${pay} supplier payments.`,
  )
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
