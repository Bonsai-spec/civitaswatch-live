-- AlterTable
ALTER TABLE "PatrolEvent" ADD COLUMN     "incidentId" TEXT;

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "incidentCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sector" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "source" TEXT NOT NULL DEFAULT 'PATROL',
    "linkedPatrolId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Incident_incidentCode_key" ON "Incident"("incidentCode");

-- CreateIndex
CREATE INDEX "Incident_incidentCode_idx" ON "Incident"("incidentCode");

-- CreateIndex
CREATE INDEX "Incident_sector_idx" ON "Incident"("sector");

-- CreateIndex
CREATE INDEX "Incident_status_idx" ON "Incident"("status");

-- CreateIndex
CREATE INDEX "Incident_reportedAt_idx" ON "Incident"("reportedAt");

-- CreateIndex
CREATE INDEX "PatrolEvent_incidentId_idx" ON "PatrolEvent"("incidentId");

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_linkedPatrolId_fkey" FOREIGN KEY ("linkedPatrolId") REFERENCES "PatrolSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatrolEvent" ADD CONSTRAINT "PatrolEvent_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;
