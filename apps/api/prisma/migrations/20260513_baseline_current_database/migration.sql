-- DropForeignKey
ALTER TABLE "public"."Incident" DROP CONSTRAINT "Incident_createdByUserId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PatrolSession" DROP CONSTRAINT "PatrolSession_vehicleId_fkey";

-- DropIndex
DROP INDEX "public"."Incident_incidentCode_idx";

-- DropIndex
DROP INDEX "public"."UserSectorAccess_role_idx";

-- AlterTable
ALTER TABLE "public"."Incident" ADD COLUMN     "incidentType" TEXT,
ADD COLUMN     "street" TEXT,
ADD COLUMN     "suburb" TEXT,
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "severity" DROP DEFAULT,
ALTER COLUMN "source" DROP DEFAULT,
ALTER COLUMN "reportedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."PatrolSession" ADD COLUMN     "editCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "editedAt" TIMESTAMP(3),
ADD COLUMN     "editedBy" TEXT,
ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tempVehicleCallSign" TEXT,
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
CREATE TABLE "public"."IncidentServiceLog" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "refNumber" TEXT,
    "requestedAt" TIMESTAMP(3),
    "arrivedAt" TIMESTAMP(3),
    "clearedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncidentServiceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IncidentVOILink" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "intelligenceEntityId" TEXT NOT NULL,
    "roleInIncident" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentVOILink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IntelligenceEntity" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "sector" TEXT,
    "suburb" TEXT,

    CONSTRAINT "IntelligenceEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IntelligenceLink" (
    "id" TEXT NOT NULL,
    "fromEntityId" TEXT NOT NULL,
    "toEntityId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "strength" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntelligenceLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Member" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "firstName" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "idNumber" TEXT,
    "cellNumber" TEXT,
    "email" TEXT,
    "address" TEXT,
    "suburb" TEXT,
    "sector" TEXT,
    "callSign" TEXT,
    "vettingStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "nextOfKinName" TEXT,
    "nextOfKinPhone" TEXT,
    "medicalNotes" TEXT,
    "allergies" TEXT,
    "medication" TEXT,
    "bloodType" TEXT,
    "driversLicence" BOOLEAN NOT NULL DEFAULT false,
    "licenceCode" TEXT,
    "pdp" BOOLEAN NOT NULL DEFAULT false,
    "firstAid" BOOLEAN NOT NULL DEFAULT false,
    "fireTraining" BOOLEAN NOT NULL DEFAULT false,
    "radioTraining" BOOLEAN NOT NULL DEFAULT false,
    "patrolTraining" BOOLEAN NOT NULL DEFAULT false,
    "controlRoomTraining" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "patrolApproved" BOOLEAN NOT NULL DEFAULT false,
    "patrolNotes" TEXT,
    "patrolStatus" TEXT NOT NULL DEFAULT 'NOT_PATROLLER',
    "userId" TEXT,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PatrolEventVOILink" (
    "id" TEXT NOT NULL,
    "patrolEventId" TEXT NOT NULL,
    "intelligenceEntityId" TEXT NOT NULL,
    "observationType" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatrolEventVOILink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PatrolReportAuditLog" (
    "id" TEXT NOT NULL,
    "patrolId" TEXT NOT NULL,
    "editedBy" TEXT NOT NULL,
    "editedByRole" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "editReason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatrolReportAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PatrolSessionCrew" (
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

-- CreateTable
CREATE TABLE "public"."Service" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "phone" TEXT,
    "radio" TEXT,
    "sector" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VOIVehicleDetails" (
    "id" TEXT NOT NULL,
    "intelligenceEntityId" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "colour" TEXT,
    "vehicleType" TEXT,
    "distinguishingMarks" TEXT,
    "notes" TEXT,

    CONSTRAINT "VOIVehicleDetails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IncidentServiceLog_incidentId_idx" ON "public"."IncidentServiceLog"("incidentId" ASC);

-- CreateIndex
CREATE INDEX "IncidentServiceLog_serviceId_idx" ON "public"."IncidentServiceLog"("serviceId" ASC);

-- CreateIndex
CREATE INDEX "IncidentServiceLog_status_idx" ON "public"."IncidentServiceLog"("status" ASC);

-- CreateIndex
CREATE INDEX "IncidentVOILink_incidentId_idx" ON "public"."IncidentVOILink"("incidentId" ASC);

-- CreateIndex
CREATE INDEX "IncidentVOILink_intelligenceEntityId_idx" ON "public"."IncidentVOILink"("intelligenceEntityId" ASC);

-- CreateIndex
CREATE INDEX "IntelligenceEntity_entityType_idx" ON "public"."IntelligenceEntity"("entityType" ASC);

-- CreateIndex
CREATE INDEX "IntelligenceEntity_riskLevel_idx" ON "public"."IntelligenceEntity"("riskLevel" ASC);

-- CreateIndex
CREATE INDEX "IntelligenceEntity_sector_idx" ON "public"."IntelligenceEntity"("sector" ASC);

-- CreateIndex
CREATE INDEX "IntelligenceEntity_status_idx" ON "public"."IntelligenceEntity"("status" ASC);

-- CreateIndex
CREATE INDEX "IntelligenceLink_fromEntityId_idx" ON "public"."IntelligenceLink"("fromEntityId" ASC);

-- CreateIndex
CREATE INDEX "IntelligenceLink_toEntityId_idx" ON "public"."IntelligenceLink"("toEntityId" ASC);

-- CreateIndex
CREATE INDEX "Member_isActive_idx" ON "public"."Member"("isActive" ASC);

-- CreateIndex
CREATE INDEX "Member_patrolApproved_idx" ON "public"."Member"("patrolApproved" ASC);

-- CreateIndex
CREATE INDEX "Member_patrolStatus_idx" ON "public"."Member"("patrolStatus" ASC);

-- CreateIndex
CREATE INDEX "Member_sector_idx" ON "public"."Member"("sector" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Member_userId_key" ON "public"."Member"("userId" ASC);

-- CreateIndex
CREATE INDEX "PatrolEventVOILink_intelligenceEntityId_idx" ON "public"."PatrolEventVOILink"("intelligenceEntityId" ASC);

-- CreateIndex
CREATE INDEX "PatrolEventVOILink_patrolEventId_idx" ON "public"."PatrolEventVOILink"("patrolEventId" ASC);

-- CreateIndex
CREATE INDEX "PatrolSessionCrew_memberId_idx" ON "public"."PatrolSessionCrew"("memberId" ASC);

-- CreateIndex
CREATE INDEX "PatrolSessionCrew_patrolSessionId_idx" ON "public"."PatrolSessionCrew"("patrolSessionId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "PatrolSessionCrew_patrolSessionId_memberId_key" ON "public"."PatrolSessionCrew"("patrolSessionId" ASC, "memberId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "PatrolSessionCrew_patrolSessionId_userId_key" ON "public"."PatrolSessionCrew"("patrolSessionId" ASC, "userId" ASC);

-- CreateIndex
CREATE INDEX "PatrolSessionCrew_role_idx" ON "public"."PatrolSessionCrew"("role" ASC);

-- CreateIndex
CREATE INDEX "PatrolSessionCrew_userId_idx" ON "public"."PatrolSessionCrew"("userId" ASC);

-- CreateIndex
CREATE INDEX "Service_isActive_idx" ON "public"."Service"("isActive" ASC);

-- CreateIndex
CREATE INDEX "Service_sector_idx" ON "public"."Service"("sector" ASC);

-- CreateIndex
CREATE INDEX "Service_type_idx" ON "public"."Service"("type" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "VOIVehicleDetails_intelligenceEntityId_key" ON "public"."VOIVehicleDetails"("intelligenceEntityId" ASC);

-- CreateIndex
CREATE INDEX "VOIVehicleDetails_registrationNumber_idx" ON "public"."VOIVehicleDetails"("registrationNumber" ASC);

-- CreateIndex
CREATE INDEX "Incident_incidentType_idx" ON "public"."Incident"("incidentType" ASC);

-- CreateIndex
CREATE INDEX "Incident_severity_idx" ON "public"."Incident"("severity" ASC);

-- AddForeignKey
ALTER TABLE "public"."Incident" ADD CONSTRAINT "Incident_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IncidentServiceLog" ADD CONSTRAINT "IncidentServiceLog_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "public"."Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IncidentServiceLog" ADD CONSTRAINT "IncidentServiceLog_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IncidentVOILink" ADD CONSTRAINT "IncidentVOILink_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "public"."Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IncidentVOILink" ADD CONSTRAINT "IncidentVOILink_intelligenceEntityId_fkey" FOREIGN KEY ("intelligenceEntityId") REFERENCES "public"."IntelligenceEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IntelligenceLink" ADD CONSTRAINT "IntelligenceLink_fromEntityId_fkey" FOREIGN KEY ("fromEntityId") REFERENCES "public"."IntelligenceEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IntelligenceLink" ADD CONSTRAINT "IntelligenceLink_toEntityId_fkey" FOREIGN KEY ("toEntityId") REFERENCES "public"."IntelligenceEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Member" ADD CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PatrolEventVOILink" ADD CONSTRAINT "PatrolEventVOILink_intelligenceEntityId_fkey" FOREIGN KEY ("intelligenceEntityId") REFERENCES "public"."IntelligenceEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PatrolEventVOILink" ADD CONSTRAINT "PatrolEventVOILink_patrolEventId_fkey" FOREIGN KEY ("patrolEventId") REFERENCES "public"."PatrolEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PatrolSession" ADD CONSTRAINT "PatrolSession_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "public"."Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PatrolSessionCrew" ADD CONSTRAINT "PatrolSessionCrew_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PatrolSessionCrew" ADD CONSTRAINT "PatrolSessionCrew_patrolSessionId_fkey" FOREIGN KEY ("patrolSessionId") REFERENCES "public"."PatrolSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PatrolSessionCrew" ADD CONSTRAINT "PatrolSessionCrew_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VOIVehicleDetails" ADD CONSTRAINT "VOIVehicleDetails_intelligenceEntityId_fkey" FOREIGN KEY ("intelligenceEntityId") REFERENCES "public"."IntelligenceEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
