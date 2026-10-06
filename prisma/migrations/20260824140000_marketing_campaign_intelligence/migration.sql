-- Marketing Campaign Intelligence Platform (MySQL 8.4)

-- Extend MarketingAccount
ALTER TABLE `MarketingAccount` ADD COLUMN `currency` VARCHAR(8) NULL;
ALTER TABLE `MarketingAccount` ADD COLUMN `spend` DOUBLE NOT NULL DEFAULT 0;
ALTER TABLE `MarketingAccount` ADD COLUMN `impressions` DOUBLE NOT NULL DEFAULT 0;
ALTER TABLE `MarketingAccount` ADD COLUMN `clicks` DOUBLE NOT NULL DEFAULT 0;
ALTER TABLE `MarketingAccount` ADD COLUMN `conversions` DOUBLE NOT NULL DEFAULT 0;
ALTER TABLE `MarketingAccount` ADD COLUMN `lastSyncAt` DATETIME(3) NULL;

-- Inquiry attribution
ALTER TABLE `Inquiry` ADD COLUMN `marketingCampaignId` VARCHAR(64) NULL;
ALTER TABLE `Inquiry` ADD COLUMN `attributionTouchId` VARCHAR(64) NULL;
ALTER TABLE `Inquiry` ADD COLUMN `attributionSourceId` VARCHAR(64) NULL;
CREATE INDEX `Inquiry_marketingCampaignId_idx` ON `Inquiry`(`marketingCampaignId`);

CREATE TABLE IF NOT EXISTS `MarketingSource` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(64) NOT NULL,
    `label` VARCHAR(128) NOT NULL,
    `category` VARCHAR(32) NOT NULL DEFAULT 'other',
    `sortOrder` INT NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MarketingSource_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `MarketingConversionDefinition` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(64) NOT NULL,
    `name` VARCHAR(128) NOT NULL,
    `description` TEXT NULL,
    `triggerType` VARCHAR(64) NOT NULL,
    `triggerConfig` JSON NOT NULL DEFAULT ('{}'),
    `value` DOUBLE NULL,
    `currency` VARCHAR(8) NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MarketingConversionDefinition_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `MarketingCampaign` (
    `id` VARCHAR(191) NOT NULL,
    `internalId` VARCHAR(64) NOT NULL,
    `name` VARCHAR(256) NOT NULL,
    `objective` VARCHAR(128) NULL,
    `channel` VARCHAR(64) NULL,
    `status` ENUM('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `budget` DOUBLE NULL,
    `budgetCurrency` VARCHAR(8) NULL,
    `targetAudience` TEXT NULL,
    `targetLocation` VARCHAR(256) NULL,
    `landingPagePath` VARCHAR(512) NULL,
    `conversionGoalId` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MarketingCampaign_internalId_key`(`internalId`),
    INDEX `MarketingCampaign_status_idx`(`status`),
    INDEX `MarketingCampaign_startDate_endDate_idx`(`startDate`, `endDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `MarketingCampaignProviderBinding` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(64) NOT NULL,
    `adAccountId` VARCHAR(191) NULL,
    `externalCampaignId` VARCHAR(128) NULL,
    `externalCampaignName` VARCHAR(256) NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'linked',
    `syncStatus` VARCHAR(32) NOT NULL DEFAULT 'idle',
    `lastSyncAt` DATETIME(3) NULL,
    `providerMetadata` JSON NOT NULL DEFAULT ('{}'),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MktCampaignProvBind_uniq`(`campaignId`, `providerId`, `externalCampaignId`),
    INDEX `MarketingCampaignProviderBinding_providerId_idx`(`providerId`),
    INDEX `MarketingCampaignProviderBinding_adAccountId_idx`(`adAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `MarketingExternalCampaign` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(64) NOT NULL,
    `externalId` VARCHAR(128) NOT NULL,
    `providerEntityType` VARCHAR(64) NOT NULL DEFAULT 'campaign',
    `name` VARCHAR(256) NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'unknown',
    `adAccountId` VARCHAR(191) NULL,
    `providerBindingId` VARCHAR(191) NULL,
    `providerMetadata` JSON NOT NULL DEFAULT ('{}'),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MarketingExternalCampaign_providerId_externalId_key`(`providerId`, `externalId`),
    INDEX `MarketingExternalCampaign_adAccountId_idx`(`adAccountId`),
    INDEX `MarketingExternalCampaign_providerBindingId_idx`(`providerBindingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `MarketingAdGroup` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(64) NOT NULL,
    `externalId` VARCHAR(128) NOT NULL,
    `providerEntityType` VARCHAR(64) NOT NULL DEFAULT 'ad_group',
    `name` VARCHAR(256) NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'unknown',
    `externalCampaignId` VARCHAR(191) NOT NULL,
    `providerMetadata` JSON NOT NULL DEFAULT ('{}'),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MarketingAdGroup_providerId_externalId_key`(`providerId`, `externalId`),
    INDEX `MarketingAdGroup_externalCampaignId_idx`(`externalCampaignId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `MarketingAd` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(64) NOT NULL,
    `externalId` VARCHAR(128) NOT NULL,
    `providerEntityType` VARCHAR(64) NOT NULL DEFAULT 'ad',
    `name` VARCHAR(256) NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'unknown',
    `adGroupId` VARCHAR(191) NOT NULL,
    `providerMetadata` JSON NOT NULL DEFAULT ('{}'),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MarketingAd_providerId_externalId_key`(`providerId`, `externalId`),
    INDEX `MarketingAd_adGroupId_idx`(`adGroupId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `MarketingCreative` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(64) NOT NULL,
    `externalId` VARCHAR(128) NOT NULL,
    `providerEntityType` VARCHAR(64) NOT NULL DEFAULT 'creative',
    `name` VARCHAR(256) NULL,
    `creativeType` VARCHAR(64) NULL,
    `headline` VARCHAR(512) NULL,
    `body` TEXT NULL,
    `previewUrl` TEXT NULL,
    `adId` VARCHAR(191) NOT NULL,
    `providerMetadata` JSON NOT NULL DEFAULT ('{}'),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MarketingCreative_providerId_externalId_key`(`providerId`, `externalId`),
    INDEX `MarketingCreative_adId_idx`(`adId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `MarketingTrackingUrl` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `providerBindingId` VARCHAR(191) NULL,
    `externalAdId` VARCHAR(191) NULL,
    `baseUrl` TEXT NOT NULL,
    `utmSource` VARCHAR(128) NULL,
    `utmMedium` VARCHAR(128) NULL,
    `utmCampaign` VARCHAR(256) NULL,
    `utmContent` VARCHAR(256) NULL,
    `utmTerm` VARCHAR(256) NULL,
    `fullUrl` TEXT NOT NULL,
    `qrAssetRef` TEXT NULL,
    `label` VARCHAR(256) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MarketingTrackingUrl_campaignId_idx`(`campaignId`),
    INDEX `MarketingTrackingUrl_utmCampaign_idx`(`utmCampaign`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `MarketingVisitor` (
    `id` VARCHAR(191) NOT NULL,
    `visitorToken` VARCHAR(64) NOT NULL,
    `consentStatus` ENUM('UNKNOWN', 'GRANTED', 'DENIED', 'WITHDRAWN') NOT NULL DEFAULT 'UNKNOWN',
    `consentGrantedAt` DATETIME(3) NULL,
    `firstSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MarketingVisitor_visitorToken_key`(`visitorToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `MarketingSession` (
    `id` VARCHAR(191) NOT NULL,
    `visitorId` VARCHAR(191) NOT NULL,
    `sessionToken` VARCHAR(64) NOT NULL,
    `entryUrl` TEXT NULL,
    `landingPagePath` VARCHAR(512) NULL,
    `referrer` TEXT NULL,
    `deviceType` VARCHAR(32) NULL,
    `browser` VARCHAR(64) NULL,
    `os` VARCHAR(64) NULL,
    `country` VARCHAR(64) NULL,
    `region` VARCHAR(64) NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MarketingSession_sessionToken_key`(`sessionToken`),
    INDEX `MarketingSession_visitorId_startedAt_idx`(`visitorId`, `startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `MarketingTouch` (
    `id` VARCHAR(191) NOT NULL,
    `visitorId` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `sourceId` VARCHAR(191) NULL,
    `medium` VARCHAR(64) NULL,
    `internalCampaignId` VARCHAR(191) NULL,
    `externalAdId` VARCHAR(191) NULL,
    `landingPagePath` VARCHAR(512) NULL,
    `referrer` TEXT NULL,
    `utmSource` VARCHAR(128) NULL,
    `utmMedium` VARCHAR(128) NULL,
    `utmCampaign` VARCHAR(256) NULL,
    `utmContent` VARCHAR(256) NULL,
    `utmTerm` VARCHAR(256) NULL,
    `touchType` ENUM('FIRST_TOUCH', 'SESSION_START', 'PAID_CLICK', 'ORGANIC_SEARCH', 'REFERRAL', 'EMAIL', 'SOCIAL_ORGANIC', 'DIRECT', 'CAMPAIGN_URL', 'CONVERSION_TOUCH') NOT NULL DEFAULT 'DIRECT',
    `clickIdType` ENUM('GCLID', 'FBCLID', 'MSCLKID', 'LI_FAT_ID', 'OTHER') NULL,
    `clickId` VARCHAR(256) NULL,
    `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `providerMetadata` JSON NOT NULL DEFAULT ('{}'),
    `rawPayload` JSON NOT NULL DEFAULT ('{}'),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MarketingTouch_visitorId_occurredAt_idx`(`visitorId`, `occurredAt`),
    INDEX `MarketingTouch_sessionId_occurredAt_idx`(`sessionId`, `occurredAt`),
    INDEX `MarketingTouch_sourceId_idx`(`sourceId`),
    INDEX `MarketingTouch_internalCampaignId_idx`(`internalCampaignId`),
    INDEX `MarketingTouch_touchType_idx`(`touchType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `MarketingEvent` (
    `id` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(128) NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `visitorId` VARCHAR(191) NULL,
    `sessionId` VARCHAR(191) NULL,
    `touchId` VARCHAR(191) NULL,
    `name` VARCHAR(128) NOT NULL,
    `properties` JSON NOT NULL DEFAULT ('{}'),
    `internalCampaignId` VARCHAR(191) NULL,
    `landingPagePath` VARCHAR(512) NULL,
    `sourceId` VARCHAR(191) NULL,
    `medium` VARCHAR(64) NULL,
    `clientOccurredAt` DATETIME(3) NOT NULL,
    `serverReceivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `MarketingEvent_idempotencyKey_key`(`idempotencyKey`),
    INDEX `MarketingEvent_name_clientOccurredAt_idx`(`name`, `clientOccurredAt`),
    INDEX `MarketingEvent_visitorId_clientOccurredAt_idx`(`visitorId`, `clientOccurredAt`),
    INDEX `MarketingEvent_internalCampaignId_idx`(`internalCampaignId`),
    INDEX `MarketingEvent_sourceId_idx`(`sourceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `MarketingConversion` (
    `id` VARCHAR(191) NOT NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `visitorId` VARCHAR(191) NULL,
    `sessionId` VARCHAR(191) NULL,
    `touchId` VARCHAR(191) NULL,
    `internalCampaignId` VARCHAR(191) NULL,
    `externalAdId` VARCHAR(191) NULL,
    `landingPagePath` VARCHAR(512) NULL,
    `sourceId` VARCHAR(191) NULL,
    `leadId` VARCHAR(64) NULL,
    `submissionId` VARCHAR(64) NULL,
    `conversionDefinitionId` VARCHAR(191) NOT NULL,
    `clientOccurredAt` DATETIME(3) NOT NULL,
    `serverReceivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `metadata` JSON NOT NULL DEFAULT ('{}'),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `MarketingConversion_idempotencyKey_key`(`idempotencyKey`),
    INDEX `MarketingConversion_conversionDefinitionId_clientOccurredAt_idx`(`conversionDefinitionId`, `clientOccurredAt`),
    INDEX `MarketingConversion_internalCampaignId_idx`(`internalCampaignId`),
    INDEX `MarketingConversion_sourceId_idx`(`sourceId`),
    INDEX `MarketingConversion_leadId_idx`(`leadId`),
    INDEX `MarketingConversion_submissionId_idx`(`submissionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `MarketingLeadAttribution` (
    `id` VARCHAR(191) NOT NULL,
    `submissionId` VARCHAR(64) NULL,
    `inquiryId` VARCHAR(64) NULL,
    `leadEventId` VARCHAR(191) NULL,
    `visitorId` VARCHAR(64) NULL,
    `sessionId` VARCHAR(64) NULL,
    `firstTouchId` VARCHAR(191) NULL,
    `lastTouchId` VARCHAR(191) NULL,
    `sourceId` VARCHAR(191) NULL,
    `internalCampaignId` VARCHAR(191) NULL,
    `externalAdId` VARCHAR(64) NULL,
    `landingPagePath` VARCHAR(512) NULL,
    `utmSource` VARCHAR(128) NULL,
    `utmMedium` VARCHAR(128) NULL,
    `utmCampaign` VARCHAR(256) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MarketingLeadAttribution_submissionId_idx`(`submissionId`),
    INDEX `MarketingLeadAttribution_inquiryId_idx`(`inquiryId`),
    INDEX `MarketingLeadAttribution_internalCampaignId_idx`(`internalCampaignId`),
    INDEX `MarketingLeadAttribution_sourceId_idx`(`sourceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `MarketingMetricRollup` (
    `id` VARCHAR(191) NOT NULL,
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `granularity` VARCHAR(16) NOT NULL DEFAULT 'day',
    `internalCampaignId` VARCHAR(64) NULL,
    `sourceId` VARCHAR(64) NULL,
    `providerId` VARCHAR(64) NULL,
    `landingPagePath` VARCHAR(191) NULL,
    `conversionType` VARCHAR(64) NULL,
    `trafficType` VARCHAR(32) NULL,
    `visitors` INT NOT NULL DEFAULT 0,
    `sessions` INT NOT NULL DEFAULT 0,
    `pageViews` INT NOT NULL DEFAULT 0,
    `leads` INT NOT NULL DEFAULT 0,
    `conversions` INT NOT NULL DEFAULT 0,
    `spend` DOUBLE NOT NULL DEFAULT 0,
    `impressions` DOUBLE NOT NULL DEFAULT 0,
    `clicks` DOUBLE NOT NULL DEFAULT 0,
    `metadata` JSON NOT NULL DEFAULT ('{}'),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MktMetricRollup_period_dims_uq`(`periodStart`, `periodEnd`, `granularity`, `internalCampaignId`, `sourceId`, `providerId`, `landingPagePath`, `conversionType`, `trafficType`),
    INDEX `MarketingMetricRollup_periodStart_granularity_idx`(`periodStart`, `granularity`),
    INDEX `MarketingMetricRollup_internalCampaignId_periodStart_idx`(`internalCampaignId`, `periodStart`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `MarketingAutomationRule` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(256) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `triggerType` VARCHAR(64) NOT NULL,
    `conditions` JSON NOT NULL DEFAULT ('{}'),
    `actions` JSON NOT NULL DEFAULT ('[]'),
    `lastRunAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MarketingAutomationRule_enabled_triggerType_idx`(`enabled`, `triggerType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `MarketingAutomationExecution` (
    `id` VARCHAR(191) NOT NULL,
    `ruleId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(32) NOT NULL,
    `payload` JSON NOT NULL DEFAULT ('{}'),
    `result` JSON NOT NULL DEFAULT ('{}'),
    `error` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MarketingAutomationExecution_ruleId_createdAt_idx`(`ruleId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `MarketingRetentionPolicy` (
    `id` VARCHAR(191) NOT NULL,
    `visitorDays` INT NOT NULL DEFAULT 365,
    `sessionDays` INT NOT NULL DEFAULT 180,
    `touchDays` INT NOT NULL DEFAULT 365,
    `eventDays` INT NOT NULL DEFAULT 365,
    `leadDays` INT NOT NULL DEFAULT 730,
    `providerPayloadDays` INT NOT NULL DEFAULT 90,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `MarketingCampaign` ADD CONSTRAINT `MarketingCampaign_conversionGoalId_fkey` FOREIGN KEY (`conversionGoalId`) REFERENCES `MarketingConversionDefinition`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `MarketingCampaignProviderBinding` ADD CONSTRAINT `MarketingCampaignProviderBinding_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `MarketingCampaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `MarketingCampaignProviderBinding` ADD CONSTRAINT `MarketingCampaignProviderBinding_adAccountId_fkey` FOREIGN KEY (`adAccountId`) REFERENCES `MarketingAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `MarketingExternalCampaign` ADD CONSTRAINT `MarketingExternalCampaign_adAccountId_fkey` FOREIGN KEY (`adAccountId`) REFERENCES `MarketingAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `MarketingExternalCampaign` ADD CONSTRAINT `MarketingExternalCampaign_providerBindingId_fkey` FOREIGN KEY (`providerBindingId`) REFERENCES `MarketingCampaignProviderBinding`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `MarketingAdGroup` ADD CONSTRAINT `MarketingAdGroup_externalCampaignId_fkey` FOREIGN KEY (`externalCampaignId`) REFERENCES `MarketingExternalCampaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `MarketingAd` ADD CONSTRAINT `MarketingAd_adGroupId_fkey` FOREIGN KEY (`adGroupId`) REFERENCES `MarketingAdGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `MarketingCreative` ADD CONSTRAINT `MarketingCreative_adId_fkey` FOREIGN KEY (`adId`) REFERENCES `MarketingAd`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `MarketingTrackingUrl` ADD CONSTRAINT `MarketingTrackingUrl_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `MarketingCampaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `MarketingTrackingUrl` ADD CONSTRAINT `MarketingTrackingUrl_providerBindingId_fkey` FOREIGN KEY (`providerBindingId`) REFERENCES `MarketingCampaignProviderBinding`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `MarketingTrackingUrl` ADD CONSTRAINT `MarketingTrackingUrl_externalAdId_fkey` FOREIGN KEY (`externalAdId`) REFERENCES `MarketingAd`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `MarketingSession` ADD CONSTRAINT `MarketingSession_visitorId_fkey` FOREIGN KEY (`visitorId`) REFERENCES `MarketingVisitor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `MarketingTouch` ADD CONSTRAINT `MarketingTouch_visitorId_fkey` FOREIGN KEY (`visitorId`) REFERENCES `MarketingVisitor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `MarketingTouch` ADD CONSTRAINT `MarketingTouch_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `MarketingSession`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `MarketingTouch` ADD CONSTRAINT `MarketingTouch_sourceId_fkey` FOREIGN KEY (`sourceId`) REFERENCES `MarketingSource`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `MarketingTouch` ADD CONSTRAINT `MarketingTouch_internalCampaignId_fkey` FOREIGN KEY (`internalCampaignId`) REFERENCES `MarketingCampaign`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `MarketingTouch` ADD CONSTRAINT `MarketingTouch_externalAdId_fkey` FOREIGN KEY (`externalAdId`) REFERENCES `MarketingAd`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `MarketingEvent` ADD CONSTRAINT `MarketingEvent_visitorId_fkey` FOREIGN KEY (`visitorId`) REFERENCES `MarketingVisitor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `MarketingEvent` ADD CONSTRAINT `MarketingEvent_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `MarketingSession`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `MarketingEvent` ADD CONSTRAINT `MarketingEvent_touchId_fkey` FOREIGN KEY (`touchId`) REFERENCES `MarketingTouch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `MarketingEvent` ADD CONSTRAINT `MarketingEvent_internalCampaignId_fkey` FOREIGN KEY (`internalCampaignId`) REFERENCES `MarketingCampaign`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `MarketingEvent` ADD CONSTRAINT `MarketingEvent_sourceId_fkey` FOREIGN KEY (`sourceId`) REFERENCES `MarketingSource`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `MarketingConversion` ADD CONSTRAINT `MarketingConversion_visitorId_fkey` FOREIGN KEY (`visitorId`) REFERENCES `MarketingVisitor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `MarketingConversion` ADD CONSTRAINT `MarketingConversion_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `MarketingSession`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `MarketingConversion` ADD CONSTRAINT `MarketingConversion_touchId_fkey` FOREIGN KEY (`touchId`) REFERENCES `MarketingTouch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `MarketingConversion` ADD CONSTRAINT `MarketingConversion_internalCampaignId_fkey` FOREIGN KEY (`internalCampaignId`) REFERENCES `MarketingCampaign`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `MarketingConversion` ADD CONSTRAINT `MarketingConversion_externalAdId_fkey` FOREIGN KEY (`externalAdId`) REFERENCES `MarketingAd`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `MarketingConversion` ADD CONSTRAINT `MarketingConversion_sourceId_fkey` FOREIGN KEY (`sourceId`) REFERENCES `MarketingSource`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `MarketingConversion` ADD CONSTRAINT `MarketingConversion_conversionDefinitionId_fkey` FOREIGN KEY (`conversionDefinitionId`) REFERENCES `MarketingConversionDefinition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `MarketingLeadAttribution` ADD CONSTRAINT `MarketingLeadAttribution_firstTouchId_fkey` FOREIGN KEY (`firstTouchId`) REFERENCES `MarketingTouch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `MarketingLeadAttribution` ADD CONSTRAINT `MarketingLeadAttribution_lastTouchId_fkey` FOREIGN KEY (`lastTouchId`) REFERENCES `MarketingTouch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `MarketingLeadAttribution` ADD CONSTRAINT `MarketingLeadAttribution_sourceId_fkey` FOREIGN KEY (`sourceId`) REFERENCES `MarketingSource`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `MarketingLeadAttribution` ADD CONSTRAINT `MarketingLeadAttribution_internalCampaignId_fkey` FOREIGN KEY (`internalCampaignId`) REFERENCES `MarketingCampaign`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `MarketingMetricRollup` ADD CONSTRAINT `MarketingMetricRollup_internalCampaignId_fkey` FOREIGN KEY (`internalCampaignId`) REFERENCES `MarketingCampaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `MarketingAutomationExecution` ADD CONSTRAINT `MarketingAutomationExecution_ruleId_fkey` FOREIGN KEY (`ruleId`) REFERENCES `MarketingAutomationRule`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed marketing sources
INSERT IGNORE INTO `MarketingSource` (`id`, `key`, `label`, `category`, `sortOrder`, `createdAt`, `updatedAt`)
VALUES
    ('msrc_meta_ads', 'meta_ads', 'Meta Ads', 'paid', 10, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('msrc_google_ads', 'google_ads', 'Google Ads', 'paid', 20, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('msrc_linkedin_ads', 'linkedin_ads', 'LinkedIn Ads', 'paid', 30, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('msrc_instagram_ads', 'instagram_ads', 'Instagram Ads', 'paid', 40, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('msrc_organic_search', 'organic_search', 'Organic Search', 'organic', 50, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('msrc_direct', 'direct', 'Direct', 'direct', 60, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('msrc_referral', 'referral', 'Referral', 'referral', 70, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('msrc_email', 'email', 'Email', 'email', 80, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('msrc_social_organic', 'social_organic', 'Organic Social', 'social', 90, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('msrc_qr', 'qr', 'QR Code', 'offline', 100, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('msrc_campaign_url', 'campaign_url', 'Campaign URL', 'campaign', 110, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('msrc_other', 'other', 'Other', 'other', 120, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

-- Seed default conversion definitions
INSERT IGNORE INTO `MarketingConversionDefinition` (`id`, `key`, `name`, `description`, `triggerType`, `triggerConfig`, `enabled`, `createdAt`, `updatedAt`)
VALUES
    ('mcd_form_submit', 'form_submit', 'Form Submission', 'Any form submission', 'form_submit', '{}', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('mcd_contact_request', 'contact_request', 'Contact Request', 'Contact / inquiry form', 'inquiry', '{}', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('mcd_rfq', 'rfq', 'RFQ / Quote Request', 'Quote request form', 'form_submit', '{}', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('mcd_newsletter', 'newsletter', 'Newsletter Signup', 'Newsletter subscription', 'newsletter', '{}', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

-- Default retention policy
INSERT INTO `MarketingRetentionPolicy` (`id`, `visitorDays`, `sessionDays`, `touchDays`, `eventDays`, `leadDays`, `providerPayloadDays`, `createdAt`, `updatedAt`)
SELECT 'mrp_default', 365, 180, 365, 365, 730, 90, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `MarketingRetentionPolicy` LIMIT 1);
