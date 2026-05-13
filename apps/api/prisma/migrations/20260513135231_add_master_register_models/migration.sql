/*
  Warnings:

  - You are about to drop the column `isActive` on the `Sector` table. All the data in the column will be lost.
  - You are about to drop the column `organisationId` on the `Sector` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[code]` on the table `Sector` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Sector" DROP CONSTRAINT "Sector_organisationId_fkey";

-- DropIndex
DROP INDEX "Sector_isActive_idx";

-- DropIndex
DROP INDEX "Sector_organisationId_code_key";

-- DropIndex
DROP INDEX "Sector_organisationId_idx";

-- AlterTable
ALTER TABLE "Sector" DROP COLUMN "isActive",
DROP COLUMN "organisationId",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "IncidentCode" (
    "id" TEXT NOT NULL,
    "sectorId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "templateSourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncidentCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentSubcode" (
    "id" TEXT NOT NULL,
    "sectorId" TEXT,
    "incidentCodeId" TEXT NOT NULL,
    "subcode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "templateSourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncidentSubcode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceType" (
    "id" TEXT NOT NULL,
    "sectorId" TEXT,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Emergency',
    "controlRoomManaged" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "templateSourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfrastructureType" (
    "id" TEXT NOT NULL,
    "sectorId" TEXT,
    "type" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL DEFAULT 'Medium',
    "requiresLocation" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "templateSourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InfrastructureType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyContactType" (
    "id" TEXT NOT NULL,
    "sectorId" TEXT,
    "type" TEXT NOT NULL,
    "escalationLevel" TEXT NOT NULL DEFAULT 'Level 1',
    "sectorSpecific" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "templateSourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyContactType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IncidentCode_sectorId_idx" ON "IncidentCode"("sectorId");

-- CreateIndex
CREATE UNIQUE INDEX "IncidentCode_sectorId_code_key" ON "IncidentCode"("sectorId", "code");

-- CreateIndex
CREATE INDEX "IncidentSubcode_sectorId_idx" ON "IncidentSubcode"("sectorId");

-- CreateIndex
CREATE INDEX "IncidentSubcode_incidentCodeId_idx" ON "IncidentSubcode"("incidentCodeId");

-- CreateIndex
CREATE UNIQUE INDEX "IncidentSubcode_incidentCodeId_subcode_key" ON "IncidentSubcode"("incidentCodeId", "subcode");

-- CreateIndex
CREATE INDEX "ServiceType_sectorId_idx" ON "ServiceType"("sectorId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceType_sectorId_type_key" ON "ServiceType"("sectorId", "type");

-- CreateIndex
CREATE INDEX "InfrastructureType_sectorId_idx" ON "InfrastructureType"("sectorId");

-- CreateIndex
CREATE UNIQUE INDEX "InfrastructureType_sectorId_type_key" ON "InfrastructureType"("sectorId", "type");

-- CreateIndex
CREATE INDEX "EmergencyContactType_sectorId_idx" ON "EmergencyContactType"("sectorId");

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyContactType_sectorId_type_key" ON "EmergencyContactType"("sectorId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Sector_code_key" ON "Sector"("code");

-- AddForeignKey
ALTER TABLE "IncidentCode" ADD CONSTRAINT "IncidentCode_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentSubcode" ADD CONSTRAINT "IncidentSubcode_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentSubcode" ADD CONSTRAINT "IncidentSubcode_incidentCodeId_fkey" FOREIGN KEY ("incidentCodeId") REFERENCES "IncidentCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceType" ADD CONSTRAINT "ServiceType_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfrastructureType" ADD CONSTRAINT "InfrastructureType_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyContactType" ADD CONSTRAINT "EmergencyContactType_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;
