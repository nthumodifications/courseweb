-- Usage history rollups and the small amount of state needed by the forecast worker.
CREATE TABLE "UsageSlot" (
    "source" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "dow" INTEGER NOT NULL,
    "sum" REAL NOT NULL,
    "n" INTEGER NOT NULL,
    "min" REAL NOT NULL,
    "max" REAL NOT NULL,
    "lastValue" REAL NOT NULL,
    "lastSampleAt" TEXT NOT NULL,
    PRIMARY KEY ("source", "seriesId", "date", "slot")
);

CREATE INDEX "UsageSlot_source_seriesId_date_idx"
    ON "UsageSlot"("source", "seriesId", "date");

CREATE TABLE "UsageSeriesMeta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "firstSeen" TEXT NOT NULL,
    "lastSeen" TEXT NOT NULL,
    "lastValue" REAL,
    "lastSampleAt" TEXT,
    "lastValueChangedAt" TEXT,
    "lastSuccessfulAt" TEXT
);

CREATE UNIQUE INDEX "UsageSeriesMeta_source_seriesId_key"
    ON "UsageSeriesMeta"("source", "seriesId");

CREATE INDEX "UsageSeriesMeta_source_seriesId_idx"
    ON "UsageSeriesMeta"("source", "seriesId");

CREATE TABLE "UsageAnomalyState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "type" TEXT,
    "since" TEXT,
    "samples" INTEGER NOT NULL DEFAULT 0,
    "lastObservedAt" TEXT,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "UsageAnomalyState_source_seriesId_key"
    ON "UsageAnomalyState"("source", "seriesId");
