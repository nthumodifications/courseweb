-- CreateTable
CREATE TABLE "SharedTimetable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "displayName" TEXT,
    "semesters" TEXT NOT NULL,
    "courses" TEXT NOT NULL,
    "courseNotes" TEXT NOT NULL DEFAULT '{}',
    "visibility" TEXT NOT NULL DEFAULT 'link_only',
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "gradeContext" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "SavedTimetable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "viewerId" TEXT NOT NULL,
    "sharedTimetableId" TEXT NOT NULL,
    "label" TEXT,
    "syncMode" TEXT NOT NULL DEFAULT 'live',
    "savedCourses" TEXT,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TimetableGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "members" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "SharedTimetable_ownerId_idx" ON "SharedTimetable"("ownerId");

-- CreateIndex
CREATE INDEX "SharedTimetable_visibility_idx" ON "SharedTimetable"("visibility");

-- CreateIndex
CREATE INDEX "SavedTimetable_viewerId_idx" ON "SavedTimetable"("viewerId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedTimetable_viewerId_sharedTimetableId_key" ON "SavedTimetable"("viewerId", "sharedTimetableId");

-- CreateIndex
CREATE UNIQUE INDEX "TimetableGroup_inviteCode_key" ON "TimetableGroup"("inviteCode");

-- CreateIndex
CREATE INDEX "TimetableGroup_inviteCode_idx" ON "TimetableGroup"("inviteCode");

-- CreateIndex
CREATE INDEX "TimetableGroup_createdBy_idx" ON "TimetableGroup"("createdBy");
