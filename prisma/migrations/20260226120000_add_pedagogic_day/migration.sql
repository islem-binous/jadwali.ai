-- Add pedagogicDay column to Subject table
ALTER TABLE "Subject" ADD COLUMN "pedagogicDay" INTEGER NOT NULL DEFAULT 0;

-- Add pedagogicDay column to TunisianSubject table
ALTER TABLE "TunisianSubject" ADD COLUMN "pedagogicDay" INTEGER NOT NULL DEFAULT 0;

-- Seed pedagogicDay values for TunisianSubject reference data
-- 0 = no restriction, 1 = Monday blocked, 2 = Tuesday, 3 = Wednesday,
-- 4 = Thursday, 5 = Friday, 6 = Saturday
UPDATE "TunisianSubject" SET "pedagogicDay" = 1 WHERE "code" = 'التا و الجغ';
UPDATE "TunisianSubject" SET "pedagogicDay" = 1 WHERE "code" = 'ت.مسرحية';
UPDATE "TunisianSubject" SET "pedagogicDay" = 2 WHERE "code" = 'ت.إسلامية';
UPDATE "TunisianSubject" SET "pedagogicDay" = 2 WHERE "code" = 'ت.موسيقية';
UPDATE "TunisianSubject" SET "pedagogicDay" = 2 WHERE "code" = 'ع.فيزيائية';
UPDATE "TunisianSubject" SET "pedagogicDay" = 3 WHERE "code" = 'ت.تكنولوجية';
UPDATE "TunisianSubject" SET "pedagogicDay" = 3 WHERE "code" = 'رياضيات';
UPDATE "TunisianSubject" SET "pedagogicDay" = 4 WHERE "code" = 'ت.تشكيلية';
UPDATE "TunisianSubject" SET "pedagogicDay" = 4 WHERE "code" = 'عربية';
UPDATE "TunisianSubject" SET "pedagogicDay" = 5 WHERE "code" = 'ت.مدنية';
UPDATE "TunisianSubject" SET "pedagogicDay" = 5 WHERE "code" = 'فرنسية';
UPDATE "TunisianSubject" SET "pedagogicDay" = 6 WHERE "code" = 'إعلامية';
UPDATE "TunisianSubject" SET "pedagogicDay" = 6 WHERE "code" = 'انقليزية';
UPDATE "TunisianSubject" SET "pedagogicDay" = 6 WHERE "code" = 'ت.بدنية';
UPDATE "TunisianSubject" SET "pedagogicDay" = 6 WHERE "code" = 'ع.الح.و.الأرض';
