-- ContentItem CMS parity columns + revision history (Services / content editor)
ALTER TABLE `ContentItem` ADD COLUMN `visualSettings` JSON NOT NULL DEFAULT ('{}');
ALTER TABLE `ContentItem` ADD COLUMN `scheduledAt` DATETIME(3) NULL;

CREATE TABLE `ContentItemRevision` (
    `id` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(36) NOT NULL,
    `version` INTEGER NOT NULL,
    `blocks` JSON NOT NULL,
    `message` VARCHAR(255) NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ContentItemRevision_itemId_createdAt_idx`(`itemId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ContentItemRevision` ADD CONSTRAINT `ContentItemRevision_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `ContentItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
