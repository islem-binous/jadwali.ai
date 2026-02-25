/*
  Warnings:

  - You are about to drop the column `grade` on the `Class` table. All the data in the column will be lost.
  - You are about to drop the column `stripeCustomerId` on the `School` table. All the data in the column will be lost.
  - You are about to drop the column `stripeSubscriptionId` on the `School` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Absence" ADD COLUMN "endDate" DATETIME;

-- CreateTable
CREATE TABLE "LeaveType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "nameFr" TEXT,
    "maxDaysPerYear" INTEGER NOT NULL DEFAULT 12,
    "colorHex" TEXT NOT NULL DEFAULT '#F59E0B',
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeaveType_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "leaveTypeId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "daysCount" INTEGER NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeaveRequest_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LeaveRequest_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LeaveRequest_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Grade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "nameFr" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "Grade_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GradeCurriculum" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gradeId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "hoursPerWeek" INTEGER NOT NULL DEFAULT 2,
    CONSTRAINT "GradeCurriculum_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GradeCurriculum_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeacherGrade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teacherId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    CONSTRAINT "TeacherGrade_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TeacherGrade_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Governorate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "TunisianSchool" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "governorateCode" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    CONSTRAINT "TunisianSchool_governorateCode_fkey" FOREIGN KEY ("governorateCode") REFERENCES "Governorate" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "billingCycle" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TND',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" DATETIME,
    "periodStart" DATETIME,
    "periodEnd" DATETIME,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Class" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gradeId" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 30,
    "colorHex" TEXT NOT NULL DEFAULT '#4f6ef7',
    CONSTRAINT "Class_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Class_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Class" ("capacity", "colorHex", "id", "name", "schoolId") SELECT "capacity", "colorHex", "id", "name", "schoolId" FROM "Class";
DROP TABLE "Class";
ALTER TABLE "new_Class" RENAME TO "Class";
CREATE TABLE "new_Period" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isBreak" BOOLEAN NOT NULL DEFAULT false,
    "breakLabel" TEXT,
    "applicableDays" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "Period_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Period" ("breakLabel", "endTime", "id", "isBreak", "name", "order", "schoolId", "startTime") SELECT "breakLabel", "endTime", "id", "isBreak", "name", "order", "schoolId", "startTime" FROM "Period";
DROP TABLE "Period";
ALTER TABLE "new_Period" RENAME TO "Period";
CREATE TABLE "new_School" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "country" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "language" TEXT NOT NULL DEFAULT 'FR',
    "schoolDays" TEXT NOT NULL DEFAULT '[0,1,2,3,4,5]',
    "logoUrl" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "paymentProvider" TEXT,
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'INACTIVE',
    "subscriptionEndsAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "tunisianSchoolId" TEXT,
    CONSTRAINT "School_tunisianSchoolId_fkey" FOREIGN KEY ("tunisianSchoolId") REFERENCES "TunisianSchool" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_School" ("country", "createdAt", "id", "language", "logoUrl", "name", "plan", "slug", "subscriptionEndsAt", "subscriptionStatus", "timezone", "updatedAt") SELECT "country", "createdAt", "id", "language", "logoUrl", "name", "plan", "slug", "subscriptionEndsAt", "subscriptionStatus", "timezone", "updatedAt" FROM "School";
DROP TABLE "School";
ALTER TABLE "new_School" RENAME TO "School";
CREATE UNIQUE INDEX "School_slug_key" ON "School"("slug");
CREATE TABLE "new_SchoolEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleAr" TEXT,
    "titleFr" TEXT,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'OTHER',
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "colorHex" TEXT NOT NULL DEFAULT '#4f6ef7',
    "affectsClasses" TEXT NOT NULL DEFAULT '[]',
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SchoolEvent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SchoolEvent" ("affectsClasses", "colorHex", "createdAt", "description", "endDate", "id", "schoolId", "startDate", "title", "titleAr", "titleFr", "type") SELECT "affectsClasses", "colorHex", "createdAt", "description", "endDate", "id", "schoolId", "startDate", "title", "titleAr", "titleFr", "type" FROM "SchoolEvent";
DROP TABLE "SchoolEvent";
ALTER TABLE "new_SchoolEvent" RENAME TO "SchoolEvent";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "authId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "language" TEXT NOT NULL DEFAULT 'FR',
    "avatarUrl" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "schoolId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "teacherId" TEXT,
    "studentId" TEXT,
    CONSTRAINT "User_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "User_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("authId", "avatarUrl", "createdAt", "email", "id", "language", "name", "role", "schoolId") SELECT "authId", "avatarUrl", "createdAt", "email", "id", "language", "name", "role", "schoolId" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_authId_key" ON "User"("authId");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_teacherId_key" ON "User"("teacherId");
CREATE UNIQUE INDEX "User_studentId_key" ON "User"("studentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "GradeCurriculum_gradeId_subjectId_key" ON "GradeCurriculum"("gradeId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherGrade_teacherId_gradeId_key" ON "TeacherGrade"("teacherId", "gradeId");

-- CreateIndex
CREATE UNIQUE INDEX "Governorate_code_key" ON "Governorate"("code");

-- CreateIndex
CREATE UNIQUE INDEX "TunisianSchool_code_key" ON "TunisianSchool"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_orderId_key" ON "Payment"("orderId");
