-- CreateTable: TunisianCurriculumEntry (reference data for per-grade subject distribution)
CREATE TABLE "TunisianCurriculumEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gradeLevelCode" TEXT NOT NULL,
    "subjectCode" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "volumeHoraire" INTEGER NOT NULL,
    "parGroupe" BOOLEAN NOT NULL DEFAULT false,
    "parQuinzaine" BOOLEAN NOT NULL DEFAULT false,
    "codeTypeCours" INTEGER NOT NULL DEFAULT 1,
    "codeAss" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "TunisianCurriculumEntry_gradeLevelCode_fkey" FOREIGN KEY ("gradeLevelCode") REFERENCES "TunisianGradeLevel" ("code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TunisianCurriculumEntry_subjectCode_fkey" FOREIGN KEY ("subjectCode") REFERENCES "TunisianSubject" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TunisianCurriculumEntry_gradeLevelCode_subjectCode_sequence_key" ON "TunisianCurriculumEntry"("gradeLevelCode", "subjectCode", "sequence");

-- CreateTable: CurriculumSession (per-school session breakdown)
CREATE TABLE "CurriculumSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "curriculumId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 1,
    "sessionTypeCode" INTEGER NOT NULL DEFAULT 1,
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "isBiweekly" BOOLEAN NOT NULL DEFAULT false,
    "pairingCode" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CurriculumSession_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "GradeCurriculum" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumSession_curriculumId_sequence_key" ON "CurriculumSession"("curriculumId", "sequence");

-- Add new columns to Lesson
ALTER TABLE "Lesson" ADD COLUMN "sessionTypeCode" INTEGER;
ALTER TABLE "Lesson" ADD COLUMN "groupLabel" TEXT;
ALTER TABLE "Lesson" ADD COLUMN "blockId" TEXT;
ALTER TABLE "Lesson" ADD COLUMN "weekType" TEXT;
