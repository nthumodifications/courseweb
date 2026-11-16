CREATE TYPE "CourseShortNameIdentityType" AS ENUM ('MODULE', 'COURSE_CODE');
CREATE TYPE "CourseShortNameLanguage" AS ENUM ('ZH', 'EN');

CREATE TABLE "course_short_names" (
    "id" TEXT NOT NULL,
    "identityType" "CourseShortNameIdentityType" NOT NULL,
    "identityKey" TEXT NOT NULL,
    "language" "CourseShortNameLanguage" NOT NULL,
    "shortName" TEXT NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "course_short_names_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "course_short_name_revisions" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "editorId" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "action" TEXT NOT NULL DEFAULT 'EDIT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "course_short_name_revisions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "course_short_names_identityType_identityKey_language_key"
ON "course_short_names"("identityType", "identityKey", "language");
CREATE INDEX "course_short_names_updatedById_idx" ON "course_short_names"("updatedById");
CREATE INDEX "course_short_name_revisions_entryId_createdAt_idx"
ON "course_short_name_revisions"("entryId", "createdAt");
CREATE INDEX "course_short_name_revisions_editorId_createdAt_idx"
ON "course_short_name_revisions"("editorId", "createdAt");

ALTER TABLE "course_short_names" ADD CONSTRAINT "course_short_names_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "course_short_name_revisions" ADD CONSTRAINT "course_short_name_revisions_entryId_fkey"
FOREIGN KEY ("entryId") REFERENCES "course_short_names"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "course_short_name_revisions" ADD CONSTRAINT "course_short_name_revisions_editorId_fkey"
FOREIGN KEY ("editorId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
