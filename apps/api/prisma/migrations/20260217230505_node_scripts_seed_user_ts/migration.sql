/*
  Warnings:

  - You are about to alter the column `reference` on the `ReleaseCheck` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.

*/
-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('COURT_ORDER', 'LICENCE_STATUS', 'RECALL_STATUS', 'IMMIGRATION_HOLD', 'WARRANT_CHECK', 'SAFEGUARDING_CHECK', 'OTHER');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CHECK_CREATED', 'EVIDENCE_RECORDED');

-- DropForeignKey
ALTER TABLE "AuditRecord" DROP CONSTRAINT "AuditRecord_checkId_fkey";

-- AlterTable
ALTER TABLE "ReleaseCheck" ADD COLUMN     "updatedAt" TIMESTAMP(3),
ALTER COLUMN "reference" SET DATA TYPE VARCHAR(64);

-- CreateTable
CREATE TABLE "EvidenceItem" (
    "id" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "type" "EvidenceType" NOT NULL,
    "value" JSONB NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "EvidenceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EvidenceItem_checkId_createdAt_idx" ON "EvidenceItem"("checkId", "createdAt");

-- CreateIndex
CREATE INDEX "EvidenceItem_createdById_createdAt_idx" ON "EvidenceItem"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "EvidenceItem_type_idx" ON "EvidenceItem"("type");

-- CreateIndex
CREATE INDEX "AuditRecord_action_createdAt_idx" ON "AuditRecord"("action", "createdAt");

-- CreateIndex
CREATE INDEX "ReleaseCheck_createdAt_idx" ON "ReleaseCheck"("createdAt");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- AddForeignKey
ALTER TABLE "EvidenceItem" ADD CONSTRAINT "EvidenceItem_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "ReleaseCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceItem" ADD CONSTRAINT "EvidenceItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditRecord" ADD CONSTRAINT "AuditRecord_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "ReleaseCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
