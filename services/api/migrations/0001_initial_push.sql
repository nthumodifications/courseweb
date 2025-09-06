-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "parent" TEXT,
    "min" INTEGER NOT NULL,
    "max" INTEGER NOT NULL,
    "metric" TEXT NOT NULL,
    "requireChildValidation" BOOLEAN NOT NULL,
    "titlePlacement" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "color" TEXT,
    "expanded" BOOLEAN,
    "serverTimestamp" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "Item" (
    "uuid" TEXT NOT NULL PRIMARY KEY,
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "parent" TEXT,
    "credits" REAL NOT NULL,
    "raw_id" TEXT,
    "semester" TEXT,
    "status" TEXT,
    "description" TEXT,
    "comments" TEXT,
    "instructor" TEXT,
    "dependson" TEXT,
    "order" INTEGER NOT NULL,
    "serverTimestamp" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "PlannerData" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "requiredCredits" REAL NOT NULL,
    "enrollmentYear" TEXT NOT NULL,
    "graduationYear" TEXT NOT NULL,
    "includedSemesters" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "serverTimestamp" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "Semester" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "isActive" BOOLEAN NOT NULL,
    "order" INTEGER,
    "serverTimestamp" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false
);

-- CreateIndex
CREATE INDEX "Folder_userId_idx" ON "Folder"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Folder_userId_id_key" ON "Folder"("userId", "id");

-- CreateIndex
CREATE INDEX "Item_userId_idx" ON "Item"("userId");

-- CreateIndex
CREATE INDEX "PlannerData_userId_idx" ON "PlannerData"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlannerData_userId_id_key" ON "PlannerData"("userId", "id");

-- CreateIndex
CREATE INDEX "Semester_userId_idx" ON "Semester"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Semester_userId_id_key" ON "Semester"("userId", "id");
