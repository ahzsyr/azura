-- CreateEnum
CREATE TABLE IF NOT EXISTS `_prisma_migrations_check` (id INT);
DROP TABLE IF EXISTS `_prisma_migrations_check`;

-- TranslationStatus enum (MySQL uses VARCHAR)
-- EntityTranslation
CREATE TABLE `EntityTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(64) NOT NULL,
    `entityId` VARCHAR(36) NOT NULL,
    `field` VARCHAR(64) NOT NULL,
    `languageCode` VARCHAR(16) NOT NULL,
    `value` TEXT NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED') NOT NULL DEFAULT 'PUBLISHED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `EntityTranslation_entityType_entityId_field_languageCode_key`(`entityType`, `entityId`, `field`, `languageCode`),
    INDEX `EntityTranslation_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `EntityTranslation_languageCode_entityType_idx`(`languageCode`, `entityType`),
    INDEX `EntityTranslation_entityType_languageCode_status_idx`(`entityType`, `languageCode`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- EntityTranslationVersion
CREATE TABLE `EntityTranslationVersion` (
    `id` VARCHAR(191) NOT NULL,
    `translationId` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED') NOT NULL,
    `changedBy` VARCHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EntityTranslationVersion_translationId_createdAt_idx`(`translationId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- LocalizedSlug
CREATE TABLE `LocalizedSlug` (
    `id` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(64) NOT NULL,
    `entityId` VARCHAR(36) NOT NULL,
    `languageCode` VARCHAR(16) NOT NULL,
    `slug` VARCHAR(128) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `LocalizedSlug_entityType_entityId_languageCode_key`(`entityType`, `entityId`, `languageCode`),
    UNIQUE INDEX `LocalizedSlug_entityType_slug_languageCode_key`(`entityType`, `slug`, `languageCode`),
    INDEX `LocalizedSlug_entityType_slug_idx`(`entityType`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- UiMessage
CREATE TABLE `UiMessage` (
    `id` VARCHAR(191) NOT NULL,
    `namespace` VARCHAR(64) NOT NULL,
    `key` VARCHAR(128) NOT NULL,
    `languageCode` VARCHAR(16) NOT NULL,
    `value` TEXT NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED') NOT NULL DEFAULT 'PUBLISHED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `UiMessage_namespace_key_languageCode_key`(`namespace`, `key`, `languageCode`),
    INDEX `UiMessage_languageCode_namespace_idx`(`languageCode`, `namespace`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EntityTranslationVersion` ADD CONSTRAINT `EntityTranslationVersion_translationId_fkey` FOREIGN KEY (`translationId`) REFERENCES `EntityTranslation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
