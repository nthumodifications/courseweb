CREATE TABLE "CourseStatistic" (
    "rawId" TEXT NOT NULL PRIMARY KEY,
    "courseCode" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "enrollment" INTEGER NOT NULL,
    "scale" TEXT NOT NULL,
    "average" REAL NOT NULL,
    "stdDev" REAL NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "CourseStatistic_courseCode_idx"
    ON "CourseStatistic"("courseCode");

CREATE INDEX "CourseStatistic_semester_idx"
    ON "CourseStatistic"("semester");

CREATE TABLE "CourseStatisticSemester" (
    "semester" TEXT NOT NULL PRIMARY KEY,
    "contentHash" TEXT NOT NULL,
    "courseCount" INTEGER NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "CourseStatisticSemester_updatedAt_idx"
    ON "CourseStatisticSemester"("updatedAt");
