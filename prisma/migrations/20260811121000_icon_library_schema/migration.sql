-- Icon Library domain: built-in/component icons, custom sanitized SVG icons, and font glyph icons.

-- CreateTable IconLibrary
CREATE TABLE `IconLibrary` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `provider` VARCHAR(191) NULL,
    `source` ENUM('BUILTIN', 'CUSTOM', 'FONT') NOT NULL,
    `version` VARCHAR(191) NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `IconLibrary_slug_key`(`slug`),
    INDEX `IconLibrary_enabled_idx`(`enabled`),
    INDEX `IconLibrary_source_idx`(`source`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable IconAsset
CREATE TABLE `IconAsset` (
    `id` VARCHAR(191) NOT NULL,
    `libraryId` VARCHAR(191) NULL,

    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(191) NULL,
    `tags` JSON NULL,

    `source` ENUM('BUILTIN', 'CUSTOM', 'FONT') NOT NULL,
    `type` ENUM('COMPONENT', 'SVG', 'FONT') NOT NULL,

    `iconName` VARCHAR(191) NULL,
    `svgContent` TEXT NULL,
    `viewBox` VARCHAR(191) NULL,

    `fontFamily` VARCHAR(191) NULL,
    `glyph` VARCHAR(191) NULL,
    `unicode` VARCHAR(191) NULL,
    `glyphKey` VARCHAR(191) NULL,

    `mediaId` VARCHAR(191) NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,

    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `IconAsset_libraryId_slug_key`(`libraryId`, `slug`),
    INDEX `IconAsset_name_idx`(`name`),
    INDEX `IconAsset_slug_idx`(`slug`),
    INDEX `IconAsset_source_idx`(`source`),
    INDEX `IconAsset_type_idx`(`type`),
    INDEX `IconAsset_category_idx`(`category`),
    INDEX `IconAsset_enabled_idx`(`enabled`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `IconAsset` ADD CONSTRAINT `IconAsset_libraryId_fkey`
FOREIGN KEY (`libraryId`) REFERENCES `IconLibrary`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `IconAsset` ADD CONSTRAINT `IconAsset_mediaId_fkey`
FOREIGN KEY (`mediaId`) REFERENCES `MediaAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable IconUsage
CREATE TABLE `IconUsage` (
    `id` VARCHAR(191) NOT NULL,
    `iconId` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(32) NOT NULL,
    `entityId` VARCHAR(128) NOT NULL,
    `field` VARCHAR(191) NOT NULL DEFAULT 'default',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `IconUsage_iconId_idx`(`iconId`),
    INDEX `IconUsage_entityType_entityId_field_idx`(`entityType`, `entityId`, `field`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `IconUsage` ADD CONSTRAINT `IconUsage_iconId_fkey`
FOREIGN KEY (`iconId`) REFERENCES `IconAsset`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

