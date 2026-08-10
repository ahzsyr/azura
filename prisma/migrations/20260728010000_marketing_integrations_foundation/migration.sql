-- Marketing integrations foundation tables

CREATE TABLE `MarketingProviderRuntime` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(64) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `installedVersion` VARCHAR(32) NOT NULL DEFAULT '1.0.0',
    `lifecycle` VARCHAR(32) NOT NULL DEFAULT 'discovered',
    `maintenanceMode` BOOLEAN NOT NULL DEFAULT false,
    `lastSyncAt` DATETIME(3) NULL,
    `healthSummary` TEXT NULL,
    `metadata` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MarketingProviderRuntime_providerId_key`(`providerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MarketingConnection` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(64) NOT NULL,
    `tenantId` VARCHAR(64) NOT NULL DEFAULT 'default',
    `status` VARCHAR(32) NOT NULL DEFAULT 'disconnected',
    `lifecycle` VARCHAR(32) NOT NULL DEFAULT 'configured',
    `oauthMetadata` JSON NOT NULL,
    `scopesGranted` JSON NOT NULL,
    `scopesRequired` JSON NOT NULL,
    `scopesMissing` JSON NOT NULL,
    `scopesExpired` JSON NOT NULL,
    `lastHealthAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MarketingConnection_providerId_tenantId_key`(`providerId`, `tenantId`),
    INDEX `MarketingConnection_status_idx`(`status`),
    INDEX `MarketingConnection_lifecycle_idx`(`lifecycle`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MarketingCredential` (
    `id` VARCHAR(191) NOT NULL,
    `connectionId` VARCHAR(191) NOT NULL,
    `accessToken` TEXT NOT NULL,
    `refreshToken` TEXT NULL,
    `tokenType` VARCHAR(32) NULL,
    `expiresAt` DATETIME(3) NULL,
    `refreshStatus` VARCHAR(32) NOT NULL DEFAULT 'ok',
    `sealedPayload` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MarketingCredential_connectionId_key`(`connectionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MarketingAccount` (
    `id` VARCHAR(191) NOT NULL,
    `connectionId` VARCHAR(191) NOT NULL,
    `externalAccountId` VARCHAR(128) NOT NULL,
    `accountType` VARCHAR(64) NOT NULL,
    `displayName` VARCHAR(256) NOT NULL,
    `metadata` JSON NOT NULL,
    `isSelected` BOOLEAN NOT NULL DEFAULT false,
    `healthSummary` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MarketingAccount_connectionId_externalAccountId_key`(`connectionId`, `externalAccountId`),
    INDEX `MarketingAccount_accountType_idx`(`accountType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MarketingAsset` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `canonicalAssetKind` VARCHAR(64) NOT NULL,
    `providerAssetType` VARCHAR(64) NOT NULL,
    `externalAssetId` VARCHAR(128) NOT NULL,
    `displayName` VARCHAR(256) NOT NULL,
    `metadata` JSON NOT NULL,
    `selectable` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MarketingAsset_accountId_externalAssetId_key`(`accountId`, `externalAssetId`),
    INDEX `MarketingAsset_canonicalAssetKind_idx`(`canonicalAssetKind`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MarketingPermissionState` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(64) NOT NULL,
    `connectionId` VARCHAR(64) NOT NULL,
    `entries` JSON NOT NULL,
    `lastCheckedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MarketingPermissionState_providerId_connectionId_key`(`providerId`, `connectionId`),
    INDEX `MarketingPermissionState_lastCheckedAt_idx`(`lastCheckedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MarketingSyncState` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(64) NOT NULL,
    `entity` VARCHAR(64) NOT NULL,
    `entityId` VARCHAR(128) NULL,
    `lastSuccessfulSync` DATETIME(3) NULL,
    `lastAttempt` DATETIME(3) NULL,
    `nextScheduled` DATETIME(3) NULL,
    `status` ENUM('IDLE', 'RUNNING', 'SUCCESS', 'FAILED', 'SCHEDULED') NOT NULL DEFAULT 'IDLE',
    `failureReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MarketingSyncState_providerId_entity_entityId_key`(`providerId`, `entity`, `entityId`),
    INDEX `MarketingSyncState_status_nextScheduled_idx`(`status`, `nextScheduled`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MarketingJob` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(64) NULL,
    `connectionId` VARCHAR(191) NULL,
    `accountId` VARCHAR(191) NULL,
    `jobType` VARCHAR(64) NOT NULL,
    `workflowStage` VARCHAR(64) NOT NULL DEFAULT 'queued',
    `payload` JSON NOT NULL,
    `result` JSON NOT NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'EXHAUSTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `attemptCount` INT NOT NULL DEFAULT 0,
    `maxAttempts` INT NOT NULL DEFAULT 5,
    `lastError` TEXT NULL,
    `scheduledAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MarketingJob_idempotencyKey_key`(`idempotencyKey`),
    INDEX `MarketingJob_status_scheduledAt_idx`(`status`, `scheduledAt`),
    INDEX `MarketingJob_jobType_status_idx`(`jobType`, `status`),
    INDEX `MarketingJob_providerId_status_idx`(`providerId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MarketingWebhookEvent` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(64) NOT NULL,
    `eventType` VARCHAR(128) NOT NULL,
    `externalEventId` VARCHAR(191) NULL,
    `signatureValid` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('RECEIVED', 'VERIFIED', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD_LETTER') NOT NULL DEFAULT 'RECEIVED',
    `rawPayload` JSON NOT NULL,
    `normalizedPayload` JSON NOT NULL,
    `processingError` TEXT NULL,
    `attemptCount` INT NOT NULL DEFAULT 0,
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MarketingWebhookEvent_providerId_status_idx`(`providerId`, `status`),
    INDEX `MarketingWebhookEvent_externalEventId_idx`(`externalEventId`),
    UNIQUE INDEX `MarketingWebhookEvent_providerId_externalEventId_key`(`providerId`, `externalEventId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MarketingAnalyticsSnapshot` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(64) NOT NULL,
    `accountId` VARCHAR(128) NOT NULL,
    `metric` VARCHAR(64) NOT NULL,
    `value` DOUBLE NOT NULL DEFAULT 0,
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `dimensions` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MarketingAnalyticsSnapshot_metric_period_key`(`providerId`, `accountId`, `metric`, `periodStart`, `periodEnd`),
    INDEX `MarketingAnalyticsSnapshot_providerId_periodStart_idx`(`providerId`, `periodStart`),
    INDEX `MarketingAnalyticsSnapshot_metric_periodStart_idx`(`metric`, `periodStart`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MarketingTrackingConfig` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(64) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `pixelId` VARCHAR(128) NULL,
    `capiEnabled` BOOLEAN NOT NULL DEFAULT false,
    `accessToken` TEXT NULL,
    `testEventCode` VARCHAR(128) NULL,
    `mappings` JSON NOT NULL,
    `metadata` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MarketingTrackingConfig_providerId_key`(`providerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MarketingLeadEvent` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(64) NOT NULL,
    `externalLeadId` VARCHAR(191) NOT NULL,
    `formId` VARCHAR(128) NULL,
    `payload` JSON NOT NULL,
    `canonical` JSON NOT NULL,
    `inquiryId` VARCHAR(64) NULL,
    `processingStatus` VARCHAR(32) NOT NULL DEFAULT 'pending',
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MarketingLeadEvent_idempotencyKey_key`(`idempotencyKey`),
    UNIQUE INDEX `MarketingLeadEvent_providerId_externalLeadId_key`(`providerId`, `externalLeadId`),
    INDEX `MarketingLeadEvent_processingStatus_idx`(`processingStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MarketingTelemetry` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(64) NOT NULL,
    `operation` VARCHAR(128) NOT NULL,
    `durationMs` INT NOT NULL DEFAULT 0,
    `retryCount` INT NOT NULL DEFAULT 0,
    `rateLimited` BOOLEAN NOT NULL DEFAULT false,
    `queueWaitMs` INT NULL,
    `outcome` VARCHAR(16) NOT NULL,
    `errorCategory` VARCHAR(64) NULL,
    `metadata` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MarketingTelemetry_providerId_createdAt_idx`(`providerId`, `createdAt`),
    INDEX `MarketingTelemetry_outcome_createdAt_idx`(`outcome`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `MarketingConnection` ADD CONSTRAINT `MarketingConnection_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `MarketingProviderRuntime`(`providerId`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `MarketingCredential` ADD CONSTRAINT `MarketingCredential_connectionId_fkey` FOREIGN KEY (`connectionId`) REFERENCES `MarketingConnection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `MarketingAccount` ADD CONSTRAINT `MarketingAccount_connectionId_fkey` FOREIGN KEY (`connectionId`) REFERENCES `MarketingConnection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `MarketingAsset` ADD CONSTRAINT `MarketingAsset_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `MarketingAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `MarketingSyncState` ADD CONSTRAINT `MarketingSyncState_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `MarketingProviderRuntime`(`providerId`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `MarketingJob` ADD CONSTRAINT `MarketingJob_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `MarketingProviderRuntime`(`providerId`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `MarketingJob` ADD CONSTRAINT `MarketingJob_connectionId_fkey` FOREIGN KEY (`connectionId`) REFERENCES `MarketingConnection`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `MarketingJob` ADD CONSTRAINT `MarketingJob_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `MarketingAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `MarketingTelemetry` ADD CONSTRAINT `MarketingTelemetry_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `MarketingProviderRuntime`(`providerId`) ON DELETE CASCADE ON UPDATE CASCADE;
