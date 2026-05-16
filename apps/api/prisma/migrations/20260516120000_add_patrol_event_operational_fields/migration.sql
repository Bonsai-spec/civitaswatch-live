-- AlterTable
ALTER TABLE "public"."PatrolEvent" ADD COLUMN     "referenceNumber" TEXT,
ADD COLUMN     "streetNumber" TEXT,
ADD COLUMN     "streetName" TEXT,
ADD COLUMN     "suburb" TEXT,
ADD COLUMN     "locationNotes" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "serviceTypeId" TEXT,
ADD COLUMN     "infrastructureTypeId" TEXT,
ADD COLUMN     "createdByUserId" TEXT;

-- CreateIndex
CREATE INDEX "PatrolEvent_serviceTypeId_idx" ON "public"."PatrolEvent"("serviceTypeId" ASC);

-- CreateIndex
CREATE INDEX "PatrolEvent_infrastructureTypeId_idx" ON "public"."PatrolEvent"("infrastructureTypeId" ASC);

-- CreateIndex
CREATE INDEX "PatrolEvent_createdByUserId_idx" ON "public"."PatrolEvent"("createdByUserId" ASC);

-- CreateIndex
CREATE INDEX "PatrolEvent_suburb_idx" ON "public"."PatrolEvent"("suburb" ASC);

-- AddForeignKey
ALTER TABLE "public"."PatrolEvent" ADD CONSTRAINT "PatrolEvent_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "public"."ServiceType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PatrolEvent" ADD CONSTRAINT "PatrolEvent_infrastructureTypeId_fkey" FOREIGN KEY ("infrastructureTypeId") REFERENCES "public"."InfrastructureType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PatrolEvent" ADD CONSTRAINT "PatrolEvent_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
