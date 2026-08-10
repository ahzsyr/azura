/*
  Warnings:

  - You are about to drop the column `packageId` on the `booking` table. All the data in the column will be lost.
  - You are about to drop the column `packageId` on the `inquiry` table. All the data in the column will be lost.
  - The values [PACKAGE,HOTEL,SERVICE] on the enum `SearchDocument_entityType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `entityimage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `hotel` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `package` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `packagecategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `packageimage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `service` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `contentItemId` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `Booking_packageId_fkey` ON `booking`;

-- DropIndex
DROP INDEX `Booking_userId_fkey` ON `booking`;

-- DropIndex
DROP INDEX `CmsPageRevision_createdById_fkey` ON `cmspagerevision`;

-- DropIndex
DROP INDEX `Inquiry_packageId_fkey` ON `inquiry`;

-- DropIndex
DROP INDEX `MediaAsset_uploadedById_fkey` ON `mediaasset`;

-- DropIndex
DROP INDEX `Post_authorId_fkey` ON `post`;

-- DropIndex
DROP INDEX `Post_featuredImageId_fkey` ON `post`;

-- DropIndex
DROP INDEX `PostCategoryOnPost_categoryId_fkey` ON `postcategoryonpost`;

-- DropIndex
DROP INDEX `PostTagOnPost_tagId_fkey` ON `posttagonpost`;

-- DropIndex
DROP INDEX `SearchDocument_fulltext_idx` ON `searchdocument`;

-- DropIndex
DROP INDEX `TestimonialCollectionItem_testimonialId_fkey` ON `testimonialcollectionitem`;

-- AlterTable
ALTER TABLE `booking` DROP COLUMN `packageId`,
    ADD COLUMN `contentItemId` VARCHAR(36) NOT NULL;

-- AlterTable
ALTER TABLE `faqset` MODIFY `descriptionEn` TEXT NOT NULL DEFAULT '',
    MODIFY `descriptionAr` TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `gallery` MODIFY `descriptionEn` TEXT NOT NULL DEFAULT '',
    MODIFY `descriptionAr` TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `gallerymedia` MODIFY `descriptionEn` TEXT NOT NULL DEFAULT '',
    MODIFY `descriptionAr` TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `inquiry` DROP COLUMN `packageId`,
    ADD COLUMN `contentItemId` VARCHAR(36) NULL,
    MODIFY `type` ENUM('GENERAL', 'PACKAGE', 'CONTENT', 'VISA', 'CONTACT') NOT NULL DEFAULT 'GENERAL';

-- AlterTable
ALTER TABLE `localeconfig` MODIFY `flag` VARCHAR(191) NOT NULL DEFAULT '🌐';

-- AlterTable
ALTER TABLE `searchdocument` MODIFY `entityType` ENUM('CONTENT_ITEM', 'POST', 'CMS_PAGE', 'FAQ', 'MEDIA', 'TESTIMONIAL') NOT NULL;

-- DropTable
DROP TABLE `entityimage`;

-- DropTable
DROP TABLE `hotel`;

-- DropTable
DROP TABLE `package`;

-- DropTable
DROP TABLE `packagecategory`;

-- DropTable
DROP TABLE `packageimage`;

-- DropTable
DROP TABLE `service`;

-- CreateTable
CREATE TABLE `ContentType` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `nameEn` VARCHAR(191) NOT NULL,
    `nameAr` VARCHAR(191) NOT NULL,
    `labelSingularEn` VARCHAR(191) NOT NULL DEFAULT 'Item',
    `labelSingularAr` VARCHAR(191) NOT NULL DEFAULT 'عنصر',
    `labelPluralEn` VARCHAR(191) NOT NULL DEFAULT 'Items',
    `labelPluralAr` VARCHAR(191) NOT NULL DEFAULT 'عناصر',
    `icon` VARCHAR(191) NOT NULL DEFAULT 'box',
    `routePrefix` VARCHAR(64) NULL,
    `fieldSchema` JSON NOT NULL,
    `displaySchema` JSON NOT NULL,
    `adminConfig` JSON NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isEnabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ContentType_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContentCollection` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `contentTypeId` VARCHAR(36) NOT NULL,
    `nameEn` VARCHAR(191) NOT NULL,
    `nameAr` VARCHAR(191) NOT NULL,
    `excerptEn` TEXT NULL,
    `excerptAr` TEXT NULL,
    `displayProfile` JSON NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ContentCollection_slug_key`(`slug`),
    INDEX `ContentCollection_contentTypeId_idx`(`contentTypeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContentItem` (
    `id` VARCHAR(191) NOT NULL,
    `contentTypeId` VARCHAR(36) NOT NULL,
    `collectionId` VARCHAR(36) NULL,
    `slug` VARCHAR(128) NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NOT NULL,
    `excerptEn` TEXT NOT NULL DEFAULT '',
    `excerptAr` TEXT NOT NULL DEFAULT '',
    `descriptionEn` TEXT NOT NULL DEFAULT '',
    `descriptionAr` TEXT NOT NULL DEFAULT '',
    `attributes` JSON NOT NULL,
    `blocks` JSON NOT NULL,
    `displaySettings` JSON NOT NULL,
    `metadata` JSON NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `isFeatured` BOOLEAN NOT NULL DEFAULT false,
    `isVisible` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `publishedAt` DATETIME(3) NULL,
    `archivedAt` DATETIME(3) NULL,
    `deletedAt` DATETIME(3) NULL,
    `featuredImageUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ContentItem_contentTypeId_status_isFeatured_idx`(`contentTypeId`, `status`, `isFeatured`),
    INDEX `ContentItem_collectionId_idx`(`collectionId`),
    INDEX `ContentItem_deletedAt_idx`(`deletedAt`),
    UNIQUE INDEX `ContentItem_contentTypeId_slug_key`(`contentTypeId`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContentCollectionItem` (
    `id` VARCHAR(191) NOT NULL,
    `collectionId` VARCHAR(36) NOT NULL,
    `itemId` VARCHAR(36) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ContentCollectionItem_collectionId_sortOrder_idx`(`collectionId`, `sortOrder`),
    UNIQUE INDEX `ContentCollectionItem_collectionId_itemId_key`(`collectionId`, `itemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContentItemMedia` (
    `id` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(36) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `altEn` VARCHAR(191) NOT NULL DEFAULT '',
    `altAr` VARCHAR(191) NOT NULL DEFAULT '',
    `captionEn` TEXT NOT NULL DEFAULT '',
    `captionAr` TEXT NOT NULL DEFAULT '',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `isCover` BOOLEAN NOT NULL DEFAULT false,
    `isHidden` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ContentItemMedia_itemId_sortOrder_idx`(`itemId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TranslationJob` (
    `id` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(64) NULL,
    `languageCode` VARCHAR(16) NOT NULL,
    `status` ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `totalEntities` INTEGER NOT NULL DEFAULT 0,
    `processedCount` INTEGER NOT NULL DEFAULT 0,
    `errorMessage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `completedAt` DATETIME(3) NULL,

    INDEX `TranslationJob_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Booking_contentItemId_idx` ON `Booking`(`contentItemId`);

-- CreateIndex
CREATE INDEX `Inquiry_contentItemId_idx` ON `Inquiry`(`contentItemId`);

-- AddForeignKey
ALTER TABLE `GalleryMedia` ADD CONSTRAINT `GalleryMedia_galleryId_fkey` FOREIGN KEY (`galleryId`) REFERENCES `Gallery`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TestimonialCollectionItem` ADD CONSTRAINT `TestimonialCollectionItem_collectionId_fkey` FOREIGN KEY (`collectionId`) REFERENCES `TestimonialCollection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TestimonialCollectionItem` ADD CONSTRAINT `TestimonialCollectionItem_testimonialId_fkey` FOREIGN KEY (`testimonialId`) REFERENCES `Testimonial`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inquiry` ADD CONSTRAINT `Inquiry_contentItemId_fkey` FOREIGN KEY (`contentItemId`) REFERENCES `ContentItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_contentItemId_fkey` FOREIGN KEY (`contentItemId`) REFERENCES `ContentItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FaqItem` ADD CONSTRAINT `FaqItem_faqSetId_fkey` FOREIGN KEY (`faqSetId`) REFERENCES `FaqSet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MediaFolder` ADD CONSTRAINT `MediaFolder_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `MediaFolder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MediaAsset` ADD CONSTRAINT `MediaAsset_folderId_fkey` FOREIGN KEY (`folderId`) REFERENCES `MediaFolder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MediaAsset` ADD CONSTRAINT `MediaAsset_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MediaUsage` ADD CONSTRAINT `MediaUsage_mediaId_fkey` FOREIGN KEY (`mediaId`) REFERENCES `MediaAsset`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CmsPageRevision` ADD CONSTRAINT `CmsPageRevision_pageId_fkey` FOREIGN KEY (`pageId`) REFERENCES `CmsPage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CmsPageRevision` ADD CONSTRAINT `CmsPageRevision_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostAuthor` ADD CONSTRAINT `PostAuthor_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Post` ADD CONSTRAINT `Post_featuredImageId_fkey` FOREIGN KEY (`featuredImageId`) REFERENCES `MediaAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Post` ADD CONSTRAINT `Post_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `PostAuthor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostCategoryOnPost` ADD CONSTRAINT `PostCategoryOnPost_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostCategoryOnPost` ADD CONSTRAINT `PostCategoryOnPost_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `PostCategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostTagOnPost` ADD CONSTRAINT `PostTagOnPost_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostTagOnPost` ADD CONSTRAINT `PostTagOnPost_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `PostTag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SeoMeta` ADD CONSTRAINT `SeoMeta_cmsPageId_fkey` FOREIGN KEY (`cmsPageId`) REFERENCES `CmsPage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SeoMeta` ADD CONSTRAINT `SeoMeta_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContentCollection` ADD CONSTRAINT `ContentCollection_contentTypeId_fkey` FOREIGN KEY (`contentTypeId`) REFERENCES `ContentType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContentItem` ADD CONSTRAINT `ContentItem_contentTypeId_fkey` FOREIGN KEY (`contentTypeId`) REFERENCES `ContentType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContentItem` ADD CONSTRAINT `ContentItem_collectionId_fkey` FOREIGN KEY (`collectionId`) REFERENCES `ContentCollection`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContentCollectionItem` ADD CONSTRAINT `ContentCollectionItem_collectionId_fkey` FOREIGN KEY (`collectionId`) REFERENCES `ContentCollection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContentCollectionItem` ADD CONSTRAINT `ContentCollectionItem_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `ContentItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContentItemMedia` ADD CONSTRAINT `ContentItemMedia_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `ContentItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EntityTranslationVersion` ADD CONSTRAINT `EntityTranslationVersion_translationId_fkey` FOREIGN KEY (`translationId`) REFERENCES `EntityTranslation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
