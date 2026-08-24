-- Marketing integrations (Meta + LinkedIn wave 1)
-- Idempotent patch for Supabase / PostgreSQL deploys (prisma/migrations are MySQL-oriented).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MarketingSyncStatus') THEN
    CREATE TYPE "MarketingSyncStatus" AS ENUM ('IDLE', 'RUNNING', 'SUCCESS', 'FAILED', 'SCHEDULED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MarketingJobStatus') THEN
    CREATE TYPE "MarketingJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'EXHAUSTED', 'CANCELLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MarketingWebhookStatus') THEN
    CREATE TYPE "MarketingWebhookStatus" AS ENUM ('RECEIVED', 'VERIFIED', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD_LETTER');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "MarketingProviderRuntime" (
  "id" TEXT NOT NULL,
  "providerId" VARCHAR(64) NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "installedVersion" VARCHAR(32) NOT NULL DEFAULT '1.0.0',
  "lifecycle" VARCHAR(32) NOT NULL DEFAULT 'discovered',
  "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
  "lastSyncAt" TIMESTAMP(3),
  "healthSummary" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketingProviderRuntime_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MarketingProviderRuntime_providerId_key"
  ON "MarketingProviderRuntime" ("providerId");

CREATE TABLE IF NOT EXISTS "MarketingConnection" (
  "id" TEXT NOT NULL,
  "providerId" VARCHAR(64) NOT NULL,
  "tenantId" VARCHAR(64) NOT NULL DEFAULT 'default',
  "status" VARCHAR(32) NOT NULL DEFAULT 'disconnected',
  "lifecycle" VARCHAR(32) NOT NULL DEFAULT 'configured',
  "oauthMetadata" JSONB NOT NULL DEFAULT '{}',
  "scopesGranted" JSONB NOT NULL DEFAULT '[]',
  "scopesRequired" JSONB NOT NULL DEFAULT '[]',
  "scopesMissing" JSONB NOT NULL DEFAULT '[]',
  "scopesExpired" JSONB NOT NULL DEFAULT '[]',
  "lastHealthAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketingConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MarketingConnection_providerId_tenantId_key"
  ON "MarketingConnection" ("providerId", "tenantId");
CREATE INDEX IF NOT EXISTS "MarketingConnection_status_idx" ON "MarketingConnection" ("status");
CREATE INDEX IF NOT EXISTS "MarketingConnection_lifecycle_idx" ON "MarketingConnection" ("lifecycle");

CREATE TABLE IF NOT EXISTS "MarketingCredential" (
  "id" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "accessToken" TEXT NOT NULL,
  "refreshToken" TEXT,
  "tokenType" VARCHAR(32),
  "expiresAt" TIMESTAMP(3),
  "refreshStatus" VARCHAR(32) NOT NULL DEFAULT 'ok',
  "sealedPayload" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketingCredential_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MarketingCredential_connectionId_key"
  ON "MarketingCredential" ("connectionId");

CREATE TABLE IF NOT EXISTS "MarketingAccount" (
  "id" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "externalAccountId" VARCHAR(128) NOT NULL,
  "accountType" VARCHAR(64) NOT NULL,
  "displayName" VARCHAR(256) NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "isSelected" BOOLEAN NOT NULL DEFAULT false,
  "healthSummary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketingAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MarketingAccount_connectionId_externalAccountId_key"
  ON "MarketingAccount" ("connectionId", "externalAccountId");
CREATE INDEX IF NOT EXISTS "MarketingAccount_accountType_idx" ON "MarketingAccount" ("accountType");

CREATE TABLE IF NOT EXISTS "MarketingAsset" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "canonicalAssetKind" VARCHAR(64) NOT NULL,
  "providerAssetType" VARCHAR(64) NOT NULL,
  "externalAssetId" VARCHAR(128) NOT NULL,
  "displayName" VARCHAR(256) NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "selectable" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketingAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MarketingAsset_accountId_externalAssetId_key"
  ON "MarketingAsset" ("accountId", "externalAssetId");
CREATE INDEX IF NOT EXISTS "MarketingAsset_canonicalAssetKind_idx" ON "MarketingAsset" ("canonicalAssetKind");

CREATE TABLE IF NOT EXISTS "MarketingPermissionState" (
  "id" TEXT NOT NULL,
  "providerId" VARCHAR(64) NOT NULL,
  "connectionId" VARCHAR(64) NOT NULL,
  "entries" JSONB NOT NULL DEFAULT '[]',
  "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketingPermissionState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MarketingPermissionState_providerId_connectionId_key"
  ON "MarketingPermissionState" ("providerId", "connectionId");
CREATE INDEX IF NOT EXISTS "MarketingPermissionState_lastCheckedAt_idx"
  ON "MarketingPermissionState" ("lastCheckedAt");

CREATE TABLE IF NOT EXISTS "MarketingSyncState" (
  "id" TEXT NOT NULL,
  "providerId" VARCHAR(64) NOT NULL,
  "entity" VARCHAR(64) NOT NULL,
  "entityId" VARCHAR(128),
  "lastSuccessfulSync" TIMESTAMP(3),
  "lastAttempt" TIMESTAMP(3),
  "nextScheduled" TIMESTAMP(3),
  "status" "MarketingSyncStatus" NOT NULL DEFAULT 'IDLE',
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketingSyncState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MarketingSyncState_providerId_entity_entityId_key"
  ON "MarketingSyncState" ("providerId", "entity", "entityId");
CREATE INDEX IF NOT EXISTS "MarketingSyncState_status_nextScheduled_idx"
  ON "MarketingSyncState" ("status", "nextScheduled");

CREATE TABLE IF NOT EXISTS "MarketingJob" (
  "id" TEXT NOT NULL,
  "providerId" VARCHAR(64),
  "connectionId" TEXT,
  "accountId" TEXT,
  "jobType" VARCHAR(64) NOT NULL,
  "workflowStage" VARCHAR(64) NOT NULL DEFAULT 'queued',
  "payload" JSONB NOT NULL DEFAULT '{}',
  "result" JSONB NOT NULL DEFAULT '{}',
  "idempotencyKey" VARCHAR(191) NOT NULL,
  "status" "MarketingJobStatus" NOT NULL DEFAULT 'PENDING',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "lastError" TEXT,
  "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketingJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MarketingJob_idempotencyKey_key" ON "MarketingJob" ("idempotencyKey");
CREATE INDEX IF NOT EXISTS "MarketingJob_status_scheduledAt_idx" ON "MarketingJob" ("status", "scheduledAt");
CREATE INDEX IF NOT EXISTS "MarketingJob_jobType_status_idx" ON "MarketingJob" ("jobType", "status");
CREATE INDEX IF NOT EXISTS "MarketingJob_providerId_status_idx" ON "MarketingJob" ("providerId", "status");

CREATE TABLE IF NOT EXISTS "MarketingWebhookEvent" (
  "id" TEXT NOT NULL,
  "providerId" VARCHAR(64) NOT NULL,
  "eventType" VARCHAR(128) NOT NULL,
  "externalEventId" VARCHAR(191),
  "signatureValid" BOOLEAN NOT NULL DEFAULT false,
  "status" "MarketingWebhookStatus" NOT NULL DEFAULT 'RECEIVED',
  "rawPayload" JSONB NOT NULL DEFAULT '{}',
  "normalizedPayload" JSONB NOT NULL DEFAULT '{}',
  "processingError" TEXT,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketingWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MarketingWebhookEvent_providerId_status_idx"
  ON "MarketingWebhookEvent" ("providerId", "status");
CREATE INDEX IF NOT EXISTS "MarketingWebhookEvent_externalEventId_idx"
  ON "MarketingWebhookEvent" ("externalEventId");
CREATE UNIQUE INDEX IF NOT EXISTS "MarketingWebhookEvent_providerId_externalEventId_key"
  ON "MarketingWebhookEvent" ("providerId", "externalEventId");

CREATE TABLE IF NOT EXISTS "MarketingAnalyticsSnapshot" (
  "id" TEXT NOT NULL,
  "providerId" VARCHAR(64) NOT NULL,
  "accountId" VARCHAR(128) NOT NULL,
  "metric" VARCHAR(64) NOT NULL,
  "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "dimensions" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketingAnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MarketingAnalyticsSnapshot_metric_period_key"
  ON "MarketingAnalyticsSnapshot" ("providerId", "accountId", "metric", "periodStart", "periodEnd");
CREATE INDEX IF NOT EXISTS "MarketingAnalyticsSnapshot_providerId_periodStart_idx"
  ON "MarketingAnalyticsSnapshot" ("providerId", "periodStart");
CREATE INDEX IF NOT EXISTS "MarketingAnalyticsSnapshot_metric_periodStart_idx"
  ON "MarketingAnalyticsSnapshot" ("metric", "periodStart");

CREATE TABLE IF NOT EXISTS "MarketingProviderAppConfig" (
  "id" TEXT NOT NULL,
  "providerId" VARCHAR(64) NOT NULL,
  "clientId" VARCHAR(256),
  "clientSecret" TEXT,
  "appSecret" TEXT,
  "webhookVerifyToken" TEXT,
  "pixelId" VARCHAR(128),
  "capiAccessToken" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketingProviderAppConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MarketingProviderAppConfig_providerId_key"
  ON "MarketingProviderAppConfig" ("providerId");

CREATE TABLE IF NOT EXISTS "MarketingTrackingConfig" (
  "id" TEXT NOT NULL,
  "providerId" VARCHAR(64) NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "pixelId" VARCHAR(128),
  "capiEnabled" BOOLEAN NOT NULL DEFAULT false,
  "accessToken" TEXT,
  "testEventCode" VARCHAR(128),
  "mappings" JSONB NOT NULL DEFAULT '{}',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketingTrackingConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MarketingTrackingConfig_providerId_key"
  ON "MarketingTrackingConfig" ("providerId");

CREATE TABLE IF NOT EXISTS "MarketingLeadEvent" (
  "id" TEXT NOT NULL,
  "providerId" VARCHAR(64) NOT NULL,
  "externalLeadId" VARCHAR(191) NOT NULL,
  "formId" VARCHAR(128),
  "payload" JSONB NOT NULL DEFAULT '{}',
  "canonical" JSONB NOT NULL DEFAULT '{}',
  "inquiryId" VARCHAR(64),
  "processingStatus" VARCHAR(32) NOT NULL DEFAULT 'pending',
  "idempotencyKey" VARCHAR(191) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketingLeadEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MarketingLeadEvent_idempotencyKey_key" ON "MarketingLeadEvent" ("idempotencyKey");
CREATE UNIQUE INDEX IF NOT EXISTS "MarketingLeadEvent_providerId_externalLeadId_key"
  ON "MarketingLeadEvent" ("providerId", "externalLeadId");
CREATE INDEX IF NOT EXISTS "MarketingLeadEvent_processingStatus_idx" ON "MarketingLeadEvent" ("processingStatus");

CREATE TABLE IF NOT EXISTS "MarketingTelemetry" (
  "id" TEXT NOT NULL,
  "providerId" VARCHAR(64) NOT NULL,
  "operation" VARCHAR(128) NOT NULL,
  "durationMs" INTEGER NOT NULL DEFAULT 0,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "rateLimited" BOOLEAN NOT NULL DEFAULT false,
  "queueWaitMs" INTEGER,
  "outcome" VARCHAR(16) NOT NULL,
  "errorCategory" VARCHAR(64),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketingTelemetry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MarketingTelemetry_providerId_createdAt_idx"
  ON "MarketingTelemetry" ("providerId", "createdAt");
CREATE INDEX IF NOT EXISTS "MarketingTelemetry_outcome_createdAt_idx"
  ON "MarketingTelemetry" ("outcome", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MarketingConnection_providerId_fkey') THEN
    ALTER TABLE "MarketingConnection"
      ADD CONSTRAINT "MarketingConnection_providerId_fkey"
      FOREIGN KEY ("providerId") REFERENCES "MarketingProviderRuntime"("providerId")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MarketingCredential_connectionId_fkey') THEN
    ALTER TABLE "MarketingCredential"
      ADD CONSTRAINT "MarketingCredential_connectionId_fkey"
      FOREIGN KEY ("connectionId") REFERENCES "MarketingConnection"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MarketingAccount_connectionId_fkey') THEN
    ALTER TABLE "MarketingAccount"
      ADD CONSTRAINT "MarketingAccount_connectionId_fkey"
      FOREIGN KEY ("connectionId") REFERENCES "MarketingConnection"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MarketingAsset_accountId_fkey') THEN
    ALTER TABLE "MarketingAsset"
      ADD CONSTRAINT "MarketingAsset_accountId_fkey"
      FOREIGN KEY ("accountId") REFERENCES "MarketingAccount"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MarketingSyncState_providerId_fkey') THEN
    ALTER TABLE "MarketingSyncState"
      ADD CONSTRAINT "MarketingSyncState_providerId_fkey"
      FOREIGN KEY ("providerId") REFERENCES "MarketingProviderRuntime"("providerId")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MarketingJob_providerId_fkey') THEN
    ALTER TABLE "MarketingJob"
      ADD CONSTRAINT "MarketingJob_providerId_fkey"
      FOREIGN KEY ("providerId") REFERENCES "MarketingProviderRuntime"("providerId")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MarketingJob_connectionId_fkey') THEN
    ALTER TABLE "MarketingJob"
      ADD CONSTRAINT "MarketingJob_connectionId_fkey"
      FOREIGN KEY ("connectionId") REFERENCES "MarketingConnection"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MarketingJob_accountId_fkey') THEN
    ALTER TABLE "MarketingJob"
      ADD CONSTRAINT "MarketingJob_accountId_fkey"
      FOREIGN KEY ("accountId") REFERENCES "MarketingAccount"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MarketingTelemetry_providerId_fkey') THEN
    ALTER TABLE "MarketingTelemetry"
      ADD CONSTRAINT "MarketingTelemetry_providerId_fkey"
      FOREIGN KEY ("providerId") REFERENCES "MarketingProviderRuntime"("providerId")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
