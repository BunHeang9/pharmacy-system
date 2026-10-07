-- CreateEnum
CREATE TYPE "SaleUnit" AS ENUM ('UNIT', 'PACK');

-- AlterTable
ALTER TABLE "PurchaseItem" ADD COLUMN     "unitsPerPack" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "SaleItem" ADD COLUMN     "saleUnit" "SaleUnit" NOT NULL DEFAULT 'UNIT',
ADD COLUMN     "unitsPerPack" INTEGER NOT NULL DEFAULT 1;
