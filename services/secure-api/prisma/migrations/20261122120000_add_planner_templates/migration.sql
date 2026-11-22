CREATE TYPE "PlannerTemplateStatus" AS ENUM ('VISIBLE', 'HIDDEN');
CREATE TYPE "PlannerTemplateReportReason" AS ENUM ('WRONG_INFO', 'SPAM', 'OFFENSIVE', 'OTHER');

CREATE TABLE "planner_templates" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "department" TEXT NOT NULL,
    "entranceYear" TEXT NOT NULL,
    "requiredCredits" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "folderCount" INTEGER NOT NULL,
    "courseCount" INTEGER NOT NULL,
    "official" BOOLEAN NOT NULL DEFAULT false,
    "status" "PlannerTemplateStatus" NOT NULL DEFAULT 'VISIBLE',
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "planner_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "planner_template_reports" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "reason" "PlannerTemplateReportReason" NOT NULL,
    "note" TEXT,
    "reporterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    CONSTRAINT "planner_template_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "planner_templates_department_entranceYear_idx" ON "planner_templates"("department", "entranceYear");
CREATE INDEX "planner_templates_authorId_idx" ON "planner_templates"("authorId");
CREATE UNIQUE INDEX "planner_template_reports_templateId_reporterId_key" ON "planner_template_reports"("templateId", "reporterId");
CREATE INDEX "planner_template_reports_templateId_idx" ON "planner_template_reports"("templateId");
CREATE INDEX "planner_template_reports_resolvedAt_idx" ON "planner_template_reports"("resolvedAt");

ALTER TABLE "planner_templates" ADD CONSTRAINT "planner_templates_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "planner_template_reports" ADD CONSTRAINT "planner_template_reports_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "planner_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "planner_template_reports" ADD CONSTRAINT "planner_template_reports_reporterId_fkey"
  FOREIGN KEY ("reporterId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "planner_template_reports" ADD CONSTRAINT "planner_template_reports_resolvedById_fkey"
  FOREIGN KEY ("resolvedById") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "planner_template_uses" (
    "templateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "planner_template_uses_pkey" PRIMARY KEY ("templateId","userId")
);
CREATE INDEX "planner_template_uses_userId_idx" ON "planner_template_uses"("userId");
ALTER TABLE "planner_template_uses" ADD CONSTRAINT "planner_template_uses_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "planner_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "planner_template_uses" ADD CONSTRAINT "planner_template_uses_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
