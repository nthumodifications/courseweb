CREATE TABLE "semester_dates" (
    "semester" TEXT NOT NULL PRIMARY KEY,
    "begins" TEXT NOT NULL,
    "ends" TEXT NOT NULL,
    "source_text" TEXT NOT NULL,
    "extraction_method" TEXT NOT NULL,
    "fetched_at" TEXT NOT NULL
);

CREATE INDEX "semester_dates_fetched_at_idx"
    ON "semester_dates"("fetched_at");
