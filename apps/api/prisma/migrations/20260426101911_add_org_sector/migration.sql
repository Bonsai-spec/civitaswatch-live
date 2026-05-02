-- CreateTable
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sector" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organisationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSectorAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT true,
    "canCreate" BOOLEAN NOT NULL DEFAULT false,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "canClose" BOOLEAN NOT NULL DEFAULT false,
    "canExport" BOOLEAN NOT NULL DEFAULT false,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSectorAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organisation_code_key" ON "Organisation"("code");

-- CreateIndex
CREATE INDEX "Sector_organisationId_idx" ON "Sector"("organisationId");

-- CreateIndex
CREATE INDEX "Sector_isActive_idx" ON "Sector"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Sector_organisationId_code_key" ON "Sector"("organisationId", "code");

-- CreateIndex
CREATE INDEX "UserSectorAccess_userId_idx" ON "UserSectorAccess"("userId");

-- CreateIndex
CREATE INDEX "UserSectorAccess_sectorId_idx" ON "UserSectorAccess"("sectorId");

-- CreateIndex
CREATE INDEX "UserSectorAccess_role_idx" ON "UserSectorAccess"("role");

-- CreateIndex
CREATE UNIQUE INDEX "UserSectorAccess_userId_sectorId_key" ON "UserSectorAccess"("userId", "sectorId");

-- CreateIndex
CREATE INDEX "Incident_linkedPatrolId_idx" ON "Incident"("linkedPatrolId");

-- CreateIndex
CREATE INDEX "Incident_createdByUserId_idx" ON "Incident"("createdByUserId");

-- CreateIndex
CREATE INDEX "PatrolSession_sector_idx" ON "PatrolSession"("sector");

-- AddForeignKey
ALTER TABLE "Sector" ADD CONSTRAINT "Sector_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSectorAccess" ADD CONSTRAINT "UserSectorAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSectorAccess" ADD CONSTRAINT "UserSectorAccess_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE CASCADE ON UPDATE CASCADE;
