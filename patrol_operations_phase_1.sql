-- DropForeignKey
ALTER TABLE "PatrolSession" DROP CONSTRAINT "PatrolSession_vehicleId_fkey";

-- AlterTable
ALTER TABLE "PatrolSession" ADD COLUMN     "tempVehicleCallSign" TEXT,
ADD COLUMN     "tempVehicleColour" TEXT,
ADD COLUMN     "tempVehicleMake" TEXT,
ADD COLUMN     "tempVehicleModel" TEXT,
ADD COLUMN     "tempVehicleNotes" TEXT,
ADD COLUMN     "tempVehicleOwnerName" TEXT,
ADD COLUMN     "tempVehicleOwnerPhone" TEXT,
ADD COLUMN     "tempVehicleRegistration" TEXT,
ADD COLUMN     "tempVehicleType" TEXT,
ADD COLUMN     "vehicleMode" TEXT NOT NULL DEFAULT 'REGISTERED',
ALTER COLUMN "vehicleId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "PatrolSessionCrew" (
    "id" TEXT NOT NULL,
    "patrolSessionId" TEXT NOT NULL,
    "userId" TEXT,
    "memberId" TEXT,
    "role" TEXT NOT NULL DEFAULT 'CREW',
    "attendanceStatus" TEXT NOT NULL DEFAULT 'PRESENT',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "creditGranted" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "PatrolSessionCrew_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatrolSessionCrew_patrolSessionId_idx" ON "PatrolSessionCrew"("patrolSessionId");

-- CreateIndex
CREATE INDEX "PatrolSessionCrew_userId_idx" ON "PatrolSessionCrew"("userId");

-- CreateIndex
CREATE INDEX "PatrolSessionCrew_memberId_idx" ON "PatrolSessionCrew"("memberId");

-- CreateIndex
CREATE INDEX "PatrolSessionCrew_role_idx" ON "PatrolSessionCrew"("role");

-- CreateIndex
CREATE UNIQUE INDEX "PatrolSessionCrew_patrolSessionId_userId_key" ON "PatrolSessionCrew"("patrolSessionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PatrolSessionCrew_patrolSessionId_memberId_key" ON "PatrolSessionCrew"("patrolSessionId", "memberId");

-- AddForeignKey
ALTER TABLE "PatrolSession" ADD CONSTRAINT "PatrolSession_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatrolSessionCrew" ADD CONSTRAINT "PatrolSessionCrew_patrolSessionId_fkey" FOREIGN KEY ("patrolSessionId") REFERENCES "PatrolSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatrolSessionCrew" ADD CONSTRAINT "PatrolSessionCrew_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatrolSessionCrew" ADD CONSTRAINT "PatrolSessionCrew_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

