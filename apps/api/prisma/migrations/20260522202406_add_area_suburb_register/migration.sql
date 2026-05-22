-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "areaId" TEXT;

-- AlterTable
ALTER TABLE "PatrolEvent" ADD COLUMN     "areaId" TEXT;

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL,
    "officialName" TEXT NOT NULL,
    "sectorId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'SUBURB',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "sortOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AreaAlias" (
    "id" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "normalizedAlias" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AreaAlias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Area_sectorId_idx" ON "Area"("sectorId");

-- CreateIndex
CREATE INDEX "Area_active_idx" ON "Area"("active");

-- CreateIndex
CREATE INDEX "Area_type_idx" ON "Area"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Area_sectorId_officialName_key" ON "Area"("sectorId", "officialName");

-- CreateIndex
CREATE INDEX "AreaAlias_normalizedAlias_idx" ON "AreaAlias"("normalizedAlias");

-- CreateIndex
CREATE INDEX "AreaAlias_active_idx" ON "AreaAlias"("active");

-- CreateIndex
CREATE UNIQUE INDEX "AreaAlias_areaId_normalizedAlias_key" ON "AreaAlias"("areaId", "normalizedAlias");

-- CreateIndex
CREATE INDEX "Incident_areaId_idx" ON "Incident"("areaId");

-- CreateIndex
CREATE INDEX "PatrolEvent_areaId_idx" ON "PatrolEvent"("areaId");

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatrolEvent" ADD CONSTRAINT "PatrolEvent_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AreaAlias" ADD CONSTRAINT "AreaAlias_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE CASCADE ON UPDATE CASCADE;
