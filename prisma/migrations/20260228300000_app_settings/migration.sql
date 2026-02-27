-- CreateTable: AppSettings (single-row platform configuration)
CREATE TABLE IF NOT EXISTS "AppSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "platformName" TEXT NOT NULL DEFAULT 'SchediQ',
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "registrationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "googleOAuthEnabled" BOOLEAN NOT NULL DEFAULT true,
    "defaultLanguage" TEXT NOT NULL DEFAULT 'FR',
    "passwordMinLength" INTEGER NOT NULL DEFAULT 8,
    "sessionDurationHours" INTEGER NOT NULL DEFAULT 168,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "trialPeriodDays" INTEGER NOT NULL DEFAULT 14,
    "maxSchools" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed default row
INSERT OR IGNORE INTO "AppSettings" ("id", "updatedAt") VALUES ('default', CURRENT_TIMESTAMP);
