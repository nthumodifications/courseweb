-- Staff access for the admin center.
CREATE TYPE "AdminRole" AS ENUM ('USER', 'ADMIN', 'SUPERUSER');

ALTER TABLE "User"
  ADD COLUMN "role" "AdminRole" NOT NULL DEFAULT 'USER',
  ADD COLUMN "banned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "bannedReason" TEXT;

CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");
CREATE INDEX "AdminAuditLog_actorId_idx" ON "AdminAuditLog"("actorId");

ALTER TABLE "AdminAuditLog"
  ADD CONSTRAINT "AdminAuditLog_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("userId")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Bootstrap the first superuser. The account may not have logged in yet, in
-- which case this updates nothing and src/const/admin.ts promotes it on its
-- first sign-in instead. Both paths exist so neither ordering leaves the admin
-- center with nobody who can let anyone else in.
UPDATE "User" SET "role" = 'SUPERUSER' WHERE "userId" = '111060062';
