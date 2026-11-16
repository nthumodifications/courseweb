-- One shared TDX snapshot for all city bus routes. Many users read it; one
-- request at a time wins "leaseUntil" and refreshes it, so TDX's 5/min quota
-- is never exceeded regardless of traffic.
CREATE TABLE IF NOT EXISTS "CityBusSnapshot" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "payload" TEXT NOT NULL,
    "fetchedAt" INTEGER NOT NULL,
    "leaseUntil" INTEGER NOT NULL
);
