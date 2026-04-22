-- DropIndex
DROP INDEX "PatrolSession_userId_status_idx";

-- DropIndex
DROP INDEX "PatrolSession_vehicleId_idx";

-- CreateIndex
CREATE INDEX "PatrolSession_userId_startTime_idx" ON "PatrolSession"("userId", "startTime");

-- CreateIndex
CREATE INDEX "PatrolSession_vehicleId_startTime_idx" ON "PatrolSession"("vehicleId", "startTime");

-- CreateIndex
CREATE INDEX "PatrolSession_status_idx" ON "PatrolSession"("status");
