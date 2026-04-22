-- CreateTable
CREATE TABLE "PrePatrolChecklist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "patrolDate" TIMESTAMP(3) NOT NULL,
    "vehicleInspected" BOOLEAN NOT NULL DEFAULT false,
    "safetyCheckCompleted" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrePatrolChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrePatrolChecklist_userId_patrolDate_idx" ON "PrePatrolChecklist"("userId", "patrolDate");

-- AddForeignKey
ALTER TABLE "PrePatrolChecklist" ADD CONSTRAINT "PrePatrolChecklist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
