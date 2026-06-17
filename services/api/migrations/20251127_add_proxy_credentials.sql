-- Migration number: 20251127 	 2026-03-19T08:14:38.026Z
-- Add ProxyCredential table for server-side encrypted credential storage
CREATE TABLE IF NOT EXISTS "ProxyCredential" (
    "id"                TEXT NOT NULL PRIMARY KEY,
    "studentId"         TEXT NOT NULL UNIQUE,
    "encryptedPassword" TEXT NOT NULL,
    "iv"                TEXT NOT NULL,
    "authTag"           TEXT NOT NULL,
    "keyVersion"        INTEGER NOT NULL DEFAULT 1,
    "createdAt"         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt"        DATETIME NOT NULL,
    "expiresAt"         DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS "ProxyCredential_expiresAt_idx" ON "ProxyCredential"("expiresAt");
