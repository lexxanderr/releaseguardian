-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OFFICER', 'SUPERVISOR', 'AUDITOR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseCheck" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "scheduledReleaseAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "ReleaseCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditRecord" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "prevHash" TEXT,
    "hash" TEXT NOT NULL,

    CONSTRAINT "AuditRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "ReleaseCheck_createdById_idx" ON "ReleaseCheck"("createdById");

-- CreateIndex
CREATE INDEX "ReleaseCheck_scheduledReleaseAt_idx" ON "ReleaseCheck"("scheduledReleaseAt");

-- CreateIndex
CREATE INDEX "AuditRecord_checkId_createdAt_idx" ON "AuditRecord"("checkId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditRecord_actorId_createdAt_idx" ON "AuditRecord"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "ReleaseCheck" ADD CONSTRAINT "ReleaseCheck_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditRecord" ADD CONSTRAINT "AuditRecord_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "ReleaseCheck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditRecord" ADD CONSTRAINT "AuditRecord_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
