CREATE TABLE "user_storage" (
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" DOUBLE PRECISION,
    "lastModified" DOUBLE PRECISION NOT NULL,
    "deviceId" TEXT,

    CONSTRAINT "user_storage_pkey" PRIMARY KEY ("userId", "key")
);

CREATE INDEX "user_storage_userId_idx" ON "user_storage"("userId");
