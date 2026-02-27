-- Make User.schoolId nullable for SUPER_ADMIN (platform-wide admin with no school)
-- SQLite cannot ALTER COLUMN to nullable, so we recreate the table.

PRAGMA foreign_keys=OFF;

-- Step 1: Create new table with nullable schoolId
CREATE TABLE "User_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "authId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "language" TEXT NOT NULL DEFAULT 'FR',
    "avatarUrl" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT 1,
    "schoolId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "teacherId" TEXT,
    "studentId" TEXT,
    "staffId" TEXT,
    CONSTRAINT "User_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Step 2: Copy all existing data
INSERT INTO "User_new" SELECT * FROM "User";

-- Step 3: Drop old table
DROP TABLE "User";

-- Step 4: Rename new table
ALTER TABLE "User_new" RENAME TO "User";

-- Step 5: Recreate unique indexes
CREATE UNIQUE INDEX "User_authId_key" ON "User"("authId");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_teacherId_key" ON "User"("teacherId");
CREATE UNIQUE INDEX "User_studentId_key" ON "User"("studentId");
CREATE UNIQUE INDEX "User_staffId_key" ON "User"("staffId");

PRAGMA foreign_keys=ON;
