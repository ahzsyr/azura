-- CatalogEntityType enum
ALTER TABLE `SearchDocument` MODIFY `entityType` ENUM('PACKAGE', 'HOTEL', 'SERVICE', 'POST', 'CMS_PAGE', 'FAQ', 'MEDIA', 'TESTIMONIAL') NOT NULL;

-- EntityImage table
CREATE TABLE `EntityImage` (
    `id` VARCHAR(191) NOT NULL,
    `entityType` ENUM('PACKAGE', 'HOTEL', 'SERVICE') NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `altEn` VARCHAR(191) NOT NULL DEFAULT '',
    `altAr` VARCHAR(191) NOT NULL DEFAULT '',
    `captionEn` VARCHAR(191) NOT NULL DEFAULT '',
    `captionAr` VARCHAR(191) NOT NULL DEFAULT '',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `isCover` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `EntityImage_entityType_entityId_sortOrder_idx`(`entityType`, `entityId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Package excerpt fields
ALTER TABLE `Package` ADD COLUMN `excerptEn` TEXT NOT NULL DEFAULT (''),
    ADD COLUMN `excerptAr` TEXT NOT NULL DEFAULT ('');

-- Hotel extended fields
ALTER TABLE `Hotel` ADD COLUMN `excerptEn` TEXT NOT NULL DEFAULT (''),
    ADD COLUMN `excerptAr` TEXT NOT NULL DEFAULT (''),
    ADD COLUMN `highlightsEn` JSON NOT NULL,
    ADD COLUMN `highlightsAr` JSON NOT NULL,
    ADD COLUMN `addressEn` TEXT NOT NULL DEFAULT (''),
    ADD COLUMN `addressAr` TEXT NOT NULL DEFAULT (''),
    ADD COLUMN `distanceEn` TEXT NOT NULL DEFAULT (''),
    ADD COLUMN `distanceAr` TEXT NOT NULL DEFAULT (''),
    ADD COLUMN `amenitiesEn` JSON NOT NULL,
    ADD COLUMN `amenitiesAr` JSON NOT NULL;

UPDATE `Hotel` SET `highlightsEn` = '[]', `highlightsAr` = '[]', `amenitiesEn` = '[]', `amenitiesAr` = '[]';

-- Service extended fields
ALTER TABLE `Service` ADD COLUMN `slug` VARCHAR(191) NOT NULL,
    ADD COLUMN `excerptEn` TEXT NOT NULL DEFAULT (''),
    ADD COLUMN `excerptAr` TEXT NOT NULL DEFAULT (''),
    ADD COLUMN `highlightsEn` JSON NOT NULL,
    ADD COLUMN `highlightsAr` JSON NOT NULL,
    ADD COLUMN `imageUrl` VARCHAR(191) NULL,
    ADD COLUMN `ctaLabelEn` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `ctaLabelAr` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `ctaHref` VARCHAR(191) NOT NULL DEFAULT '';

UPDATE `Service` SET `slug` = `id`, `highlightsEn` = '[]', `highlightsAr` = '[]';

CREATE UNIQUE INDEX `Service_slug_key` ON `Service`(`slug`);

-- Inquiry notes
ALTER TABLE `Inquiry` ADD COLUMN `notes` TEXT NULL;

-- Migrate PackageImage -> EntityImage
INSERT INTO `EntityImage` (`id`, `entityType`, `entityId`, `url`, `altEn`, `altAr`, `captionEn`, `captionAr`, `sortOrder`, `isPublished`, `isCover`, `createdAt`, `updatedAt`)
SELECT
    `id`,
    'PACKAGE',
    `packageId`,
    `url`,
    `altEn`,
    `altAr`,
    '',
    '',
    `sortOrder`,
    true,
    false,
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
FROM `PackageImage`;

-- Set first image per package as cover
UPDATE `EntityImage` ei
INNER JOIN (
    SELECT `entityId`, MIN(`sortOrder`) AS minSort
    FROM `EntityImage`
    WHERE `entityType` = 'PACKAGE'
    GROUP BY `entityId`
) first_img ON ei.`entityId` = first_img.`entityId` AND ei.`sortOrder` = first_img.minSort
SET ei.`isCover` = true
WHERE ei.`entityType` = 'PACKAGE';
