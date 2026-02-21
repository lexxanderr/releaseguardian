-- CreateEnum
CREATE TYPE "CheckStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'CHECK_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE 'CHECK_REJECTED';

-- AlterTable
ALTER TABLE "ReleaseCheck" ADD COLUMN     "decidedAt" TIMESTAMP(3),
ADD COLUMN     "decidedById" TEXT,
ADD COLUMN     "decisionReason" VARCHAR(500),
ADD COLUMN     "status" "CheckStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "ReleaseCheck_status_createdAt_idx" ON "ReleaseCheck"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "ReleaseCheck" ADD CONSTRAINT "ReleaseCheck_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
