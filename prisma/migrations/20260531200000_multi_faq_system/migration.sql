-- Multi-FAQ system: replace flat FAQ with FaqSet + FaqItem

CREATE TABLE `FaqSet` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NOT NULL,
    `excerptEn` TEXT NULL,
    `excerptAr` TEXT NULL,
    `descriptionEn` TEXT NOT NULL DEFAULT '',
    `descriptionAr` TEXT NOT NULL DEFAULT '',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `FaqSet_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `FaqItem` (
    `id` VARCHAR(191) NOT NULL,
    `faqSetId` VARCHAR(191) NOT NULL,
    `questionEn` VARCHAR(191) NOT NULL,
    `questionAr` VARCHAR(191) NOT NULL,
    `answerEn` TEXT NOT NULL,
    `answerAr` TEXT NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FaqItem_faqSetId_idx`(`faqSetId`),
    INDEX `FaqItem_faqSetId_sortOrder_idx`(`faqSetId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Migrate distinct categories into FaqSet rows
INSERT INTO `FaqSet` (`id`, `slug`, `titleEn`, `titleAr`, `sortOrder`, `isPublished`, `createdAt`, `updatedAt`)
SELECT
    CONCAT('migrated-set-', LOWER(REPLACE(REPLACE(REPLACE(`category`, ' ', '-'), '_', '-'), '/', '-'))),
    LOWER(REPLACE(REPLACE(REPLACE(`category`, ' ', '-'), '_', '-'), '/', '-')),
    CONCAT(UPPER(LEFT(`category`, 1)), SUBSTRING(`category`, 2), ' FAQs'),
    CONCAT('أسئلة ', `category`),
    ROW_NUMBER() OVER (ORDER BY `category`) - 1,
    true,
    NOW(3),
    NOW(3)
FROM (
    SELECT DISTINCT `category` FROM `faq`
) AS cats;

-- Migrate FAQ rows into FaqItem
INSERT INTO `FaqItem` (`id`, `faqSetId`, `questionEn`, `questionAr`, `answerEn`, `answerAr`, `sortOrder`, `isPublished`, `createdAt`, `updatedAt`)
SELECT
    f.`id`,
    s.`id`,
    f.`questionEn`,
    f.`questionAr`,
    f.`answerEn`,
    f.`answerAr`,
    f.`sortOrder`,
    f.`isPublished`,
    f.`createdAt`,
    f.`updatedAt`
FROM `faq` f
INNER JOIN `FaqSet` s ON s.`slug` = LOWER(REPLACE(REPLACE(REPLACE(f.`category`, ' ', '-'), '_', '-'), '/', '-'));

ALTER TABLE `FaqItem` ADD CONSTRAINT `FaqItem_faqSetId_fkey` FOREIGN KEY (`faqSetId`) REFERENCES `FaqSet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE `faq`;
