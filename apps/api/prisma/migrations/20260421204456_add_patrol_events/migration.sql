-- CreateTable
CREATE TABLE "PatrolEvent" (
    "id" TEXT NOT NULL,
    "patrolId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "incidentCode" TEXT,
    "description" TEXT,
    "assistance" TEXT,
    "sceneActive" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatrolEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatrolEvent_patrolId_createdAt_idx" ON "PatrolEvent"("patrolId", "createdAt");

-- CreateIndex
CREATE INDEX "PatrolEvent_type_idx" ON "PatrolEvent"("type");

-- AddForeignKey
ALTER TABLE "PatrolEvent" ADD CONSTRAINT "PatrolEvent_patrolId_fkey" FOREIGN KEY ("patrolId") REFERENCES "PatrolSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
