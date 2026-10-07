-- AlterTable
ALTER TABLE "Medicine" ADD COLUMN     "packPurchasePrice" DECIMAL(12,2),
ADD COLUMN     "packSellingPrice" DECIMAL(12,2),
ADD COLUMN     "packUnit" TEXT,
ADD COLUMN     "unitsPerPack" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "unit" SET DEFAULT 'unit';
