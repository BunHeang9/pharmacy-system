-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "shopName" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Vientiane',
    "currency" TEXT NOT NULL DEFAULT 'LAK',
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV-',
    "receiptFooter" TEXT NOT NULL DEFAULT '',
    "lowStockAlert" BOOLEAN NOT NULL DEFAULT true,
    "expiryAlert" BOOLEAN NOT NULL DEFAULT true,
    "expiryWarningDays" INTEGER NOT NULL DEFAULT 90,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Setting_branchId_key" ON "Setting"("branchId");

-- AddForeignKey
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
