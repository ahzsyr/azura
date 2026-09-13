DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SeoSubmissionJobStatus') THEN
    CREATE TYPE "SeoSubmissionJobStatus" AS ENUM (
      'PENDING',
      'RUNNING',
      'COMPLETED',
      'FAILED',
      'EXHAUSTED'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "SeoSubmissionJob" (
  "id" TEXT PRIMARY KEY,
  "provider" VARCHAR(32) NOT NULL,
  "kind" VARCHAR(16) NOT NULL,
  "reason" VARCHAR(64) NOT NULL,
  "url" VARCHAR(512) NOT NULL,
  "status" "SeoSubmissionJobStatus" NOT NULL DEFAULT 'PENDING',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "responseStatus" INTEGER,
  "lastError" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "SeoSubmissionJob_provider_kind_url_key"
ON "SeoSubmissionJob" ("provider", "kind", "url");

CREATE INDEX IF NOT EXISTS "SeoSubmissionJob_status_scheduledAt_idx"
ON "SeoSubmissionJob" ("status", "scheduledAt");

CREATE INDEX IF NOT EXISTS "SeoSubmissionJob_provider_status_idx"
ON "SeoSubmissionJob" ("provider", "status");

CREATE TABLE IF NOT EXISTS "SeoRunnerLock" (
  "key" VARCHAR(64) PRIMARY KEY,
  "lockedUntil" TIMESTAMP(3) NOT NULL,
  "owner" VARCHAR(128),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SeoTelemetryEventType') THEN
    CREATE TYPE "SeoTelemetryEventType" AS ENUM ('QUEUED', 'STARTED', 'COMPLETED', 'FAILED', 'EXHAUSTED', 'SKIPPED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SeoTelemetryStatus') THEN
    CREATE TYPE "SeoTelemetryStatus" AS ENUM ('SUCCESS', 'FAILURE', 'INFO');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SeoCrawlIssueSeverity') THEN
    CREATE TYPE "SeoCrawlIssueSeverity" AS ENUM ('CRITICAL', 'WARNING', 'INFO');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SeoRichResultCategory') THEN
    CREATE TYPE "SeoRichResultCategory" AS ENUM ('ERROR', 'WARNING');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SeoRichResultEligibility') THEN
    CREATE TYPE "SeoRichResultEligibility" AS ENUM ('ELIGIBLE', 'ELIGIBLE_WITH_WARNINGS', 'NOT_ELIGIBLE');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "SeoProviderTelemetry" (
  "id" TEXT PRIMARY KEY,
  "provider" VARCHAR(32) NOT NULL,
  "eventType" "SeoTelemetryEventType" NOT NULL,
  "status" "SeoTelemetryStatus" NOT NULL,
  "responseCode" INTEGER,
  "latencyMs" INTEGER,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "errorClass" VARCHAR(64),
  "jobId" VARCHAR(128),
  "url" VARCHAR(512),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "SeoProviderTelemetry_provider_createdAt_idx" ON "SeoProviderTelemetry" ("provider", "createdAt");
CREATE INDEX IF NOT EXISTS "SeoProviderTelemetry_eventType_createdAt_idx" ON "SeoProviderTelemetry" ("eventType", "createdAt");
CREATE INDEX IF NOT EXISTS "SeoProviderTelemetry_status_createdAt_idx" ON "SeoProviderTelemetry" ("status", "createdAt");

CREATE TABLE IF NOT EXISTS "SeoHealthSnapshot" (
  "id" TEXT PRIMARY KEY,
  "score" INTEGER NOT NULL,
  "componentBreakdown" JSONB NOT NULL DEFAULT '{}',
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "SeoHealthSnapshot_generatedAt_idx" ON "SeoHealthSnapshot" ("generatedAt");

CREATE TABLE IF NOT EXISTS "SeoCrawlIssue" (
  "id" TEXT PRIMARY KEY,
  "issueKey" VARCHAR(256) NOT NULL UNIQUE,
  "type" VARCHAR(64) NOT NULL,
  "severity" "SeoCrawlIssueSeverity" NOT NULL,
  "url" VARCHAR(512) NOT NULL,
  "details" JSONB NOT NULL DEFAULT '{}',
  "source" VARCHAR(64),
  "firstDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "SeoCrawlIssue_severity_resolvedAt_idx" ON "SeoCrawlIssue" ("severity", "resolvedAt");
CREATE INDEX IF NOT EXISTS "SeoCrawlIssue_type_resolvedAt_idx" ON "SeoCrawlIssue" ("type", "resolvedAt");
CREATE INDEX IF NOT EXISTS "SeoCrawlIssue_lastDetectedAt_idx" ON "SeoCrawlIssue" ("lastDetectedAt");

CREATE TABLE IF NOT EXISTS "SeoSearchMetric" (
  "id" TEXT PRIMARY KEY,
  "date" DATE NOT NULL,
  "url" VARCHAR(512) NOT NULL,
  "query" VARCHAR(512) NOT NULL DEFAULT '',
  "country" VARCHAR(8) NOT NULL DEFAULT '',
  "device" VARCHAR(32) NOT NULL DEFAULT '',
  "source" VARCHAR(32) NOT NULL,
  "clicks" INTEGER NOT NULL DEFAULT 0,
  "impressions" INTEGER NOT NULL DEFAULT 0,
  "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "SeoSearchMetric_source_date_url_query_country_device_key"
ON "SeoSearchMetric" ("source", "date", "url", "query", "country", "device");
CREATE INDEX IF NOT EXISTS "SeoSearchMetric_date_source_idx" ON "SeoSearchMetric" ("date", "source");
CREATE INDEX IF NOT EXISTS "SeoSearchMetric_url_date_idx" ON "SeoSearchMetric" ("url", "date");
CREATE INDEX IF NOT EXISTS "SeoSearchMetric_query_date_idx" ON "SeoSearchMetric" ("query", "date");

CREATE TABLE IF NOT EXISTS "SeoRichResultIssue" (
  "id" TEXT PRIMARY KEY,
  "issueKey" VARCHAR(256) NOT NULL UNIQUE,
  "type" VARCHAR(64) NOT NULL,
  "category" "SeoRichResultCategory" NOT NULL,
  "url" VARCHAR(512) NOT NULL,
  "details" JSONB NOT NULL DEFAULT '{}',
  "eligibility" "SeoRichResultEligibility" NOT NULL,
  "source" VARCHAR(64) NOT NULL DEFAULT 'internal',
  "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "SeoRichResultIssue_type_eligibility_idx" ON "SeoRichResultIssue" ("type", "eligibility");
CREATE INDEX IF NOT EXISTS "SeoRichResultIssue_category_resolvedAt_idx" ON "SeoRichResultIssue" ("category", "resolvedAt");
CREATE INDEX IF NOT EXISTS "SeoRichResultIssue_detectedAt_idx" ON "SeoRichResultIssue" ("detectedAt");