CREATE TYPE "ClassPageLinkStatus" AS ENUM ('VISIBLE', 'HIDDEN');
CREATE TYPE "ClassPageReportTargetType" AS ENUM ('MEMBER', 'LINK');
CREATE TYPE "ClassPageReportReason" AS ENUM ('SPAM', 'HARASSMENT', 'PERSONAL_INFO', 'OTHER');

CREATE TABLE "ClassPageProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "department" TEXT NOT NULL,
  "year" TEXT NOT NULL,
  "contacts" JSONB NOT NULL DEFAULT '[]',
  "displayNameVisible" BOOLEAN NOT NULL DEFAULT true,
  "departmentVisible" BOOLEAN NOT NULL DEFAULT true,
  "yearVisible" BOOLEAN NOT NULL DEFAULT true,
  "contactsVisible" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClassPageProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClassPageMembership" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "semester" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "selfDeclared" BOOLEAN NOT NULL DEFAULT true,
  "lookingForPartners" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClassPageMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClassPageLink" (
  "id" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "membershipId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "status" "ClassPageLinkStatus" NOT NULL DEFAULT 'VISIBLE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClassPageLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClassPageReport" (
  "id" TEXT NOT NULL,
  "reporterId" TEXT NOT NULL,
  "targetType" "ClassPageReportTargetType" NOT NULL,
  "membershipId" TEXT,
  "linkId" TEXT,
  "targetUserId" TEXT,
  "targetSemester" TEXT NOT NULL,
  "targetCourseId" TEXT NOT NULL,
  "reason" "ClassPageReportReason" NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "resolvedById" TEXT,
  CONSTRAINT "ClassPageReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClassPageBlock" (
  "id" TEXT NOT NULL,
  "blockerId" TEXT NOT NULL,
  "blockedId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClassPageBlock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClassPageProfile_userId_key" ON "ClassPageProfile"("userId");
CREATE UNIQUE INDEX "ClassPageMembership_userId_semester_courseId_key" ON "ClassPageMembership"("userId", "semester", "courseId");
CREATE INDEX "ClassPageMembership_profileId_idx" ON "ClassPageMembership"("profileId");
CREATE INDEX "ClassPageMembership_semester_courseId_idx" ON "ClassPageMembership"("semester", "courseId");
CREATE INDEX "ClassPageLink_membershipId_status_idx" ON "ClassPageLink"("membershipId", "status");
CREATE UNIQUE INDEX "ClassPageReport_reporterId_membershipId_key" ON "ClassPageReport"("reporterId", "membershipId");
CREATE UNIQUE INDEX "ClassPageReport_reporterId_linkId_key" ON "ClassPageReport"("reporterId", "linkId");
CREATE INDEX "ClassPageReport_resolvedAt_idx" ON "ClassPageReport"("resolvedAt");
CREATE INDEX "ClassPageReport_targetType_createdAt_idx" ON "ClassPageReport"("targetType", "createdAt");
CREATE INDEX "ClassPageReport_targetUserId_idx" ON "ClassPageReport"("targetUserId");
CREATE UNIQUE INDEX "ClassPageBlock_blockerId_blockedId_key" ON "ClassPageBlock"("blockerId", "blockedId");
CREATE INDEX "ClassPageBlock_blockedId_idx" ON "ClassPageBlock"("blockedId");

ALTER TABLE "ClassPageProfile" ADD CONSTRAINT "ClassPageProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassPageMembership" ADD CONSTRAINT "ClassPageMembership_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassPageMembership" ADD CONSTRAINT "ClassPageMembership_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "ClassPageProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassPageLink" ADD CONSTRAINT "ClassPageLink_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassPageLink" ADD CONSTRAINT "ClassPageLink_membershipId_fkey"
  FOREIGN KEY ("membershipId") REFERENCES "ClassPageMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassPageReport" ADD CONSTRAINT "ClassPageReport_reporterId_fkey"
  FOREIGN KEY ("reporterId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassPageReport" ADD CONSTRAINT "ClassPageReport_resolvedById_fkey"
  FOREIGN KEY ("resolvedById") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClassPageReport" ADD CONSTRAINT "ClassPageReport_membershipId_fkey"
  FOREIGN KEY ("membershipId") REFERENCES "ClassPageMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClassPageReport" ADD CONSTRAINT "ClassPageReport_linkId_fkey"
  FOREIGN KEY ("linkId") REFERENCES "ClassPageLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClassPageBlock" ADD CONSTRAINT "ClassPageBlock_blockerId_fkey"
  FOREIGN KEY ("blockerId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassPageBlock" ADD CONSTRAINT "ClassPageBlock_blockedId_fkey"
  FOREIGN KEY ("blockedId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
