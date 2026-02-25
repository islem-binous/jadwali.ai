-- Add French and English name columns to all reference tables
ALTER TABLE "Governorate" ADD COLUMN "nameFr" TEXT;
ALTER TABLE "Governorate" ADD COLUMN "nameEn" TEXT;
ALTER TABLE "TunisianSchool" ADD COLUMN "nameFr" TEXT;
ALTER TABLE "TunisianSchool" ADD COLUMN "nameEn" TEXT;
ALTER TABLE "TunisianSessionType" ADD COLUMN "nameFr" TEXT;
ALTER TABLE "TunisianSessionType" ADD COLUMN "nameEn" TEXT;
ALTER TABLE "TunisianSubject" ADD COLUMN "nameFr" TEXT;
ALTER TABLE "TunisianSubject" ADD COLUMN "nameEn" TEXT;
ALTER TABLE "TunisianGradeLevel" ADD COLUMN "nameFr" TEXT;
ALTER TABLE "TunisianGradeLevel" ADD COLUMN "nameEn" TEXT;
