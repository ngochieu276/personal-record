-- CreateEnum
CREATE TYPE "KpiType" AS ENUM ('totalTime', 'totalRepeat');

-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('day', 'week', 'twoWeek', 'month');

-- CreateEnum
CREATE TYPE "SubjectEventStatus" AS ENUM ('finish', 'miss');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Bangkok',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kpiTarget" INTEGER NOT NULL,
    "kpiType" "KpiType" NOT NULL,
    "periodType" "PeriodType" NOT NULL,
    "startDate" DATE NOT NULL,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressLog" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgressLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubjectEvent" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "status" "SubjectEventStatus" NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "achieved" INTEGER NOT NULL,
    "kpiSnapshot" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubjectEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiChange" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "oldValue" INTEGER NOT NULL,
    "newValue" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KpiChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "Project"("userId");

-- CreateIndex
CREATE INDEX "Subject_projectId_idx" ON "Subject"("projectId");

-- CreateIndex
CREATE INDEX "ProgressLog_subjectId_loggedAt_idx" ON "ProgressLog"("subjectId", "loggedAt");

-- CreateIndex
CREATE INDEX "SubjectEvent_subjectId_periodStart_idx" ON "SubjectEvent"("subjectId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "SubjectEvent_subjectId_periodStart_key" ON "SubjectEvent"("subjectId", "periodStart");

-- CreateIndex
CREATE INDEX "KpiChange_subjectId_createdAt_idx" ON "KpiChange"("subjectId", "createdAt");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressLog" ADD CONSTRAINT "ProgressLog_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectEvent" ADD CONSTRAINT "SubjectEvent_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiChange" ADD CONSTRAINT "KpiChange_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
