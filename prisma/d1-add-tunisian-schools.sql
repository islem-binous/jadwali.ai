-- Create Governorate table
CREATE TABLE IF NOT EXISTS "Governorate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL
);

-- Create TunisianSchool table
CREATE TABLE IF NOT EXISTS "TunisianSchool" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "governorateCode" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    CONSTRAINT "TunisianSchool_governorateCode_fkey" FOREIGN KEY ("governorateCode") REFERENCES "Governorate" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS "Governorate_code_key" ON "Governorate"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "TunisianSchool_code_key" ON "TunisianSchool"("code");

-- Add tunisianSchoolId to School if not exists (safe: SQLite ignores if column exists)
-- Note: We use a separate approach since ALTER TABLE ADD COLUMN IF NOT EXISTS is not supported in SQLite
