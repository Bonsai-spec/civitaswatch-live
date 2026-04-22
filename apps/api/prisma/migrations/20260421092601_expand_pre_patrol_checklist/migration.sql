-- AlterTable
ALTER TABLE "PrePatrolChecklist" ADD COLUMN     "callSignConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "radioChecked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vehicleFuelLevel" TEXT,
ADD COLUMN     "vestChecked" BOOLEAN NOT NULL DEFAULT false;
