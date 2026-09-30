-- Tables present in Prisma schema / database/mysql/01-schema.sql but never created
-- by the MySQL Prisma migration history (CatalogCollection was even dropped in
-- 20260615120000_translation_only_architecture as a no-op cleanup).

CREATE TABLE IF NOT EXISTS `CatalogCollection` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(128) NOT NULL,
    `parentSlug` VARCHAR(128) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `visible` BOOLEAN NOT NULL DEFAULT true,
    `conditions` JSON NOT NULL,
    `metadata` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CatalogCollection_slug_key`(`slug`),
    INDEX `CatalogCollection_parentSlug_idx`(`parentSlug`),
    INDEX `CatalogCollection_visible_idx`(`visible`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `SearchAnalyticsSnapshot` (
    `locale` VARCHAR(10) NOT NULL,
    `data` JSON NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`locale`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `SeoSubmissionJob` (
    `id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(32) NOT NULL,
    `kind` VARCHAR(16) NOT NULL,
    `reason` VARCHAR(64) NOT NULL,
    `url` VARCHAR(512) NOT NULL,
    `status` ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'EXHAUSTED') NOT NULL DEFAULT 'PENDING',
    `attemptCount` INTEGER NOT NULL DEFAULT 0,
    `responseStatus` INTEGER NULL,
    `lastError` TEXT NULL,
    `metadata` JSON NOT NULL,
    `scheduledAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SeoSubmissionJob_status_scheduledAt_idx`(`status`, `scheduledAt`),
    INDEX `SeoSubmissionJob_provider_status_idx`(`provider`, `status`),
    UNIQUE INDEX `SeoSubmissionJob_provider_kind_url_key`(`provider`, `kind`, `url`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `SeoRunnerLock` (
    `key` VARCHAR(64) NOT NULL,
    `lockedUntil` DATETIME(3) NOT NULL,
    `owner` VARCHAR(128) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `SeoProviderTelemetry` (
    `id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(32) NOT NULL,
    `eventType` ENUM('QUEUED', 'STARTED', 'COMPLETED', 'FAILED', 'EXHAUSTED', 'SKIPPED') NOT NULL,
    `status` ENUM('SUCCESS', 'FAILURE', 'INFO') NOT NULL,
    `responseCode` INTEGER NULL,
    `latencyMs` INTEGER NULL,
    `attemptCount` INTEGER NOT NULL DEFAULT 0,
    `errorClass` VARCHAR(64) NULL,
    `jobId` VARCHAR(128) NULL,
    `url` VARCHAR(512) NULL,
    `metadata` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SeoProviderTelemetry_provider_createdAt_idx`(`provider`, `createdAt`),
    INDEX `SeoProviderTelemetry_eventType_createdAt_idx`(`eventType`, `createdAt`),
    INDEX `SeoProviderTelemetry_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `SeoHealthSnapshot` (
    `id` VARCHAR(191) NOT NULL,
    `score` INTEGER NOT NULL,
    `componentBreakdown` JSON NOT NULL,
    `generatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SeoHealthSnapshot_generatedAt_idx`(`generatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `SeoCrawlIssue` (
    `id` VARCHAR(191) NOT NULL,
    `issueKey` VARCHAR(256) NOT NULL,
    `type` VARCHAR(64) NOT NULL,
    `severity` ENUM('CRITICAL', 'WARNING', 'INFO') NOT NULL,
    `url` VARCHAR(512) NOT NULL,
    `details` JSON NOT NULL,
    `source` VARCHAR(64) NULL,
    `firstDetectedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastDetectedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SeoCrawlIssue_issueKey_key`(`issueKey`),
    INDEX `SeoCrawlIssue_severity_resolvedAt_idx`(`severity`, `resolvedAt`),
    INDEX `SeoCrawlIssue_type_resolvedAt_idx`(`type`, `resolvedAt`),
    INDEX `SeoCrawlIssue_lastDetectedAt_idx`(`lastDetectedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `SeoSearchMetric` (
    `id` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `url` VARCHAR(512) NOT NULL,
    `query` VARCHAR(512) NOT NULL DEFAULT '',
    `country` VARCHAR(8) NOT NULL DEFAULT '',
    `device` VARCHAR(32) NOT NULL DEFAULT '',
    `source` VARCHAR(32) NOT NULL,
    `clicks` INTEGER NOT NULL DEFAULT 0,
    `impressions` INTEGER NOT NULL DEFAULT 0,
    `ctr` DOUBLE NOT NULL DEFAULT 0,
    `position` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SeoSearchMetric_date_source_idx`(`date`, `source`),
    -- Prefix indexes: utf8mb4 unique key would otherwise exceed InnoDB 3072-byte limit.
    INDEX `SeoSearchMetric_url_date_idx`(`url`(191), `date`),
    INDEX `SeoSearchMetric_query_date_idx`(`query`(191), `date`),
    UNIQUE INDEX `SeoSearchMetric_source_date_url_query_country_device_key`(`source`, `date`, `url`(191), `query`(191), `country`, `device`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `SeoRichResultIssue` (
    `id` VARCHAR(191) NOT NULL,
    `issueKey` VARCHAR(256) NOT NULL,
    `type` VARCHAR(64) NOT NULL,
    `category` ENUM('ERROR', 'WARNING') NOT NULL,
    `url` VARCHAR(512) NOT NULL,
    `details` JSON NOT NULL,
    `eligibility` ENUM('ELIGIBLE', 'ELIGIBLE_WITH_WARNINGS', 'NOT_ELIGIBLE') NOT NULL,
    `source` VARCHAR(64) NOT NULL DEFAULT 'internal',
    `detectedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SeoRichResultIssue_issueKey_key`(`issueKey`),
    INDEX `SeoRichResultIssue_type_eligibility_idx`(`type`, `eligibility`),
    INDEX `SeoRichResultIssue_category_resolvedAt_idx`(`category`, `resolvedAt`),
    INDEX `SeoRichResultIssue_detectedAt_idx`(`detectedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
