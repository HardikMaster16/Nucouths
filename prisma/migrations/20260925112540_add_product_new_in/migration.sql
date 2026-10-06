-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "newIn" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Product_newIn_createdAt_idx" ON "Product"("newIn", "createdAt");
