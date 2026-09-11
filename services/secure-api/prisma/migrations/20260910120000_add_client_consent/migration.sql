-- Client display metadata for the consent screen
ALTER TABLE "Client" ADD COLUMN "name" TEXT;
ALTER TABLE "Client" ADD COLUMN "clientUri" TEXT;
ALTER TABLE "Client" ADD COLUMN "firstParty" BOOLEAN NOT NULL DEFAULT false;

-- NTHUMods' own clients are covered by the sign-up terms and keep their
-- existing one-time terms screen instead of per-scope consent.
UPDATE "Client" SET "firstParty" = true WHERE "clientId" IN ('nthumods', 'nthumods-api');

-- A user's standing grant of a scope set to a client
CREATE TABLE "ClientConsent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "scopes" TEXT[],
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientConsent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClientConsent_userId_clientId_key" ON "ClientConsent"("userId", "clientId");

ALTER TABLE "ClientConsent" ADD CONSTRAINT "ClientConsent_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientConsent" ADD CONSTRAINT "ClientConsent_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;
