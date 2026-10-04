-- Phase 4: durable SearchIndexJob + lease columns for reclaimable runners

CREATE TABLE `SearchIndexJob` (
  `id` VARCHAR(191) NOT NULL,
  `entityType` VARCHAR(32) NOT NULL,
  `entityId` VARCHAR(64) NOT NULL,
  `status` VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `lastError` TEXT NULL,
  `lockedUntil` DATETIME(3) NULL,
  `startedAt` DATETIME(3) NULL,
  `completedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `SearchIndexJob_status_createdAt_idx` ON `SearchIndexJob`(`status`, `createdAt`);
CREATE INDEX `SearchIndexJob_entityType_entityId_status_idx` ON `SearchIndexJob`(`entityType`, `entityId`, `status`);

ALTER TABLE `TranslationJob`
  ADD COLUMN `attempts` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `lockedUntil` DATETIME(3) NULL;

CREATE INDEX `TranslationJob_status_lockedUntil_idx` ON `TranslationJob`(`status`, `lockedUntil`);

ALTER TABLE `MarketingJob`
  ADD COLUMN `lockedUntil` DATETIME(3) NULL;

CREATE INDEX `MarketingJob_status_lockedUntil_idx` ON `MarketingJob`(`status`, `lockedUntil`);
