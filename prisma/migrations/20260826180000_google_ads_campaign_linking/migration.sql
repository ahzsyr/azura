-- Google Ads campaign linking scoreboard: binding join key + sync state

ALTER TABLE "MarketingCampaignProviderBinding" ADD COLUMN IF NOT EXISTS "lastMetricsSyncAt" TIMESTAMP(3);
ALTER TABLE "MarketingCampaignProviderBinding" ADD COLUMN IF NOT EXISTS "lastSyncError" TEXT;

ALTER TABLE "MarketingTouch" ADD COLUMN IF NOT EXISTS "providerBindingId" TEXT;
CREATE INDEX IF NOT EXISTS "MarketingTouch_providerBindingId_idx" ON "MarketingTouch"("providerBindingId");

ALTER TABLE "MarketingLeadAttribution" ADD COLUMN IF NOT EXISTS "providerBindingId" TEXT;
CREATE INDEX IF NOT EXISTS "MarketingLeadAttribution_providerBindingId_idx" ON "MarketingLeadAttribution"("providerBindingId");

ALTER TABLE "MarketingMetricRollup" ADD COLUMN IF NOT EXISTS "providerBindingId" TEXT;
CREATE INDEX IF NOT EXISTS "MarketingMetricRollup_providerBindingId_periodStart_idx" ON "MarketingMetricRollup"("providerBindingId", "periodStart");

-- Replace unique index to include providerBindingId
DROP INDEX IF EXISTS "MarketingMetricRollup_periodStart_periodEnd_granularity_internalCampaignId_sourceId_providerId_landingPagePath_conversionType_trafficType_key";
CREATE UNIQUE INDEX IF NOT EXISTS "MarketingMetricRollup_period_dims_binding_key"
  ON "MarketingMetricRollup"("periodStart", "periodEnd", "granularity", "internalCampaignId", "sourceId", "providerId", "providerBindingId", "landingPagePath", "conversionType", "trafficType");

DO $$ BEGIN
  ALTER TABLE "MarketingTouch"
    ADD CONSTRAINT "MarketingTouch_providerBindingId_fkey"
    FOREIGN KEY ("providerBindingId") REFERENCES "MarketingCampaignProviderBinding"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MarketingLeadAttribution"
    ADD CONSTRAINT "MarketingLeadAttribution_providerBindingId_fkey"
    FOREIGN KEY ("providerBindingId") REFERENCES "MarketingCampaignProviderBinding"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MarketingMetricRollup"
    ADD CONSTRAINT "MarketingMetricRollup_providerBindingId_fkey"
    FOREIGN KEY ("providerBindingId") REFERENCES "MarketingCampaignProviderBinding"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
