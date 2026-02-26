-- CreateTable: TunisianTeacherGrade
CREATE TABLE IF NOT EXISTS "TunisianTeacherGrade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" INTEGER NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameFr" TEXT,
    "nameEn" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TunisianTeacherGrade_code_key" ON "TunisianTeacherGrade"("code");

-- Add new columns to Teacher
ALTER TABLE "Teacher" ADD COLUMN "matricule" TEXT;
ALTER TABLE "Teacher" ADD COLUMN "cin" TEXT;
ALTER TABLE "Teacher" ADD COLUMN "recruitmentDate" DATETIME;
ALTER TABLE "Teacher" ADD COLUMN "sex" TEXT;
ALTER TABLE "Teacher" ADD COLUMN "professionalGradeId" TEXT REFERENCES "TunisianTeacherGrade"("id");

-- Seed TunisianTeacherGrade data
INSERT OR IGNORE INTO "TunisianTeacherGrade" ("id", "code", "nameAr", "nameFr", "nameEn") VALUES ('NeTFv5SVIfZ0zR1d', 1, 'استاذ أول للتعليم الثانوي', 'Professeur principal de l''enseignement secondaire', 'Senior Secondary Teacher');
INSERT OR IGNORE INTO "TunisianTeacherGrade" ("id", "code", "nameAr", "nameFr", "nameEn") VALUES ('6sDWJZnjvtpA2L4e', 2, 'استاذ تعليم ثانوي', 'Professeur de l''enseignement secondaire', 'Secondary Teacher');
INSERT OR IGNORE INTO "TunisianTeacherGrade" ("id", "code", "nameAr", "nameFr", "nameEn") VALUES ('om-bBnWNc_J0-uKr', 6, 'أستاذ أول مميز', 'Professeur principal distingué', 'Distinguished Senior Teacher');
INSERT OR IGNORE INTO "TunisianTeacherGrade" ("id", "code", "nameAr", "nameFr", "nameEn") VALUES ('-cfT2XZJEVKnji__', 7, 'أستاذ أول درجة إستثنائية', 'Professeur principal hors classe', 'Exceptional Grade Senior Teacher');
INSERT OR IGNORE INTO "TunisianTeacherGrade" ("id", "code", "nameAr", "nameFr", "nameEn") VALUES ('t_ionkgdSkTGNG-L', 8, 'أستاذ أول فوق الرتبة', 'Professeur principal hors grade', 'Above-Rank Senior Teacher');
INSERT OR IGNORE INTO "TunisianTeacherGrade" ("id", "code", "nameAr", "nameFr", "nameEn") VALUES ('481UlCoIcOzkvjiP', 9, 'أستاذ أول', 'Professeur principal', 'Senior Teacher');
INSERT OR IGNORE INTO "TunisianTeacherGrade" ("id", "code", "nameAr", "nameFr", "nameEn") VALUES ('3yLdip3LMwzqL_wo', 10, 'عون وقتي أ 2', 'Agent temporaire A2', 'Temporary Agent A2');
INSERT OR IGNORE INTO "TunisianTeacherGrade" ("id", "code", "nameAr", "nameFr", "nameEn") VALUES ('lzE9IhRPdSQVVP71', 12, 'نائبة', 'Suppléante', 'Female Substitute');
INSERT OR IGNORE INTO "TunisianTeacherGrade" ("id", "code", "nameAr", "nameFr", "nameEn") VALUES ('JQgDYb_WMNqRVOfk', 13, 'نائب', 'Suppléant', 'Male Substitute');
