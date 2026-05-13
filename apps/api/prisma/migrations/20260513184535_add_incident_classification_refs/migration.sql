-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "incidentCodeId" TEXT,
ADD COLUMN     "incidentSubcodeId" TEXT;

-- AlterTable
ALTER TABLE "PatrolEvent" ADD COLUMN     "incidentCodeId" TEXT,
ADD COLUMN     "incidentSubcodeId" TEXT;

-- CreateIndex
CREATE INDEX "Incident_incidentCodeId_idx" ON "Incident"("incidentCodeId");

-- CreateIndex
CREATE INDEX "Incident_incidentSubcodeId_idx" ON "Incident"("incidentSubcodeId");

-- CreateIndex
CREATE INDEX "PatrolEvent_incidentCodeId_idx" ON "PatrolEvent"("incidentCodeId");

-- CreateIndex
CREATE INDEX "PatrolEvent_incidentSubcodeId_idx" ON "PatrolEvent"("incidentSubcodeId");

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_incidentCodeId_fkey" FOREIGN KEY ("incidentCodeId") REFERENCES "IncidentCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_incidentSubcodeId_fkey" FOREIGN KEY ("incidentSubcodeId") REFERENCES "IncidentSubcode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatrolEvent" ADD CONSTRAINT "PatrolEvent_incidentCodeId_fkey" FOREIGN KEY ("incidentCodeId") REFERENCES "IncidentCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatrolEvent" ADD CONSTRAINT "PatrolEvent_incidentSubcodeId_fkey" FOREIGN KEY ("incidentSubcodeId") REFERENCES "IncidentSubcode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
