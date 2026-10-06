-- Google Ads campaign linking scoreboard: binding join key + sync state

ALTER TABLE `MarketingCampaignProviderBinding` ADD COLUMN `lastMetricsSyncAt` DATETIME(3) NULL;
ALTER TABLE `MarketingCampaignProviderBinding` ADD COLUMN `lastSyncError` TEXT NULL;

ALTER TABLE `MarketingTouch` ADD COLUMN `providerBindingId` VARCHAR(191) NULL;
CREATE INDEX `MarketingTouch_providerBindingId_idx` ON `MarketingTouch`(`providerBindingId`);

ALTER TABLE `MarketingLeadAttribution` ADD COLUMN `providerBindingId` VARCHAR(191) NULL;
CREATE INDEX `MarketingLeadAttribution_providerBindingId_idx` ON `MarketingLeadAttribution`(`providerBindingId`);

ALTER TABLE `MarketingMetricRollup` ADD COLUMN `providerBindingId` VARCHAR(64) NULL;
CREATE INDEX `MarketingMetricRollup_providerBindingId_periodStart_idx` ON `MarketingMetricRollup`(`providerBindingId`, `periodStart`);

-- Replace unique index to include providerBindingId
DROP INDEX `MktMetricRollup_period_dims_uq` ON `MarketingMetricRollup`;
CREATE UNIQUE INDEX `MarketingMetricRollup_period_dims_key` ON `MarketingMetricRollup`(`periodStart`, `periodEnd`, `granularity`, `internalCampaignId`, `sourceId`, `providerId`, `providerBindingId`, `landingPagePath`, `conversionType`, `trafficType`);

ALTER TABLE `MarketingTouch` ADD CONSTRAINT `MarketingTouch_providerBindingId_fkey` FOREIGN KEY (`providerBindingId`) REFERENCES `MarketingCampaignProviderBinding`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `MarketingLeadAttribution` ADD CONSTRAINT `MarketingLeadAttribution_providerBindingId_fkey` FOREIGN KEY (`providerBindingId`) REFERENCES `MarketingCampaignProviderBinding`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `MarketingMetricRollup` ADD CONSTRAINT `MarketingMetricRollup_providerBindingId_fkey` FOREIGN KEY (`providerBindingId`) REFERENCES `MarketingCampaignProviderBinding`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
