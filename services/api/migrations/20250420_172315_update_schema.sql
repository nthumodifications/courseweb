-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Semester" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "startDate" TEXT,
    "endDate" TEXT,
    "isActive" BOOLEAN NOT NULL,
    "order" INTEGER,
    "serverTimestamp" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Semester" ("deleted", "endDate", "id", "isActive", "name", "order", "serverTimestamp", "startDate", "status", "term", "userId", "year") SELECT "deleted", "endDate", "id", "isActive", "name", "order", "serverTimestamp", "startDate", "status", "term", "userId", "year" FROM "Semester";
DROP TABLE "Semester";
ALTER TABLE "new_Semester" RENAME TO "Semester";
CREATE INDEX "Semester_userId_idx" ON "Semester"("userId");
CREATE UNIQUE INDEX "Semester_userId_id_key" ON "Semester"("userId", "id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
