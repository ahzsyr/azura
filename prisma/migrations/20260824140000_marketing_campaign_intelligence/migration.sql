-- Marketing Campaign Intelligence Platform

-- Enums
DO $$ BEGIN
  CREATE TYPE "MarketingCampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "MarketingTouchType" AS ENUM ('FIRST_TOUCH', 'SESSION_START', 'PAID_CLICK', 'ORGANIC_SEARCH', 'REFERRAL', 'EMAIL', 'SOCIAL_ORGANIC', 'DIRECT', 'CAMPAIGN_URL', 'CONVERSION_TOUCH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "MarketingClickIdType" AS ENUM ('GCLID', 'FBCLID', 'MSCLKID', 'LI_FAT_ID', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "MarketingConsentStatus" AS ENUM ('UNKNOWN', 'GRANTED', 'DENIED', 'WITHDRAWN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend MarketingAccount
ALTER TABLE "MarketingAccount" ADD COLUMN IF NOT EXISTS "currency" VARCHAR(8);
ALTER TABLE "MarketingAccount" ADD COLUMN IF NOT EXISTS "spend" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "MarketingAccount" ADD COLUMN IF NOT EXISTS "impressions" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "MarketingAccount" ADD COLUMN IF NOT EXISTS "clicks" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "MarketingAccount" ADD COLUMN IF NOT EXISTS "conversions" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "MarketingAccount" ADD COLUMN IF NOT EXISTS "lastSyncAt" TIMESTAMP(3);

-- Inquiry attribution
ALTER TABLE "Inquiry" ADD COLUMN IF NOT EXISTS "marketingCampaignId" VARCHAR(64);
ALTER TABLE "Inquiry" ADD COLUMN IF NOT EXISTS "attributionTouchId" VARCHAR(64);
ALTER TABLE "Inquiry" ADD COLUMN IF NOT EXISTS "attributionSourceId" VARCHAR(64);
CREATE INDEX IF NOT EXISTS "Inquiry_marketingCampaignId_idx" ON "Inquiry"("marketingCampaignId");

CREATE TABLE IF NOT EXISTS "MarketingSource" (
  "id" TEXT NOT NULL,
  "key" VARCHAR(64) NOT NULL,
  "label" VARCHAR(128) NOT NULL,
  "category" VARCHAR(32) NOT NULL DEFAULT 'other',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketingSource_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MarketingSource_key_key" ON "MarketingSource"("key");

CREATE TABLE IF NOT EXISTS "MarketingConversionDefinition" (
  "id" TEXT NOT NULL,
  "key" VARCHAR(64) NOT NULL,
  "name" VARCHAR(128) NOT NULL,
  "description" TEXT,
  "triggerType" VARCHAR(64) NOT NULL,
  "triggerConfig" JSONB NOT NULL DEFAULT '{}',
  "value" DOUBLE PRECISION,
  "currency" VARCHAR(8),
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketingConversionDefinition_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MarketingConversionDefinition_key_key" ON "MarketingConversionDefinition"("key");

CREATE TABLE IF NOT EXISTS "MarketingCampaign" (
  "id" TEXT NOT NULL,
  "internalId" VARCHAR(64) NOT NULL,
  "name" VARCHAR(256) NOT NULL,
  "objective" VARCHAR(128),
  "channel" VARCHAR(64),
  "status" "MarketingCampaignStatus" NOT NULL DEFAULT 'DRAFT',
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "budget" DOUBLE PRECISION,
  "budgetCurrency" VARCHAR(8),
  "targetAudience" TEXT,
  "targetLocation" VARCHAR(256),
  "landingPagePath" VARCHAR(512),
  "conversionGoalId" TEXT,
  "description" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketingCampaign_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MarketingCampaign_internalId_key" ON "MarketingCampaign"("internalId");
CREATE INDEX IF NOT EXISTS "MarketingCampaign_status_idx" ON "MarketingCampaign"("status");
CREATE INDEX IF NOT EXISTS "MarketingCampaign_startDate_endDate_idx" ON "MarketingCampaign"("startDate", "endDate");

CREATE TABLE IF NOT EXISTS "MarketingCampaignProviderBinding" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "providerId" VARCHAR(64) NOT NULL,
  "adAccountId" TEXT,
  "externalCampaignId" VARCHAR(128),
  "externalCampaignName" VARCHAR(256),
  "status" VARCHAR(32) NOT NULL DEFAULT 'linked',
  "syncStatus" VARCHAR(32) NOT NULL DEFAULT 'idle',
  "lastSyncAt" TIMESTAMP(3),
  "providerMetadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketingCampaignProviderBinding_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MarketingCampaignProviderBinding_campaignId_providerId_externalCampaignId_key" ON "MarketingCampaignProviderBinding"("campaignId", "providerId", "externalCampaignId");
CREATE INDEX IF NOT EXISTS "MarketingCampaignProviderBinding_providerId_idx" ON "MarketingCampaignProviderBinding"("providerId");
CREATE INDEX IF NOT EXISTS "MarketingCampaignProviderBinding_adAccountId_idx" ON "MarketingCampaignProviderBinding"("adAccountId");

CREATE TABLE IF NOT EXISTS "MarketingExternalCampaign" (
  "id" TEXT NOT NULL,
  "providerId" VARCHAR(64) NOT NULL,
  "externalId" VARCHAR(128) NOT NULL,
  "providerEntityType" VARCHAR(64) NOT NULL DEFAULT 'campaign',
  "name" VARCHAR(256) NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'unknown',
  "adAccountId" TEXT,
  "providerBindingId" TEXT,
  "providerMetadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketingExternalCampaign_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MarketingExternalCampaign_providerId_externalId_key" ON "MarketingExternalCampaign"("providerId", "externalId");
CREATE INDEX IF NOT EXISTS "MarketingExternalCampaign_adAccountId_idx" ON "MarketingExternalCampaign"("adAccountId");
CREATE INDEX IF NOT EXISTS "MarketingExternalCampaign_providerBindingId_idx" ON "MarketingExternalCampaign"("providerBindingId");

CREATE TABLE IF NOT EXISTS "MarketingAdGroup" (
  "id" TEXT NOT NULL,
  "providerId" VARCHAR(64) NOT NULL,
  "externalId" VARCHAR(128) NOT NULL,
  "providerEntityType" VARCHAR(64) NOT NULL DEFAULT 'ad_group',
  "name" VARCHAR(256) NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'unknown',
  "externalCampaignId" TEXT NOT NULL,
  "providerMetadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketingAdGroup_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MarketingAdGroup_providerId_externalId_key" ON "MarketingAdGroup"("providerId", "externalId");
CREATE INDEX IF NOT EXISTS "MarketingAdGroup_externalCampaignId_idx" ON "MarketingAdGroup"("externalCampaignId");

CREATE TABLE IF NOT EXISTS "MarketingAd" (
  "id" TEXT NOT NULL,
  "providerId" VARCHAR(64) NOT NULL,
  "externalId" VARCHAR(128) NOT NULL,
  "providerEntityType" VARCHAR(64) NOT NULL DEFAULT 'ad',
  "name" VARCHAR(256) NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'unknown',
  "adGroupId" TEXT NOT NULL,
  "providerMetadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketingAd_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MarketingAd_providerId_externalId_key" ON "MarketingAd"("providerId", "externalId");
CREATE INDEX IF NOT EXISTS "MarketingAd_adGroupId_idx" ON "MarketingAd"("adGroupId");

CREATE TABLE IF NOT EXISTS "MarketingCreative" (
  "id" TEXT NOT NULL,
  "providerId" VARCHAR(64) NOT NULL,
  "externalId" VARCHAR(128) NOT NULL,
  "providerEntityType" VARCHAR(64) NOT NULL DEFAULT 'creative',
  "name" VARCHAR(256),
  "creativeType" VARCHAR(64),
  "headline" VARCHAR(512),
  "body" TEXT,
  "previewUrl" TEXT,
  "adId" TEXT NOT NULL,
  "providerMetadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketingCreative_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MarketingCreative_providerId_externalId_key" ON "MarketingCreative"("providerId", "externalId");
CREATE INDEX IF NOT EXISTS "MarketingCreative_adId_idx" ON "MarketingCreative"("adId");

CREATE TABLE IF NOT EXISTS "MarketingTrackingUrl" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "providerBindingId" TEXT,
  "externalAdId" TEXT,
  "baseUrl" TEXT NOT NULL,
  "utmSource" VARCHAR(128),
  "utmMedium" VARCHAR(128),
  "utmCampaign" VARCHAR(256),
  "utmContent" VARCHAR(256),
  "utmTerm" VARCHAR(256),
  "fullUrl" TEXT NOT NULL,
  "qrAssetRef" TEXT,
  "label" VARCHAR(256),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketingTrackingUrl_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MarketingTrackingUrl_campaignId_idx" ON "MarketingTrackingUrl"("campaignId");
CREATE INDEX IF NOT EXISTS "MarketingTrackingUrl_utmCampaign_idx" ON "MarketingTrackingUrl"("utmCampaign");

CREATE TABLE IF NOT EXISTS "MarketingVisitor" (
  "id" TEXT NOT NULL,
  "visitorToken" VARCHAR(64) NOT NULL,
  "consentStatus" "MarketingConsentStatus" NOT NULL DEFAULT 'UNKNOWN',
  "consentGrantedAt" TIMESTAMP(3),
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketingVisitor_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MarketingVisitor_visitorToken_key" ON "MarketingVisitor"("visitorToken");

CREATE TABLE IF NOT EXISTS "MarketingSession" (
  "id" TEXT NOT NULL,
  "visitorId" TEXT NOT NULL,
  "sessionToken" VARCHAR(64) NOT NULL,
  "entryUrl" TEXT,
  "landingPagePath" VARCHAR(512),
  "referrer" TEXT,
  "deviceType" VARCHAR(32),
  "browser" VARCHAR(64),
  "os" VARCHAR(64),
  "country" VARCHAR(64),
  "region" VARCHAR(64),
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketingSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MarketingSession_sessionToken_key" ON "MarketingSession"("sessionToken");
CREATE INDEX IF NOT EXISTS "MarketingSession_visitorId_startedAt_idx" ON "MarketingSession"("visitorId", "startedAt");

CREATE TABLE IF NOT EXISTS "MarketingTouch" (
  "id" TEXT NOT NULL,
  "visitorId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "sourceId" TEXT,
  "medium" VARCHAR(64),
  "internalCampaignId" TEXT,
  "externalAdId" TEXT,
  "landingPagePath" VARCHAR(512),
  "referrer" TEXT,
  "utmSource" VARCHAR(128),
  "utmMedium" VARCHAR(128),
  "utmCampaign" VARCHAR(256),
  "utmContent" VARCHAR(256),
  "utmTerm" VARCHAR(256),
  "touchType" "MarketingTouchType" NOT NULL DEFAULT 'DIRECT',
  "clickIdType" "MarketingClickIdType",
  "clickId" VARCHAR(256),
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "providerMetadata" JSONB NOT NULL DEFAULT '{}',
  "rawPayload" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketingTouch_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MarketingTouch_visitorId_occurredAt_idx" ON "MarketingTouch"("visitorId", "occurredAt");
CREATE INDEX IF NOT EXISTS "MarketingTouch_sessionId_occurredAt_idx" ON "MarketingTouch"("sessionId", "occurredAt");
CREATE INDEX IF NOT EXISTS "MarketingTouch_sourceId_idx" ON "MarketingTouch"("sourceId");
CREATE INDEX IF NOT EXISTS "MarketingTouch_internalCampaignId_idx" ON "MarketingTouch"("internalCampaignId");
CREATE INDEX IF NOT EXISTS "MarketingTouch_touchType_idx" ON "MarketingTouch"("touchType");

CREATE TABLE IF NOT EXISTS "MarketingEvent" (
  "id" TEXT NOT NULL,
  "eventId" VARCHAR(128),
  "idempotencyKey" VARCHAR(191) NOT NULL,
  "visitorId" TEXT,
  "sessionId" TEXT,
  "touchId" TEXT,
  "name" VARCHAR(128) NOT NULL,
  "properties" JSONB NOT NULL DEFAULT '{}',
  "internalCampaignId" TEXT,
  "landingPagePath" VARCHAR(512),
  "sourceId" TEXT,
  "medium" VARCHAR(64),
  "clientOccurredAt" TIMESTAMP(3) NOT NULL,
  "serverReceivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketingEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MarketingEvent_idempotencyKey_key" ON "MarketingEvent"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "MarketingEvent_name_clientOccurredAt_idx" ON "MarketingEvent"("name", "clientOccurredAt");
CREATE INDEX IF NOT EXISTS "MarketingEvent_visitorId_clientOccurredAt_idx" ON "MarketingEvent"("visitorId", "clientOccurredAt");
CREATE INDEX IF NOT EXISTS "MarketingEvent_internalCampaignId_idx" ON "MarketingEvent"("internalCampaignId");
CREATE INDEX IF NOT EXISTS "MarketingEvent_sourceId_idx" ON "MarketingEvent"("sourceId");

CREATE TABLE IF NOT EXISTS "MarketingConversion" (
  "id" TEXT NOT NULL,
  "idempotencyKey" VARCHAR(191) NOT NULL,
  "visitorId" TEXT,
  "sessionId" TEXT,
  "touchId" TEXT,
  "internalCampaignId" TEXT,
  "externalAdId" TEXT,
  "landingPagePath" VARCHAR(512),
  "sourceId" TEXT,
  "leadId" VARCHAR(64),
  "submissionId" VARCHAR(64),
  "conversionDefinitionId" TEXT NOT NULL,
  "clientOccurredAt" TIMESTAMP(3) NOT NULL,
  "serverReceivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketingConversion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MarketingConversion_idempotencyKey_key" ON "MarketingConversion"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "MarketingConversion_conversionDefinitionId_clientOccurredAt_idx" ON "MarketingConversion"("conversionDefinitionId", "clientOccurredAt");
CREATE INDEX IF NOT EXISTS "MarketingConversion_internalCampaignId_idx" ON "MarketingConversion"("internalCampaignId");
CREATE INDEX IF NOT EXISTS "MarketingConversion_sourceId_idx" ON "MarketingConversion"("sourceId");
CREATE INDEX IF NOT EXISTS "MarketingConversion_leadId_idx" ON "MarketingConversion"("leadId");
CREATE INDEX IF NOT EXISTS "MarketingConversion_submissionId_idx" ON "MarketingConversion"("submissionId");

CREATE TABLE IF NOT EXISTS "MarketingLeadAttribution" (
  "id" TEXT NOT NULL,
  "submissionId" VARCHAR(64),
  "inquiryId" VARCHAR(64),
  "leadEventId" TEXT,
  "visitorId" VARCHAR(64),
  "sessionId" VARCHAR(64),
  "firstTouchId" TEXT,
  "lastTouchId" TEXT,
  "sourceId" TEXT,
  "internalCampaignId" TEXT,
  "externalAdId" VARCHAR(64),
  "landingPagePath" VARCHAR(512),
  "utmSource" VARCHAR(128),
  "utmMedium" VARCHAR(128),
  "utmCampaign" VARCHAR(256),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketingLeadAttribution_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MarketingLeadAttribution_submissionId_idx" ON "MarketingLeadAttribution"("submissionId");
CREATE INDEX IF NOT EXISTS "MarketingLeadAttribution_inquiryId_idx" ON "MarketingLeadAttribution"("inquiryId");
CREATE INDEX IF NOT EXISTS "MarketingLeadAttribution_internalCampaignId_idx" ON "MarketingLeadAttribution"("internalCampaignId");
CREATE INDEX IF NOT EXISTS "MarketingLeadAttribution_sourceId_idx" ON "MarketingLeadAttribution"("sourceId");

CREATE TABLE IF NOT EXISTS "MarketingMetricRollup" (
  "id" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "granularity" VARCHAR(16) NOT NULL DEFAULT 'day',
  "internalCampaignId" TEXT,
  "sourceId" VARCHAR(64),
  "providerId" VARCHAR(64),
  "landingPagePath" VARCHAR(512),
  "conversionType" VARCHAR(64),
  "trafficType" VARCHAR(32),
  "visitors" INTEGER NOT NULL DEFAULT 0,
  "sessions" INTEGER NOT NULL DEFAULT 0,
  "pageViews" INTEGER NOT NULL DEFAULT 0,
  "leads" INTEGER NOT NULL DEFAULT 0,
  "conversions" INTEGER NOT NULL DEFAULT 0,
  "spend" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "impressions" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "clicks" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketingMetricRollup_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MarketingMetricRollup_periodStart_periodEnd_granularity_internalCampaignId_sourceId_providerId_landingPagePath_conversionType_trafficType_key" ON "MarketingMetricRollup"("periodStart", "periodEnd", "granularity", "internalCampaignId", "sourceId", "providerId", "landingPagePath", "conversionType", "trafficType");
CREATE INDEX IF NOT EXISTS "MarketingMetricRollup_periodStart_granularity_idx" ON "MarketingMetricRollup"("periodStart", "granularity");
CREATE INDEX IF NOT EXISTS "MarketingMetricRollup_internalCampaignId_periodStart_idx" ON "MarketingMetricRollup"("internalCampaignId", "periodStart");

CREATE TABLE IF NOT EXISTS "MarketingAutomationRule" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(256) NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "triggerType" VARCHAR(64) NOT NULL,
  "conditions" JSONB NOT NULL DEFAULT '{}',
  "actions" JSONB NOT NULL DEFAULT '[]',
  "lastRunAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketingAutomationRule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MarketingAutomationRule_enabled_triggerType_idx" ON "MarketingAutomationRule"("enabled", "triggerType");

CREATE TABLE IF NOT EXISTS "MarketingAutomationExecution" (
  "id" TEXT NOT NULL,
  "ruleId" TEXT NOT NULL,
  "status" VARCHAR(32) NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "result" JSONB NOT NULL DEFAULT '{}',
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketingAutomationExecution_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MarketingAutomationExecution_ruleId_createdAt_idx" ON "MarketingAutomationExecution"("ruleId", "createdAt");

CREATE TABLE IF NOT EXISTS "MarketingRetentionPolicy" (
  "id" TEXT NOT NULL,
  "visitorDays" INTEGER NOT NULL DEFAULT 365,
  "sessionDays" INTEGER NOT NULL DEFAULT 180,
  "touchDays" INTEGER NOT NULL DEFAULT 365,
  "eventDays" INTEGER NOT NULL DEFAULT 365,
  "leadDays" INTEGER NOT NULL DEFAULT 730,
  "providerPayloadDays" INTEGER NOT NULL DEFAULT 90,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketingRetentionPolicy_pkey" PRIMARY KEY ("id")
);

-- Foreign keys (best-effort; ignore if already present)
DO $$ BEGIN
  ALTER TABLE "MarketingCampaign" ADD CONSTRAINT "MarketingCampaign_conversionGoalId_fkey" FOREIGN KEY ("conversionGoalId") REFERENCES "MarketingConversionDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MarketingCampaignProviderBinding" ADD CONSTRAINT "MarketingCampaignProviderBinding_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "MarketingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MarketingCampaignProviderBinding" ADD CONSTRAINT "MarketingCampaignProviderBinding_adAccountId_fkey" FOREIGN KEY ("adAccountId") REFERENCES "MarketingAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MarketingExternalCampaign" ADD CONSTRAINT "MarketingExternalCampaign_adAccountId_fkey" FOREIGN KEY ("adAccountId") REFERENCES "MarketingAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MarketingExternalCampaign" ADD CONSTRAINT "MarketingExternalCampaign_providerBindingId_fkey" FOREIGN KEY ("providerBindingId") REFERENCES "MarketingCampaignProviderBinding"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MarketingAdGroup" ADD CONSTRAINT "MarketingAdGroup_externalCampaignId_fkey" FOREIGN KEY ("externalCampaignId") REFERENCES "MarketingExternalCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MarketingAd" ADD CONSTRAINT "MarketingAd_adGroupId_fkey" FOREIGN KEY ("adGroupId") REFERENCES "MarketingAdGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MarketingCreative" ADD CONSTRAINT "MarketingCreative_adId_fkey" FOREIGN KEY ("adId") REFERENCES "MarketingAd"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MarketingTrackingUrl" ADD CONSTRAINT "MarketingTrackingUrl_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "MarketingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MarketingTrackingUrl" ADD CONSTRAINT "MarketingTrackingUrl_providerBindingId_fkey" FOREIGN KEY ("providerBindingId") REFERENCES "MarketingCampaignProviderBinding"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MarketingTrackingUrl" ADD CONSTRAINT "MarketingTrackingUrl_externalAdId_fkey" FOREIGN KEY ("externalAdId") REFERENCES "MarketingAd"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MarketingSession" ADD CONSTRAINT "MarketingSession_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "MarketingVisitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MarketingTouch" ADD CONSTRAINT "MarketingTouch_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "MarketingVisitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MarketingTouch" ADD CONSTRAINT "MarketingTouch_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "MarketingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MarketingTouch" ADD CONSTRAINT "MarketingTouch_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "MarketingSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MarketingTouch" ADD CONSTRAINT "MarketingTouch_internalCampaignId_fkey" FOREIGN KEY ("internalCampaignId") REFERENCES "MarketingCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MarketingTouch" ADD CONSTRAINT "MarketingTouch_externalAdId_fkey" FOREIGN KEY ("externalAdId") REFERENCES "MarketingAd"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MarketingEvent" ADD CONSTRAINT "MarketingEvent_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "MarketingVisitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MarketingEvent" ADD CONSTRAINT "MarketingEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "MarketingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MarketingEvent" ADD CONSTRAINT "MarketingEvent_touchId_fkey" FOREIGN KEY ("touchId") REFERENCES "MarketingTouch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MarketingEvent" ADD CONSTRAINT "MarketingEvent_internalCampaignId_fkey" FOREIGN KEY ("internalCampaignId") REFERENCES "MarketingCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MarketingEvent" ADD CONSTRAINT "MarketingEvent_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "MarketingSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MarketingConversion" ADD CONSTRAINT "MarketingConversion_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "MarketingVisitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MarketingConversion" ADD CONSTRAINT "MarketingConversion_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "MarketingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MarketingConversion" ADD CONSTRAINT "MarketingConversion_touchId_fkey" FOREIGN KEY ("touchId") REFERENCES "MarketingTouch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MarketingConversion" ADD CONSTRAINT "MarketingConversion_internalCampaignId_fkey" FOREIGN KEY ("internalCampaignId") REFERENCES "MarketingCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MarketingConversion" ADD CONSTRAINT "MarketingConversion_externalAdId_fkey" FOREIGN KEY ("externalAdId") REFERENCES "MarketingAd"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MarketingConversion" ADD CONSTRAINT "MarketingConversion_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "MarketingSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MarketingConversion" ADD CONSTRAINT "MarketingConversion_conversionDefinitionId_fkey" FOREIGN KEY ("conversionDefinitionId") REFERENCES "MarketingConversionDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MarketingLeadAttribution" ADD CONSTRAINT "MarketingLeadAttribution_firstTouchId_fkey" FOREIGN KEY ("firstTouchId") REFERENCES "MarketingTouch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MarketingLeadAttribution" ADD CONSTRAINT "MarketingLeadAttribution_lastTouchId_fkey" FOREIGN KEY ("lastTouchId") REFERENCES "MarketingTouch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MarketingLeadAttribution" ADD CONSTRAINT "MarketingLeadAttribution_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "MarketingSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MarketingLeadAttribution" ADD CONSTRAINT "MarketingLeadAttribution_internalCampaignId_fkey" FOREIGN KEY ("internalCampaignId") REFERENCES "MarketingCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MarketingMetricRollup" ADD CONSTRAINT "MarketingMetricRollup_internalCampaignId_fkey" FOREIGN KEY ("internalCampaignId") REFERENCES "MarketingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MarketingAutomationExecution" ADD CONSTRAINT "MarketingAutomationExecution_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "MarketingAutomationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed marketing sources
INSERT INTO "MarketingSource" ("id", "key", "label", "category", "sortOrder", "createdAt", "updatedAt")
VALUES
  ('msrc_meta_ads', 'meta_ads', 'Meta Ads', 'paid', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('msrc_google_ads', 'google_ads', 'Google Ads', 'paid', 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('msrc_linkedin_ads', 'linkedin_ads', 'LinkedIn Ads', 'paid', 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('msrc_instagram_ads', 'instagram_ads', 'Instagram Ads', 'paid', 40, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('msrc_organic_search', 'organic_search', 'Organic Search', 'organic', 50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('msrc_direct', 'direct', 'Direct', 'direct', 60, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('msrc_referral', 'referral', 'Referral', 'referral', 70, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('msrc_email', 'email', 'Email', 'email', 80, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('msrc_social_organic', 'social_organic', 'Organic Social', 'social', 90, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('msrc_qr', 'qr', 'QR Code', 'offline', 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('msrc_campaign_url', 'campaign_url', 'Campaign URL', 'campaign', 110, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('msrc_other', 'other', 'Other', 'other', 120, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

-- Seed default conversion definitions
INSERT INTO "MarketingConversionDefinition" ("id", "key", "name", "description", "triggerType", "triggerConfig", "enabled", "createdAt", "updatedAt")
VALUES
  ('mcd_form_submit', 'form_submit', 'Form Submission', 'Any form submission', 'form_submit', '{}', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mcd_contact_request', 'contact_request', 'Contact Request', 'Contact / inquiry form', 'inquiry', '{"type":"GENERAL"}', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mcd_rfq', 'rfq', 'RFQ / Quote Request', 'Quote request form', 'form_submit', '{"category":"quote"}', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mcd_newsletter', 'newsletter', 'Newsletter Signup', 'Newsletter subscription', 'newsletter', '{}', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

-- Default retention policy
INSERT INTO "MarketingRetentionPolicy" ("id", "visitorDays", "sessionDays", "touchDays", "eventDays", "leadDays", "providerPayloadDays", "createdAt", "updatedAt")
SELECT 'mrp_default', 365, 180, 365, 365, 730, 90, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "MarketingRetentionPolicy" LIMIT 1);
