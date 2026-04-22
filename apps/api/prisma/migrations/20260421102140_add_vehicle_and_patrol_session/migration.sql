-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "registration" TEXT NOT NULL,
    "colour" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatrolSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "checklistId" TEXT,
    "sector" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "startKm" INTEGER NOT NULL,
    "endKm" INTEGER,
    "totalKm" INTEGER,
    "summary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatrolSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_registration_key" ON "Vehicle"("registration");

-- CreateIndex
CREATE INDEX "PatrolSession_userId_status_idx" ON "PatrolSession"("userId", "status");

-- CreateIndex
CREATE INDEX "PatrolSession_vehicleId_idx" ON "PatrolSession"("vehicleId");

-- AddForeignKey
ALTER TABLE "PatrolSession" ADD CONSTRAINT "PatrolSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatrolSession" ADD CONSTRAINT "PatrolSession_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatrolSession" ADD CONSTRAINT "PatrolSession_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "PrePatrolChecklist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
