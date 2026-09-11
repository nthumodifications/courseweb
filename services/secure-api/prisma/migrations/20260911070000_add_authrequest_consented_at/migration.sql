-- Mark when a pending authorization request was actually approved by the user.
-- Left NULL for rows written before the consent gate existed, so those cannot be
-- exchanged for a code: an in-flight login at deploy time is restarted rather
-- than let through on the strength of the old generic terms screen.
ALTER TABLE "AuthRequest" ADD COLUMN "consentedAt" TIMESTAMP(3);
