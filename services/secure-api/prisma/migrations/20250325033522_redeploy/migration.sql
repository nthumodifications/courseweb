-- AlterTable
ALTER TABLE "AuthCode" ADD COLUMN     "codeChallenge" TEXT,
ADD COLUMN     "codeChallengeMethod" TEXT,
ADD COLUMN     "nonce" TEXT;

-- CreateTable
CREATE TABLE "AuthRequest" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "scopes" TEXT[],
    "state" TEXT,
    "clientState" TEXT,
    "nonce" TEXT,
    "codeChallenge" TEXT,
    "codeChallengeMethod" TEXT,
    "responseMode" TEXT,
    "responseType" TEXT[],

    CONSTRAINT "AuthRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthRequest_state_key" ON "AuthRequest"("state");
