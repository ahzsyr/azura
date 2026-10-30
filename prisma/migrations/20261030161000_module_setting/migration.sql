-- Phase 3: Core-owned Module settings persistence.
CREATE TABLE `ModuleSetting` (
  `id` VARCHAR(191) NOT NULL,
  `packageId` VARCHAR(64) NOT NULL,
  `key` VARCHAR(128) NOT NULL,
  `value` JSON NOT NULL,
  `schemaVersion` INTEGER NOT NULL DEFAULT 1,
  `updatedAt` DATETIME(3) NOT NULL,
  `updatedBy` VARCHAR(191) NULL,
  UNIQUE INDEX `ModuleSetting_packageId_key_key`(`packageId`, `key`),
  INDEX `ModuleSetting_packageId_idx`(`packageId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
