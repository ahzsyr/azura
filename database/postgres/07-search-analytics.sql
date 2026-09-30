-- Per-locale search analytics snapshot (replaces data/search-analytics/*.json)
CREATE TABLE IF NOT EXISTS "SearchAnalyticsSnapshot" (
    "locale"    VARCHAR(10)  NOT NULL,
    "data"      JSONB        NOT NULL DEFAULT '{}'::jsonb,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SearchAnalyticsSnapshot_pkey" PRIMARY KEY ("locale")
);
