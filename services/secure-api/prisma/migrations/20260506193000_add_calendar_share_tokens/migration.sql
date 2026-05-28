CREATE TABLE "CalendarShareToken" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "includeFullDetails" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "CalendarShareToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CalendarShareToken_tokenHash_key" ON "CalendarShareToken"("tokenHash");

ALTER TABLE "CalendarShareToken" ADD CONSTRAINT "CalendarShareToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
