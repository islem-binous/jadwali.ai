-- CreateTable
CREATE TABLE "TunisianSessionType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" INTEGER NOT NULL,
    "nameAr" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "TunisianSubject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "sessionTypeCode" INTEGER NOT NULL,
    CONSTRAINT "TunisianSubject_sessionTypeCode_fkey" FOREIGN KEY ("sessionTypeCode") REFERENCES "TunisianSessionType" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TunisianGradeLevel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "TunisianSessionType_code_key" ON "TunisianSessionType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "TunisianSubject_code_key" ON "TunisianSubject"("code");

-- CreateIndex
CREATE UNIQUE INDEX "TunisianGradeLevel_code_key" ON "TunisianGradeLevel"("code");
