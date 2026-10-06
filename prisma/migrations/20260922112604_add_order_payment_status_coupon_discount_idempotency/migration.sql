-- CreateEnum
CREATE TYPE "OrderPaymentStatus" AS ENUM ('Pending', 'Paid', 'Failed', 'Refunded');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "couponDiscount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "paymentStatus" "OrderPaymentStatus" NOT NULL DEFAULT 'Pending';

-- CreateIndex
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");

