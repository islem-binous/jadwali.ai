-- Add Staff model
CREATE TABLE IF NOT EXISTS "Staff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "cin" TEXT,
    "matricule" TEXT,
    "staffTitle" TEXT,
    "avatarUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Staff_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Add staffId to User
ALTER TABLE "User" ADD COLUMN "staffId" TEXT;

-- Create unique index for staffId on User
CREATE UNIQUE INDEX IF NOT EXISTS "User_staffId_key" ON "User"("staffId");

-- Add Student fields (phone, matricule, sex, birthDate, createdAt)
-- phone
ALTER TABLE "Student" ADD COLUMN "phone" TEXT;
-- matricule
ALTER TABLE "Student" ADD COLUMN "matricule" TEXT;
-- sex
ALTER TABLE "Student" ADD COLUMN "sex" TEXT;
-- birthDate
ALTER TABLE "Student" ADD COLUMN "birthDate" DATETIME;
-- createdAt
ALTER TABLE "Student" ADD COLUMN "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add coefficient to GradeCurriculum
ALTER TABLE "GradeCurriculum" ADD COLUMN "coefficient" REAL NOT NULL DEFAULT 1;

-- Add StudentAbsence model
CREATE TABLE IF NOT EXISTS "StudentAbsence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "periodIds" TEXT NOT NULL DEFAULT '[]',
    "type" TEXT NOT NULL DEFAULT 'UNJUSTIFIED',
    "reason" TEXT,
    "reportedBy" TEXT,
    "justifiedBy" TEXT,
    "justifiedAt" DATETIME,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentAbsence_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Add Exam model
CREATE TABLE IF NOT EXISTS "Exam" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" DATETIME,
    "coefficient" REAL NOT NULL DEFAULT 1,
    "maxScore" REAL NOT NULL DEFAULT 20,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Exam_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Exam_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Exam_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Exam_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Unique constraint on Exam
CREATE UNIQUE INDEX IF NOT EXISTS "Exam_termId_subjectId_classId_type_key" ON "Exam"("termId", "subjectId", "classId", "type");

-- Add ExamMark model
CREATE TABLE IF NOT EXISTS "ExamMark" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "score" REAL,
    "absent" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "enteredBy" TEXT,
    "enteredAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExamMark_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExamMark_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Unique constraint on ExamMark
CREATE UNIQUE INDEX IF NOT EXISTS "ExamMark_examId_studentId_key" ON "ExamMark"("examId", "studentId");

-- Add StudentNote model
CREATE TABLE IF NOT EXISTS "StudentNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'OBSERVATION',
    "content" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentNote_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Add ClassAuthorization model
CREATE TABLE IF NOT EXISTS "ClassAuthorization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "absenceDate" DATETIME NOT NULL,
    "absenceEndDate" DATETIME,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "rejectionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClassAuthorization_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
