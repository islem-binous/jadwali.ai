-- SQLite doesn't support ALTER COLUMN directly.
-- We need to recreate the table to make classId nullable.
-- However, D1 supports a simpler workaround: SQLite columns added with
-- ALTER TABLE are already nullable by default, and existing NOT NULL columns
-- can't be changed. But since D1 uses SQLite under the hood, we can use
-- a pragma-based approach or simply accept that the column constraint
-- is at application level.
--
-- Actually, SQLite doesn't enforce NOT NULL on ALTER, and the column was
-- created as NOT NULL originally. We need to recreate the table.

PRAGMA foreign_keys=OFF;

CREATE TABLE "Student_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "matricule" TEXT,
    "sex" TEXT,
    "birthDate" DATETIME,
    "classId" TEXT,
    "electives" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Student_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "Student_new" SELECT * FROM "Student";

DROP TABLE "Student";

ALTER TABLE "Student_new" RENAME TO "Student";

PRAGMA foreign_keys=ON;
