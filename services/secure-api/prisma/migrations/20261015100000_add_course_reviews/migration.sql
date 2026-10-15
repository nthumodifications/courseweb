CREATE TYPE "CourseReviewStatus" AS ENUM ('VISIBLE', 'HIDDEN', 'REMOVED');
CREATE TYPE "CourseReviewSource" AS ENUM ('NATIVE', 'PTT');
CREATE TYPE "CourseReviewReportReason" AS ENUM (
    'PERSONAL_ATTACK',
    'EXAM_LEAK',
    'SPAM',
    'OFF_TOPIC',
    'OTHER'
);

CREATE TABLE "CourseReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "moduleKey" TEXT NOT NULL,
    "instructor" TEXT NOT NULL,
    "semester" TEXT,
    "coolness" INTEGER,
    "sweetness" INTEGER,
    "learning" INTEGER,
    "attendance" TEXT,
    "examStyle" TEXT[] NOT NULL,
    "body" TEXT NOT NULL,
    "source" "CourseReviewSource" NOT NULL DEFAULT 'NATIVE',
    "sourceUrl" TEXT,
    "sourceAuthor" TEXT,
    "sourcePostedAt" TIMESTAMP(3),
    "status" "CourseReviewStatus" NOT NULL DEFAULT 'VISIBLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CourseReviewReport" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "reason" "CourseReviewReportReason" NOT NULL,
    "note" TEXT,
    "reporterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,

    CONSTRAINT "CourseReviewReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CourseReview_userId_moduleKey_instructor_key"
    ON "CourseReview"("userId", "moduleKey", "instructor");
CREATE UNIQUE INDEX "CourseReview_sourceUrl_instructor_key"
    ON "CourseReview"("sourceUrl", "instructor");
CREATE INDEX "CourseReview_moduleKey_idx" ON "CourseReview"("moduleKey");
CREATE INDEX "CourseReview_instructor_idx" ON "CourseReview"("instructor");
CREATE INDEX "CourseReview_source_idx" ON "CourseReview"("source");
CREATE UNIQUE INDEX "CourseReviewReport_reviewId_reporterId_key"
    ON "CourseReviewReport"("reviewId", "reporterId");
CREATE INDEX "CourseReviewReport_reviewId_idx" ON "CourseReviewReport"("reviewId");
CREATE INDEX "CourseReviewReport_resolvedAt_idx" ON "CourseReviewReport"("resolvedAt");

ALTER TABLE "CourseReview"
  ADD CONSTRAINT "CourseReview_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("userId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CourseReviewReport"
  ADD CONSTRAINT "CourseReviewReport_reviewId_fkey"
  FOREIGN KEY ("reviewId") REFERENCES "CourseReview"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CourseReviewReport_reporterId_fkey"
  FOREIGN KEY ("reporterId") REFERENCES "User"("userId")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CourseReviewReport_resolvedById_fkey"
  FOREIGN KEY ("resolvedById") REFERENCES "User"("userId")
  ON DELETE SET NULL ON UPDATE CASCADE;
