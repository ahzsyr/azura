-- Repair partial deploy: ensure junction table exists (avoid wide composite indexes for MySQL)

CREATE TABLE IF NOT EXISTS `TestimonialCollection` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NOT NULL,
    `excerptEn` TEXT NULL,
    `excerptAr` TEXT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TestimonialCollection_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `TestimonialCollectionItem` (
    `id` VARCHAR(191) NOT NULL,
    `collectionId` VARCHAR(191) NOT NULL,
    `testimonialId` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TestimonialCollectionItem_collectionId_idx`(`collectionId`),
    INDEX `TestimonialCollectionItem_collectionId_sortOrder_idx`(`collectionId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @fk_coll_exists := (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'TestimonialCollectionItem'
      AND CONSTRAINT_NAME = 'TestimonialCollectionItem_collectionId_fkey'
);
SET @sql_coll := IF(
    @fk_coll_exists = 0,
    'ALTER TABLE `TestimonialCollectionItem` ADD CONSTRAINT `TestimonialCollectionItem_collectionId_fkey` FOREIGN KEY (`collectionId`) REFERENCES `TestimonialCollection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
    'SELECT 1'
);
PREPARE stmt_coll FROM @sql_coll;
EXECUTE stmt_coll;
DEALLOCATE PREPARE stmt_coll;

SET @fk_test_exists := (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'TestimonialCollectionItem'
      AND CONSTRAINT_NAME = 'TestimonialCollectionItem_testimonialId_fkey'
);
SET @sql_test := IF(
    @fk_test_exists = 0,
    'ALTER TABLE `TestimonialCollectionItem` ADD CONSTRAINT `TestimonialCollectionItem_testimonialId_fkey` FOREIGN KEY (`testimonialId`) REFERENCES `Testimonial`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
    'SELECT 1'
);
PREPARE stmt_test FROM @sql_test;
EXECUTE stmt_test;
DEALLOCATE PREPARE stmt_test;
