-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PlannerData" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "requiredCredits" REAL NOT NULL,
    "enrollmentYear" TEXT NOT NULL,
    "graduationYear" TEXT NOT NULL,
    "includedSemesters" TEXT NOT NULL,
    "description" TEXT,
    "serverTimestamp" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_PlannerData" ("deleted", "department", "description", "enrollmentYear", "graduationYear", "id", "includedSemesters", "requiredCredits", "serverTimestamp", "title", "userId") SELECT "deleted", "department", "description", "enrollmentYear", "graduationYear", "id", "includedSemesters", "requiredCredits", "serverTimestamp", "title", "userId" FROM "PlannerData";
DROP TABLE "PlannerData";
ALTER TABLE "new_PlannerData" RENAME TO "PlannerData";
CREATE INDEX "PlannerData_userId_idx" ON "PlannerData"("userId");
CREATE UNIQUE INDEX "PlannerData_userId_id_key" ON "PlannerData"("userId", "id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
