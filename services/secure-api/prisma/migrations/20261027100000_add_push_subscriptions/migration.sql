CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "courseChanges" BOOLEAN NOT NULL DEFAULT true,
    "announcementSources" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "lastCourseChangeId" BIGINT NOT NULL DEFAULT 0,
    "lastDigestDate" TEXT,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "push_subscriptions_endpoint_key"
    ON "push_subscriptions"("endpoint");
CREATE INDEX "push_subscriptions_userId_lastSeenAt_idx"
    ON "push_subscriptions"("userId", "lastSeenAt");
CREATE INDEX "push_subscriptions_courseChanges_lastCourseChangeId_idx"
    ON "push_subscriptions"("courseChanges", "lastCourseChangeId");

ALTER TABLE "push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("userId")
    ON DELETE CASCADE ON UPDATE CASCADE;
