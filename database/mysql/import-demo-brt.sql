-- AZURA one-file import: demo-brt
-- phpMyAdmin: create empty database → Import this file

-- AZURA — MySQL 8+ schema (generated from prisma/schema.prisma)
-- Import via phpMyAdmin: select database → Import → choose this file

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'CUSTOMER') NOT NULL DEFAULT 'ADMIN',
    `phone` VARCHAR(191) NULL,
    `dateOfBirth` DATE NULL,
    `addressLine1` VARCHAR(191) NULL,
    `addressLine2` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `postalCode` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `marketingOptIn` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PasswordResetToken` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PasswordResetToken_userId_idx`(`userId`),
    INDEX `PasswordResetToken_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserFavorite` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `entityType` ENUM('CATALOG_PRODUCT', 'CONTENT_ITEM') NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `locale` VARCHAR(191) NOT NULL DEFAULT 'en',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `UserFavorite_userId_idx`(`userId`),
    UNIQUE INDEX `UserFavorite_userId_entityType_entityId_key`(`userId`, `entityType`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Gallery` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NOT NULL,
    `excerptEn` TEXT NULL,
    `excerptAr` TEXT NULL,
    `descriptionEn` TEXT NOT NULL DEFAULT '',
    `descriptionAr` TEXT NOT NULL DEFAULT '',
    `infoEn` TEXT NULL,
    `infoAr` TEXT NULL,
    `coverUrl` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Gallery_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GalleryMedia` (
    `id` VARCHAR(191) NOT NULL,
    `galleryId` VARCHAR(191) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NOT NULL,
    `excerptEn` TEXT NULL,
    `excerptAr` TEXT NULL,
    `descriptionEn` TEXT NOT NULL DEFAULT '',
    `descriptionAr` TEXT NOT NULL DEFAULT '',
    `infoEn` TEXT NULL,
    `infoAr` TEXT NULL,
    `mediaUrl` VARCHAR(191) NOT NULL,
    `mediaKind` ENUM('IMAGE', 'VIDEO') NOT NULL DEFAULT 'IMAGE',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `GalleryMedia_galleryId_idx`(`galleryId`),
    INDEX `GalleryMedia_galleryId_sortOrder_idx`(`galleryId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Testimonial` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `rating` INTEGER NOT NULL DEFAULT 5,
    `contentEn` TEXT NOT NULL,
    `contentAr` TEXT NOT NULL,
    `videoUrl` VARCHAR(191) NULL,
    `imageUrl` VARCHAR(191) NULL,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TestimonialCollection` (
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

-- CreateTable
CREATE TABLE `TestimonialCollectionItem` (
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

-- CreateTable
CREATE TABLE `Inquiry` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('GENERAL', 'PACKAGE', 'CONTENT', 'VISA', 'CONTACT') NOT NULL DEFAULT 'GENERAL',
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `message` TEXT NOT NULL,
    `notes` TEXT NULL,
    `contentItemId` VARCHAR(36) NULL,
    `userId` VARCHAR(191) NULL,
    `status` ENUM('NEW', 'CONTACTED', 'CLOSED') NOT NULL DEFAULT 'NEW',
    `locale` VARCHAR(191) NOT NULL DEFAULT 'en',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Inquiry_status_idx`(`status`),
    INDEX `Inquiry_createdAt_idx`(`createdAt`),
    INDEX `Inquiry_contentItemId_idx`(`contentItemId`),
    INDEX `Inquiry_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Booking` (
    `id` VARCHAR(191) NOT NULL,
    `contentItemId` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `metadata` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Booking_contentItemId_idx`(`contentItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE `CompanyInfo` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'default',
    `name` VARCHAR(191) NOT NULL DEFAULT 'AZURA',
    `taglineEn` TEXT NOT NULL,
    `taglineAr` TEXT NOT NULL,
    `storyEn` TEXT NOT NULL,
    `storyAr` TEXT NOT NULL,
    `missionEn` TEXT NOT NULL,
    `missionAr` TEXT NOT NULL,
    `visionEn` TEXT NOT NULL,
    `visionAr` TEXT NOT NULL,
    `valuesEn` JSON NOT NULL,
    `valuesAr` JSON NOT NULL,
    `registrationNo` VARCHAR(191) NOT NULL,
    `licenseInfo` TEXT NOT NULL,
    `addressEn` TEXT NOT NULL,
    `addressAr` TEXT NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `whatsapp` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `officeHoursEn` VARCHAR(191) NOT NULL,
    `officeHoursAr` VARCHAR(191) NOT NULL,
    `socialLinks` JSON NOT NULL,
    `trustBadges` JSON NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SeoSettings` (
    `id` VARCHAR(191) NOT NULL,
    `pageKey` VARCHAR(191) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NOT NULL,
    `descriptionEn` TEXT NOT NULL,
    `descriptionAr` TEXT NOT NULL,
    `ogImageUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SeoSettings_pageKey_key`(`pageKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SiteTheme` (
    `id` VARCHAR(191) NOT NULL,
    `preset` ENUM('CLASSIC', 'MODERN', 'LUXURY', 'CUSTOM') NOT NULL DEFAULT 'CLASSIC',
    `activePresetId` VARCHAR(191) NULL,
    `primaryColor` VARCHAR(191) NOT NULL DEFAULT '#047857',
    `secondaryColor` VARCHAR(191) NOT NULL DEFAULT '#d4af37',
    `typography` JSON NOT NULL,
    `faviconUrl` VARCHAR(191) NULL,
    `logoUrl` VARCHAR(191) NULL,
    `brandConfig` JSON NOT NULL,
    `headerConfig` JSON NOT NULL,
    `footerConfig` JSON NOT NULL,
    `animationsEnabled` BOOLEAN NOT NULL DEFAULT true,
    `animationSpeed` DOUBLE NOT NULL DEFAULT 1,
    `lazyLoadEnabled` BOOLEAN NOT NULL DEFAULT true,
    `darkModeEnabled` BOOLEAN NOT NULL DEFAULT false,
    `spacingScale` DOUBLE NOT NULL DEFAULT 1,
    `customCss` TEXT NULL,
    `cursorEffect` VARCHAR(191) NULL,
    `backgroundEffect` VARCHAR(191) NULL,
    `textEffect` VARCHAR(191) NULL,
    `cursorEffectEnabled` BOOLEAN NOT NULL DEFAULT true,
    `backgroundEffectEnabled` BOOLEAN NOT NULL DEFAULT true,
    `textEffectEnabled` BOOLEAN NOT NULL DEFAULT true,
    `cardStyle` VARCHAR(191) NULL,
    `borderStyle` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JsonStore` (
    `id` VARCHAR(191) NOT NULL,
    `namespace` VARCHAR(64) NOT NULL,
    `key` VARCHAR(128) NOT NULL,
    `data` JSON NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `JsonStore_namespace_idx`(`namespace`),
    UNIQUE INDEX `JsonStore_namespace_key_key`(`namespace`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MediaFolder` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MediaFolder_parentId_idx`(`parentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MediaAsset` (
    `id` VARCHAR(191) NOT NULL,
    `filename` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `mediaType` ENUM('IMAGE', 'VIDEO', 'DOCUMENT', 'SVG') NOT NULL,
    `sizeBytes` INTEGER NOT NULL DEFAULT 0,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `altEn` VARCHAR(191) NOT NULL DEFAULT '',
    `altAr` VARCHAR(191) NOT NULL DEFAULT '',
    `folderId` VARCHAR(191) NULL,
    `uploadedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MediaAsset_folderId_idx`(`folderId`),
    INDEX `MediaAsset_mediaType_idx`(`mediaType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MediaUsage` (
    `id` VARCHAR(191) NOT NULL,
    `mediaId` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(32) NOT NULL,
    `entityId` VARCHAR(128) NOT NULL,
    `field` VARCHAR(191) NOT NULL DEFAULT 'default',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MediaUsage_mediaId_idx`(`mediaId`),
    INDEX `MediaUsage_entityType_entityId_idx`(`entityType`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CmsPage` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NOT NULL,
    `excerptEn` TEXT NULL,
    `excerptAr` TEXT NULL,
    `templateKey` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `blocks` JSON NOT NULL,
    `visualSettings` JSON NOT NULL,
    `publishedAt` DATETIME(3) NULL,
    `scheduledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CmsPage_slug_key`(`slug`),
    INDEX `CmsPage_status_idx`(`status`),
    INDEX `CmsPage_slug_status_idx`(`slug`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CmsPageRevision` (
    `id` VARCHAR(191) NOT NULL,
    `pageId` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL,
    `blocks` JSON NOT NULL,
    `message` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CmsPageRevision_pageId_idx`(`pageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PostCategory` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `nameEn` VARCHAR(191) NOT NULL,
    `nameAr` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PostCategory_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PostTag` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `nameEn` VARCHAR(191) NOT NULL,
    `nameAr` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PostTag_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PostAuthor` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `bioEn` TEXT NULL,
    `bioAr` TEXT NULL,
    `avatarUrl` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PostAuthor_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Post` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NOT NULL,
    `excerptEn` TEXT NULL,
    `excerptAr` TEXT NULL,
    `contentEn` TEXT NULL,
    `contentAr` TEXT NULL,
    `blocks` JSON NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `featuredImageId` VARCHAR(191) NULL,
    `authorId` VARCHAR(191) NULL,
    `publishedAt` DATETIME(3) NULL,
    `scheduledAt` DATETIME(3) NULL,
    `relatedPostIds` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Post_slug_key`(`slug`),
    INDEX `Post_status_idx`(`status`),
    INDEX `Post_slug_status_idx`(`slug`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PostCategoryOnPost` (
    `postId` VARCHAR(36) NOT NULL,
    `categoryId` VARCHAR(36) NOT NULL,

    PRIMARY KEY (`postId`, `categoryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PostTagOnPost` (
    `postId` VARCHAR(36) NOT NULL,
    `tagId` VARCHAR(36) NOT NULL,

    PRIMARY KEY (`postId`, `tagId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SearchDocument` (
    `id` VARCHAR(191) NOT NULL,
    `entityType` ENUM('CONTENT_ITEM', 'CONTENT_COLLECTION', 'CONTENT_TYPE', 'CATALOG_PRODUCT', 'CATALOG_COLLECTION', 'CATALOG_CATEGORY', 'POST', 'CMS_PAGE', 'FAQ', 'MEDIA', 'TESTIMONIAL') NOT NULL,
    `entityId` VARCHAR(36) NOT NULL,
    `locale` VARCHAR(5) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `urlPath` VARCHAR(191) NOT NULL,
    `metadata` JSON NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SearchDocument_locale_idx`(`locale`),
    INDEX `SearchDocument_locale_entityType_idx`(`locale`, `entityType`),
    INDEX `SearchDocument_title_idx`(`title`),
    UNIQUE INDEX `SearchDocument_entityType_entityId_locale_key`(`entityType`, `entityId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SeoMeta` (
    `id` VARCHAR(191) NOT NULL,
    `pageKey` VARCHAR(128) NULL,
    `entityType` VARCHAR(32) NULL,
    `entityId` VARCHAR(128) NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NOT NULL,
    `descriptionEn` TEXT NOT NULL,
    `descriptionAr` TEXT NOT NULL,
    `canonicalUrl` VARCHAR(191) NULL,
    `robots` VARCHAR(191) NULL,
    `focusKeywords` VARCHAR(191) NULL,
    `ogTitleEn` VARCHAR(191) NULL,
    `ogTitleAr` VARCHAR(191) NULL,
    `ogImageUrl` VARCHAR(191) NULL,
    `twitterCard` VARCHAR(191) NULL,
    `jsonLd` JSON NULL,
    `cmsPageId` VARCHAR(191) NULL,
    `postId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SeoMeta_pageKey_key`(`pageKey`),
    UNIQUE INDEX `SeoMeta_cmsPageId_key`(`cmsPageId`),
    UNIQUE INDEX `SeoMeta_postId_key`(`postId`),
    INDEX `SeoMeta_entityType_entityId_idx`(`entityType`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SeoRedirect` (
    `id` VARCHAR(191) NOT NULL,
    `fromPath` VARCHAR(191) NOT NULL,
    `toPath` VARCHAR(191) NOT NULL,
    `type` ENUM('PERMANENT', 'TEMPORARY') NOT NULL DEFAULT 'PERMANENT',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SeoRedirect_fromPath_key`(`fromPath`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Custom404` (
    `id` VARCHAR(191) NOT NULL,
    `locale` VARCHAR(191) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NOT NULL,
    `bodyEn` TEXT NOT NULL,
    `bodyAr` TEXT NOT NULL,
    `blocks` JSON NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Custom404_locale_key`(`locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LocaleConfig` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(16) NOT NULL,
    `urlPrefix` VARCHAR(16) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `htmlLang` VARCHAR(10) NOT NULL DEFAULT 'en',
    `dir` VARCHAR(3) NOT NULL DEFAULT 'ltr',
    `flag` VARCHAR(191) NOT NULL DEFAULT '🌐',
    `dateLocale` VARCHAR(16) NOT NULL DEFAULT 'en-US',
    `currency` VARCHAR(3) NOT NULL DEFAULT 'USD',
    `numberLocale` VARCHAR(16) NOT NULL DEFAULT 'en-US',
    `isEnabled` BOOLEAN NOT NULL DEFAULT true,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `LocaleConfig_code_key`(`code`),
    UNIQUE INDEX `LocaleConfig_urlPrefix_key`(`urlPrefix`),
    INDEX `LocaleConfig_isEnabled_sortOrder_idx`(`isEnabled`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

    INDEX `EntityTranslation_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `EntityTranslation_languageCode_entityType_idx`(`languageCode`, `entityType`),
    INDEX `EntityTranslation_entityType_languageCode_status_idx`(`entityType`, `languageCode`, `status`),
    UNIQUE INDEX `EntityTranslation_entityType_entityId_field_languageCode_key`(`entityType`, `entityId`, `field`, `languageCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
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

-- CreateTable
CREATE TABLE `LocalizedSlug` (
    `id` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(64) NOT NULL,
    `entityId` VARCHAR(36) NOT NULL,
    `languageCode` VARCHAR(16) NOT NULL,
    `slug` VARCHAR(128) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LocalizedSlug_entityType_slug_idx`(`entityType`, `slug`),
    UNIQUE INDEX `LocalizedSlug_entityType_entityId_languageCode_key`(`entityType`, `entityId`, `languageCode`),
    UNIQUE INDEX `LocalizedSlug_entityType_slug_languageCode_key`(`entityType`, `slug`, `languageCode`),
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

-- CreateTable
CREATE TABLE `UiMessage` (
    `id` VARCHAR(191) NOT NULL,
    `namespace` VARCHAR(64) NOT NULL,
    `key` VARCHAR(128) NOT NULL,
    `languageCode` VARCHAR(16) NOT NULL,
    `value` TEXT NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED') NOT NULL DEFAULT 'PUBLISHED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `UiMessage_languageCode_namespace_idx`(`languageCode`, `namespace`),
    UNIQUE INDEX `UiMessage_namespace_key_languageCode_key`(`namespace`, `key`, `languageCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FormTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `category` ENUM('LEAD', 'CONTACT', 'MULTI_STEP', 'GENERAL') NOT NULL DEFAULT 'GENERAL',
    `description` TEXT NULL,
    `definition` JSON NOT NULL,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `FormTemplate_slug_key`(`slug`),
    INDEX `FormTemplate_category_isPublished_idx`(`category`, `isPublished`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FormSubmission` (
    `id` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NULL,
    `blockType` VARCHAR(64) NULL,
    `blockId` VARCHAR(64) NULL,
    `pageId` VARCHAR(36) NULL,
    `pageSlug` VARCHAR(256) NULL,
    `locale` VARCHAR(16) NOT NULL DEFAULT 'en',
    `payload` JSON NOT NULL,
    `score` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('NEW', 'REVIEWED', 'ARCHIVED') NOT NULL DEFAULT 'NEW',
    `utm` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FormSubmission_templateId_createdAt_idx`(`templateId`, `createdAt`),
    INDEX `FormSubmission_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `FormSubmission_blockType_idx`(`blockType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FormDraft` (
    `id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(64) NOT NULL,
    `templateId` VARCHAR(191) NOT NULL,
    `payload` JSON NOT NULL,
    `currentStep` INTEGER NOT NULL DEFAULT 0,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `FormDraft_token_key`(`token`),
    INDEX `FormDraft_templateId_idx`(`templateId`),
    INDEX `FormDraft_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NewsletterSubscriber` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(120) NOT NULL,
    `name` VARCHAR(191) NULL,
    `segment` VARCHAR(64) NOT NULL DEFAULT 'default',
    `status` ENUM('PENDING', 'CONFIRMED', 'UNSUBSCRIBED') NOT NULL DEFAULT 'PENDING',
    `confirmToken` VARCHAR(64) NULL,
    `confirmedAt` DATETIME(3) NULL,
    `locale` VARCHAR(16) NOT NULL DEFAULT 'en',
    `metadata` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `NewsletterSubscriber_confirmToken_key`(`confirmToken`),
    INDEX `NewsletterSubscriber_status_segment_idx`(`status`, `segment`),
    INDEX `NewsletterSubscriber_createdAt_idx`(`createdAt`),
    UNIQUE INDEX `NewsletterSubscriber_email_segment_key`(`email`, `segment`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DownloadGateUnlock` (
    `id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(64) NOT NULL,
    `mediaAssetId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `unlockMethod` ENUM('FORM', 'NEWSLETTER', 'EXTERNAL') NOT NULL DEFAULT 'FORM',
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `DownloadGateUnlock_token_key`(`token`),
    INDEX `DownloadGateUnlock_mediaAssetId_idx`(`mediaAssetId`),
    INDEX `DownloadGateUnlock_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FormWebhookDelivery` (
    `id` VARCHAR(191) NOT NULL,
    `submissionId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(512) NOT NULL,
    `status` ENUM('PENDING', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `responseCode` INTEGER NULL,
    `error` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FormWebhookDelivery_submissionId_idx`(`submissionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PricingPlanSet` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NOT NULL,
    `descriptionEn` TEXT NOT NULL DEFAULT '',
    `descriptionAr` TEXT NOT NULL DEFAULT '',
    `currency` VARCHAR(3) NOT NULL DEFAULT 'USD',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PricingPlanSet_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PricingPlan` (
    `id` VARCHAR(191) NOT NULL,
    `planSetId` VARCHAR(36) NOT NULL,
    `nameEn` VARCHAR(191) NOT NULL,
    `nameAr` VARCHAR(191) NOT NULL,
    `descriptionEn` TEXT NOT NULL DEFAULT '',
    `descriptionAr` TEXT NOT NULL DEFAULT '',
    `priceMonthly` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `priceYearly` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `discountPercent` INTEGER NOT NULL DEFAULT 0,
    `badgeEn` VARCHAR(191) NOT NULL DEFAULT '',
    `badgeAr` VARCHAR(191) NOT NULL DEFAULT '',
    `isHighlighted` BOOLEAN NOT NULL DEFAULT false,
    `ctaLabelEn` VARCHAR(191) NOT NULL DEFAULT 'Get started',
    `ctaLabelAr` VARCHAR(191) NOT NULL DEFAULT 'ابدأ الآن',
    `ctaHref` VARCHAR(191) NOT NULL DEFAULT '/contact',
    `featureValues` JSON NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PricingPlan_planSetId_sortOrder_idx`(`planSetId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PricingPlanFeature` (
    `id` VARCHAR(191) NOT NULL,
    `planSetId` VARCHAR(36) NOT NULL,
    `labelEn` VARCHAR(191) NOT NULL,
    `labelAr` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PricingPlanFeature_planSetId_sortOrder_idx`(`planSetId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReleaseSet` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NOT NULL,
    `descriptionEn` TEXT NOT NULL DEFAULT '',
    `descriptionAr` TEXT NOT NULL DEFAULT '',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ReleaseSet_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Release` (
    `id` VARCHAR(191) NOT NULL,
    `releaseSetId` VARCHAR(36) NOT NULL,
    `version` VARCHAR(64) NOT NULL,
    `releaseDate` DATETIME(3) NULL,
    `status` ENUM('RELEASED', 'BETA', 'DEPRECATED') NOT NULL DEFAULT 'RELEASED',
    `tags` JSON NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Release_releaseSetId_sortOrder_idx`(`releaseSetId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReleaseEntry` (
    `id` VARCHAR(191) NOT NULL,
    `releaseId` VARCHAR(36) NOT NULL,
    `category` ENUM('FEATURES', 'IMPROVEMENTS', 'FIXES', 'BREAKING') NOT NULL DEFAULT 'FEATURES',
    `textEn` TEXT NOT NULL,
    `textAr` TEXT NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ReleaseEntry_releaseId_category_sortOrder_idx`(`releaseId`, `category`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PricingCalculator` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NOT NULL,
    `descriptionEn` TEXT NOT NULL DEFAULT '',
    `descriptionAr` TEXT NOT NULL DEFAULT '',
    `currency` VARCHAR(3) NOT NULL DEFAULT 'USD',
    `basePrice` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PricingCalculator_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PricingCalculatorField` (
    `id` VARCHAR(191) NOT NULL,
    `calculatorId` VARCHAR(36) NOT NULL,
    `key` VARCHAR(64) NOT NULL,
    `labelEn` VARCHAR(191) NOT NULL,
    `labelAr` VARCHAR(191) NOT NULL,
    `fieldType` ENUM('NUMBER', 'SELECT', 'TOGGLE') NOT NULL DEFAULT 'NUMBER',
    `options` JSON NOT NULL,
    `defaultValue` VARCHAR(191) NOT NULL DEFAULT '',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PricingCalculatorField_calculatorId_sortOrder_idx`(`calculatorId`, `sortOrder`),
    UNIQUE INDEX `PricingCalculatorField_calculatorId_key_key`(`calculatorId`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PricingCalculatorRule` (
    `id` VARCHAR(191) NOT NULL,
    `calculatorId` VARCHAR(36) NOT NULL,
    `fieldKey` VARCHAR(64) NOT NULL,
    `operator` VARCHAR(16) NOT NULL DEFAULT 'eq',
    `value` VARCHAR(191) NOT NULL DEFAULT '',
    `priceDelta` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `multiplier` DECIMAL(8, 4) NOT NULL DEFAULT 1,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PricingCalculatorRule_calculatorId_sortOrder_idx`(`calculatorId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KnowledgeBase` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NOT NULL,
    `descriptionEn` TEXT NOT NULL DEFAULT '',
    `descriptionAr` TEXT NOT NULL DEFAULT '',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `KnowledgeBase_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KnowledgeCategory` (
    `id` VARCHAR(191) NOT NULL,
    `knowledgeBaseId` VARCHAR(36) NOT NULL,
    `parentId` VARCHAR(36) NULL,
    `slug` VARCHAR(64) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `KnowledgeCategory_knowledgeBaseId_parentId_sortOrder_idx`(`knowledgeBaseId`, `parentId`, `sortOrder`),
    UNIQUE INDEX `KnowledgeCategory_knowledgeBaseId_slug_key`(`knowledgeBaseId`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KnowledgeArticle` (
    `id` VARCHAR(191) NOT NULL,
    `knowledgeBaseId` VARCHAR(36) NOT NULL,
    `categoryId` VARCHAR(36) NULL,
    `slug` VARCHAR(64) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NOT NULL,
    `excerptEn` TEXT NOT NULL DEFAULT '',
    `excerptAr` TEXT NOT NULL DEFAULT '',
    `bodyEn` TEXT NOT NULL DEFAULT '',
    `bodyAr` TEXT NOT NULL DEFAULT '',
    `ratingSum` INTEGER NOT NULL DEFAULT 0,
    `ratingCount` INTEGER NOT NULL DEFAULT 0,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `KnowledgeArticle_knowledgeBaseId_categoryId_sortOrder_idx`(`knowledgeBaseId`, `categoryId`, `sortOrder`),
    UNIQUE INDEX `KnowledgeArticle_knowledgeBaseId_slug_key`(`knowledgeBaseId`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocPortal` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NOT NULL,
    `descriptionEn` TEXT NOT NULL DEFAULT '',
    `descriptionAr` TEXT NOT NULL DEFAULT '',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DocPortal_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocVersion` (
    `id` VARCHAR(191) NOT NULL,
    `portalId` VARCHAR(36) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `labelEn` VARCHAR(191) NOT NULL,
    `labelAr` VARCHAR(191) NOT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DocVersion_portalId_sortOrder_idx`(`portalId`, `sortOrder`),
    UNIQUE INDEX `DocVersion_portalId_slug_key`(`portalId`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocSection` (
    `id` VARCHAR(191) NOT NULL,
    `portalId` VARCHAR(36) NOT NULL,
    `versionId` VARCHAR(36) NULL,
    `parentId` VARCHAR(36) NULL,
    `slug` VARCHAR(64) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NOT NULL,
    `href` VARCHAR(191) NOT NULL DEFAULT '',
    `contentEn` TEXT NOT NULL DEFAULT '',
    `contentAr` TEXT NOT NULL DEFAULT '',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DocSection_portalId_versionId_parentId_sortOrder_idx`(`portalId`, `versionId`, `parentId`, `sortOrder`),
    UNIQUE INDEX `DocSection_portalId_slug_key`(`portalId`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StatusBoard` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NOT NULL,
    `descriptionEn` TEXT NOT NULL DEFAULT '',
    `descriptionAr` TEXT NOT NULL DEFAULT '',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `StatusBoard_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StatusService` (
    `id` VARCHAR(191) NOT NULL,
    `boardId` VARCHAR(36) NOT NULL,
    `nameEn` VARCHAR(191) NOT NULL,
    `nameAr` VARCHAR(191) NOT NULL,
    `descriptionEn` TEXT NOT NULL DEFAULT '',
    `descriptionAr` TEXT NOT NULL DEFAULT '',
    `status` ENUM('OPERATIONAL', 'DEGRADED', 'PARTIAL_OUTAGE', 'MAJOR_OUTAGE', 'MAINTENANCE') NOT NULL DEFAULT 'OPERATIONAL',
    `uptimePercent` DECIMAL(5, 2) NOT NULL DEFAULT 100,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StatusService_boardId_sortOrder_idx`(`boardId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StatusIncident` (
    `id` VARCHAR(191) NOT NULL,
    `boardId` VARCHAR(36) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NOT NULL,
    `messageEn` TEXT NOT NULL,
    `messageAr` TEXT NOT NULL,
    `status` ENUM('INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED') NOT NULL DEFAULT 'INVESTIGATING',
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolvedAt` DATETIME(3) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StatusIncident_boardId_sortOrder_idx`(`boardId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StatusMaintenance` (
    `id` VARCHAR(191) NOT NULL,
    `boardId` VARCHAR(36) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NOT NULL,
    `messageEn` TEXT NOT NULL,
    `messageAr` TEXT NOT NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StatusMaintenance_boardId_startsAt_idx`(`boardId`, `startsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TeamDirectory` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NOT NULL,
    `descriptionEn` TEXT NOT NULL DEFAULT '',
    `descriptionAr` TEXT NOT NULL DEFAULT '',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TeamDirectory_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TeamDepartment` (
    `id` VARCHAR(191) NOT NULL,
    `directoryId` VARCHAR(36) NOT NULL,
    `nameEn` VARCHAR(191) NOT NULL,
    `nameAr` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TeamDepartment_directoryId_sortOrder_idx`(`directoryId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TeamMember` (
    `id` VARCHAR(191) NOT NULL,
    `directoryId` VARCHAR(36) NOT NULL,
    `departmentId` VARCHAR(36) NULL,
    `nameEn` VARCHAR(191) NOT NULL,
    `nameAr` VARCHAR(191) NOT NULL,
    `roleEn` VARCHAR(191) NOT NULL DEFAULT '',
    `roleAr` VARCHAR(191) NOT NULL DEFAULT '',
    `bioEn` TEXT NOT NULL DEFAULT '',
    `bioAr` TEXT NOT NULL DEFAULT '',
    `email` VARCHAR(191) NOT NULL DEFAULT '',
    `phone` VARCHAR(191) NOT NULL DEFAULT '',
    `locationEn` VARCHAR(191) NOT NULL DEFAULT '',
    `locationAr` VARCHAR(191) NOT NULL DEFAULT '',
    `skills` JSON NOT NULL,
    `imageUrl` VARCHAR(191) NOT NULL DEFAULT '',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TeamMember_directoryId_departmentId_sortOrder_idx`(`directoryId`, `departmentId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PartnerProgram` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NOT NULL,
    `descriptionEn` TEXT NOT NULL DEFAULT '',
    `descriptionAr` TEXT NOT NULL DEFAULT '',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PartnerProgram_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PartnerCategory` (
    `id` VARCHAR(191) NOT NULL,
    `programId` VARCHAR(36) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `nameEn` VARCHAR(191) NOT NULL,
    `nameAr` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PartnerCategory_programId_sortOrder_idx`(`programId`, `sortOrder`),
    UNIQUE INDEX `PartnerCategory_programId_slug_key`(`programId`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Partner` (
    `id` VARCHAR(191) NOT NULL,
    `programId` VARCHAR(36) NOT NULL,
    `categoryId` VARCHAR(36) NULL,
    `nameEn` VARCHAR(191) NOT NULL,
    `nameAr` VARCHAR(191) NOT NULL,
    `descriptionEn` TEXT NOT NULL DEFAULT '',
    `descriptionAr` TEXT NOT NULL DEFAULT '',
    `logoUrl` VARCHAR(191) NOT NULL DEFAULT '',
    `websiteUrl` VARCHAR(191) NOT NULL DEFAULT '',
    `profileUrl` VARCHAR(191) NOT NULL DEFAULT '',
    `email` VARCHAR(191) NOT NULL DEFAULT '',
    `phone` VARCHAR(191) NOT NULL DEFAULT '',
    `locationEn` VARCHAR(191) NOT NULL DEFAULT '',
    `locationAr` VARCHAR(191) NOT NULL DEFAULT '',
    `latitude` DECIMAL(10, 7) NULL,
    `longitude` DECIMAL(10, 7) NULL,
    `certifications` JSON NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Partner_programId_categoryId_sortOrder_idx`(`programId`, `categoryId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PasswordResetToken` ADD CONSTRAINT `PasswordResetToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserFavorite` ADD CONSTRAINT `UserFavorite_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GalleryMedia` ADD CONSTRAINT `GalleryMedia_galleryId_fkey` FOREIGN KEY (`galleryId`) REFERENCES `Gallery`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TestimonialCollectionItem` ADD CONSTRAINT `TestimonialCollectionItem_collectionId_fkey` FOREIGN KEY (`collectionId`) REFERENCES `TestimonialCollection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TestimonialCollectionItem` ADD CONSTRAINT `TestimonialCollectionItem_testimonialId_fkey` FOREIGN KEY (`testimonialId`) REFERENCES `Testimonial`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inquiry` ADD CONSTRAINT `Inquiry_contentItemId_fkey` FOREIGN KEY (`contentItemId`) REFERENCES `ContentItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inquiry` ADD CONSTRAINT `Inquiry_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE `FormSubmission` ADD CONSTRAINT `FormSubmission_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `FormTemplate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FormDraft` ADD CONSTRAINT `FormDraft_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `FormTemplate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DownloadGateUnlock` ADD CONSTRAINT `DownloadGateUnlock_mediaAssetId_fkey` FOREIGN KEY (`mediaAssetId`) REFERENCES `MediaAsset`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FormWebhookDelivery` ADD CONSTRAINT `FormWebhookDelivery_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `FormSubmission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PricingPlan` ADD CONSTRAINT `PricingPlan_planSetId_fkey` FOREIGN KEY (`planSetId`) REFERENCES `PricingPlanSet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PricingPlanFeature` ADD CONSTRAINT `PricingPlanFeature_planSetId_fkey` FOREIGN KEY (`planSetId`) REFERENCES `PricingPlanSet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Release` ADD CONSTRAINT `Release_releaseSetId_fkey` FOREIGN KEY (`releaseSetId`) REFERENCES `ReleaseSet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReleaseEntry` ADD CONSTRAINT `ReleaseEntry_releaseId_fkey` FOREIGN KEY (`releaseId`) REFERENCES `Release`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PricingCalculatorField` ADD CONSTRAINT `PricingCalculatorField_calculatorId_fkey` FOREIGN KEY (`calculatorId`) REFERENCES `PricingCalculator`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PricingCalculatorRule` ADD CONSTRAINT `PricingCalculatorRule_calculatorId_fkey` FOREIGN KEY (`calculatorId`) REFERENCES `PricingCalculator`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KnowledgeCategory` ADD CONSTRAINT `KnowledgeCategory_knowledgeBaseId_fkey` FOREIGN KEY (`knowledgeBaseId`) REFERENCES `KnowledgeBase`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KnowledgeArticle` ADD CONSTRAINT `KnowledgeArticle_knowledgeBaseId_fkey` FOREIGN KEY (`knowledgeBaseId`) REFERENCES `KnowledgeBase`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KnowledgeArticle` ADD CONSTRAINT `KnowledgeArticle_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `KnowledgeCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocVersion` ADD CONSTRAINT `DocVersion_portalId_fkey` FOREIGN KEY (`portalId`) REFERENCES `DocPortal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocSection` ADD CONSTRAINT `DocSection_portalId_fkey` FOREIGN KEY (`portalId`) REFERENCES `DocPortal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocSection` ADD CONSTRAINT `DocSection_versionId_fkey` FOREIGN KEY (`versionId`) REFERENCES `DocVersion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StatusService` ADD CONSTRAINT `StatusService_boardId_fkey` FOREIGN KEY (`boardId`) REFERENCES `StatusBoard`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StatusIncident` ADD CONSTRAINT `StatusIncident_boardId_fkey` FOREIGN KEY (`boardId`) REFERENCES `StatusBoard`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StatusMaintenance` ADD CONSTRAINT `StatusMaintenance_boardId_fkey` FOREIGN KEY (`boardId`) REFERENCES `StatusBoard`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamDepartment` ADD CONSTRAINT `TeamDepartment_directoryId_fkey` FOREIGN KEY (`directoryId`) REFERENCES `TeamDirectory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamMember` ADD CONSTRAINT `TeamMember_directoryId_fkey` FOREIGN KEY (`directoryId`) REFERENCES `TeamDirectory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamMember` ADD CONSTRAINT `TeamMember_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `TeamDepartment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerCategory` ADD CONSTRAINT `PartnerCategory_programId_fkey` FOREIGN KEY (`programId`) REFERENCES `PartnerProgram`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Partner` ADD CONSTRAINT `Partner_programId_fkey` FOREIGN KEY (`programId`) REFERENCES `PartnerProgram`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Partner` ADD CONSTRAINT `Partner_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `PartnerCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

SET FOREIGN_KEY_CHECKS = 1;

-- AZURA seed data: demo-brt
-- Import AFTER 01-schema.sql (phpMyAdmin → Import)

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- CmsPage (17 rows)
INSERT INTO `CmsPage` (`id`, `slug`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `templateKey`, `status`, `blocks`, `publishedAt`, `scheduledAt`, `createdAt`, `updatedAt`, `visualSettings`) VALUES ('cmpv9628a001shf2w4z2l68c6', 'home', 'Home', 'الرئيسية', '', '', 'home', 'PUBLISHED', '[{"id":"hero-1","type":"hero","props":{"layout":"fullBleed","badgeAr":"أكثر من 10 سنوات خبرة","badgeEn":"10+ Years of Experience","ctaHref":"/contact","titleAr":"حلول لاسلكية وتقنية ذكية مبتكرة","titleEn":"Innovative Wireless & Smart Technology Solutions","imageUrl":"/demo/brt/hero.svg","minHeight":"70vh","ctaLabelAr":"احصل على عرض","ctaLabelEn":"Get a Quote","subtitleAr":"ربط الشركات والأفراد عبر تقنيات متقدمة","subtitleEn":"Connecting businesses and individuals through advanced technology","mediaAssetId":"mock-media-hero","backgroundType":"image","overlayOpacity":60,"secondaryCtaHref":"/services","secondaryCtaLabelAr":"خدماتنا","secondaryCtaLabelEn":"Our Services"},"version":"2.0"},{"id":"statsCounter-2","type":"statsCounter","props":{"items":[{"id":"stat-1","icon":"","value":10,"prefix":"","suffix":"+","labelAr":"سنوات الخبرة","labelEn":"Years of Experience","chartData":[],"chartType":"none","descriptionAr":"","descriptionEn":""},{"id":"stat-2","icon":"","value":500,"prefix":"","suffix":"+","labelAr":"مشروع منجز","labelEn":"Projects Delivered","chartData":[],"chartType":"none","descriptionAr":"","descriptionEn":""},{"id":"stat-3","icon":"","value":99,"prefix":"","suffix":"%","labelAr":"رضا العملاء","labelEn":"Client Satisfaction","chartData":[],"chartType":"none","descriptionAr":"","descriptionEn":""}],"layout":"grid","titleAr":"سجل حافل بالإنجازات","titleEn":"Proven Track Record","subtitleAr":"","subtitleEn":"","animateOnView":true},"version":"2.0"},{"id":"featureGrid-3","type":"featureGrid","props":{"items":[{"id":"feat-1","href":"/enterprise-wireless","icon":"fa-wifi","titleAr":"شبكات لاسلكية","titleEn":"Enterprise Wireless","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"بنية Wi-Fi قوية وتحسين الشبكة.","descriptionEn":"Robust Wi-Fi infrastructure and network optimization."},{"id":"feat-2","href":"/services","icon":"fa-signal","titleAr":"تغطية داخلية","titleEn":"Indoor Coverage","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"حلول تعزيز الإشارة على مستوى المبنى.","descriptionEn":"Building-wide signal enhancement solutions."},{"id":"feat-3","href":"/smart-home","icon":"fa-home","titleAr":"المنزل الذكي","titleEn":"Smart Home","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"أتمتة ذكية للمعيشة العصرية.","descriptionEn":"Intelligent automation for modern living."},{"id":"feat-4","href":"/security-solutions","icon":"fa-shield","titleAr":"أنظمة الأمن","titleEn":"Security Systems","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"CCTV والتحكم في الوصول والأقفال الذكية.","descriptionEn":"CCTV, access control, and smart locks."},{"id":"feat-5","href":"/services","icon":"fa-microchip","titleAr":"إنترنت الأشياء","titleEn":"IoT & Connected Tech","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"تكامل الأجهزة وأتمتة العمليات.","descriptionEn":"Device integration and process automation."},{"id":"feat-6","href":"/services","icon":"fa-phone","titleAr":"IP PBX","titleEn":"IP PBX & UC","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"اتصالات موحدة للمؤسسات.","descriptionEn":"Unified communications for enterprises."},{"id":"feat-7","href":"/services","icon":"fa-server","titleAr":"البنية التحتية","titleEn":"Infrastructure","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"حلول بنية شبكة قابلة للتوسع.","descriptionEn":"Scalable network infrastructure solutions."}],"columns":3,"titleAr":"الخبرات الأساسية","titleEn":"Core Expertise","subtitleAr":"حلول تقنية متكاملة للمؤسسات والمنازل","subtitleEn":"End-to-end technology solutions for enterprises and homes","cardVariant":"iconTop","showCategories":false},"version":"2.0"},{"id":"catalog-4","type":"catalog","props":{"city":"","limit":6,"source":"services","titleAr":"خدماتنا","titleEn":"Our Services","manualIds":[],"subtitleAr":"حلول تقنية شاملة مصممة لاحتياجاتك","subtitleEn":"Comprehensive technology solutions tailored to your needs","serviceType":"","viewAllHref":"/services","categorySlug":"","featuredOnly":false,"emptyMessageAr":"","emptyMessageEn":"","displaySettings":{"limit":6,"columns":3,"autoplay":false,"showCity":true,"showIcon":true,"showPrice":true,"showStars":true,"layoutMode":"grid","cardVariant":"default","showExcerpt":true,"showCategory":true,"showDuration":true,"showViewAllLink":true,"autoplayIntervalMs":5000}},"version":"2.0"},{"id":"testimonials-5","type":"testimonials","props":{"limit":6,"source":"collection","columns":3,"titleAr":"ماذا يقول عملاؤنا","titleEn":"What Our Clients Say","autoplay":false,"layoutMode":"grid","subtitleAr":"موثوق من المؤسسات وأصحاب المنازل في الإمارات","subtitleEn":"Trusted by enterprises and homeowners across the UAE","cardVariant":"default","sliderEnabled":false,"testimonialIds":[],"showViewAllLink":true,"autoplayIntervalMs":5000,"testimonialCollectionSlug":"brt-clients"},"version":"2.0"},{"id":"logoCloud-6","type":"logoCloud","props":{"items":[{"id":"logo-1","href":"","nameAr":"أمازون أليكسا","nameEn":"Amazon Alexa","imageUrl":"","categoryAr":"","categoryEn":"","mediaAssetId":""},{"id":"logo-2","href":"","nameAr":"مساعد جوجل","nameEn":"Google Assistant","imageUrl":"","categoryAr":"","categoryEn":"","mediaAssetId":""},{"id":"logo-3","href":"","nameAr":"آبل سيري","nameEn":"Apple Siri","imageUrl":"","categoryAr":"","categoryEn":"","mediaAssetId":""}],"columns":3,"titleAr":"منصات التكامل الصوتي","titleEn":"Voice Integration Platforms","autoplay":false,"logoSize":"md","grayscale":true,"subtitleAr":"","subtitleEn":"","displayMode":"grid","grayscaleHover":true,"groupByCategory":false,"autoplayIntervalMs":4000},"version":"2.0"},{"id":"cta-7","type":"cta","props":{"href":"/contact","size":"default","layout":"centered","titleAr":"مستعد لتحويل تقنياتك؟","titleEn":"Ready to Transform Your Technology?","buttonAr":"اتصل بنا","buttonEn":"Contact Us","subtitleAr":"تواصل معنا لاستشارة مجانية وحل مخصص.","subtitleEn":"Contact us for a free consultation and customized solution.","secondaryHref":"","backgroundType":"gradient","secondaryButtonAr":"","secondaryButtonEn":""},"version":"2.0"}]', '2026-06-05 11:01:42.387', NULL, '2026-06-01 13:36:59.338', '2026-06-05 11:01:42.404', '{"siteEffects":{"background":"inherit"},"animationsEnabled":true}');
INSERT INTO `CmsPage` (`id`, `slug`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `templateKey`, `status`, `blocks`, `publishedAt`, `scheduledAt`, `createdAt`, `updatedAt`, `visualSettings`) VALUES ('cmpv9628c001thf2w3e8te0ly', 'about', 'About Us', 'من نحن', '', '', 'about', 'PUBLISHED', '[{"id":"hero-8","type":"hero","props":{"layout":"centered","badgeAr":"","badgeEn":"","ctaHref":"/contact","titleAr":"عن BRT TRADING LLC","titleEn":"About BRT TRADING LLC","imageUrl":"","minHeight":"70vh","ctaLabelAr":"اتصل بنا","ctaLabelEn":"Contact Us","subtitleAr":"تصميم وتنفيذ ودعم بنى الاتصالات اللاسلكية المتقدمة","subtitleEn":"Designing, implementing, and supporting advanced wireless and communication infrastructures","mediaAssetId":"","backgroundType":"gradient","overlayOpacity":60,"secondaryCtaHref":"","secondaryCtaLabelAr":"","secondaryCtaLabelEn":""},"version":"2.0"},{"id":"advancedRichText-9","type":"advancedRichText","props":{"prose":true,"htmlAr":"<p>تتخصص BRT TRADING LLC في تصميم وتنفيذ ودعم بنى الاتصالات اللاسلكية المتقدمة للمؤسسات والمرافق التجارية والضيافة والتطويرات السكنية والقطاع الحكومي.</p><p>مهمتنا تقديم حلول تقنية موثوقة وقابلة للتوسع تعزز الاتصال وتحسن الأمن وتخلق بيئات أكثر ذكاءً.</p>","htmlEn":"<p>BRT TRADING LLC specializes in designing, implementing, and supporting advanced wireless and communication infrastructures for enterprises, commercial facilities, hospitality environments, residential developments, and government sectors.</p><p>Our mission is to deliver reliable, scalable, and future-ready technology solutions that enhance connectivity, improve security, and create smarter living and working environments.</p>","maxWidth":"reading","contentAr":"","contentEn":""},"version":"2.0"},{"id":"benefitsGrid-10","type":"benefitsGrid","props":{"items":[{"id":"benefit-1","href":"","icon":"fa-gem","titleAr":"الجودة","titleEn":"Quality","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"حلول موثوقة وعالية الأداء مبنية على تقنيات رائدة.","descriptionEn":"Reliable, high-performance solutions built on industry-leading technologies."},{"id":"benefit-2","href":"","icon":"fa-lightbulb","titleAr":"الابتكار","titleEn":"Innovation","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"اعتماد مستمر للتقنيات الناشئة لإبقاء العملاء في المقدمة.","descriptionEn":"Continuously adopting emerging technologies to keep clients ahead."},{"id":"benefit-3","href":"","icon":"fa-heart","titleAr":"رضا العملاء","titleEn":"Customer Satisfaction","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"شراكات طويلة الأمد عبر خدمة استثنائية ونتائج ملموسة.","descriptionEn":"Long-term partnerships through exceptional service and measurable results."}],"layout":"cards","titleAr":"التزامنا","titleEn":"Our Commitment","emphasis":"outcome","subtitleAr":"","subtitleEn":""},"version":"2.0"},{"id":"timeline-11","type":"timeline","props":{"items":[{"id":"step-1","date":"1","icon":"fa-circle","titleAr":"الاستشارة والتقييم","titleEn":"Consultation & Assessment","imageUrl":"","categoryAr":"","categoryEn":"","descriptionAr":"تقييم المتطلبات وظروف الموقع والأهداف.","descriptionEn":"Evaluate requirements, site conditions, and business objectives."},{"id":"step-2","date":"2","icon":"fa-circle","titleAr":"التصميم والتخطيط","titleEn":"Design & Planning","imageUrl":"","categoryAr":"","categoryEn":"","descriptionAr":"تصاميم مفصلة لأداء مثالي وقابلية التوسع.","descriptionEn":"Detailed designs for optimal performance and scalability."},{"id":"step-3","date":"3","icon":"fa-circle","titleAr":"التنفيذ","titleEn":"Implementation","imageUrl":"","categoryAr":"","categoryEn":"","descriptionAr":"تركيب وتكوين واختبار احترافي.","descriptionEn":"Professional installation, configuration, and testing."},{"id":"step-4","date":"4","icon":"fa-circle","titleAr":"التدريب","titleEn":"Training","imageUrl":"","categoryAr":"","categoryEn":"","descriptionAr":"تدريب شامل لتحقيق أقصى قيمة من الاستثمارات.","descriptionEn":"Comprehensive training for maximum value from investments."},{"id":"step-5","date":"5","icon":"fa-circle","titleAr":"الدعم المستمر","titleEn":"Ongoing Support","imageUrl":"","categoryAr":"","categoryEn":"","descriptionAr":"مراقبة ودعم وترقيات وتحسين.","descriptionEn":"Monitoring, support, upgrades, and optimization."}],"layout":"vertical","titleAr":"عمليتنا","titleEn":"Our Process"},"version":"2.0"},{"id":"trustBadges-12","type":"trustBadges","props":{"items":[{"id":"badge-1","href":"","icon":"fa-award","labelAr":"أكثر من 10 سنوات","labelEn":"10+ Years Experience","imageUrl":"","mediaAssetId":"","descriptionAr":"","descriptionEn":""},{"id":"badge-2","href":"","icon":"fa-briefcase","labelAr":"أكثر من 500 مشروع","labelEn":"500+ Projects","imageUrl":"","mediaAssetId":"","descriptionAr":"","descriptionEn":""},{"id":"badge-3","href":"","icon":"fa-building","labelAr":"مستوى المؤسسات","labelEn":"Enterprise-Grade","imageUrl":"","mediaAssetId":"","descriptionAr":"","descriptionEn":""},{"id":"badge-4","href":"","icon":"fa-truck","labelAr":"تسليم متكامل","labelEn":"End-to-End Delivery","imageUrl":"","mediaAssetId":"","descriptionAr":"","descriptionEn":""}],"layout":"grid","titleAr":"لماذا تختار BRT TRADING LLC؟","titleEn":"Why Choose BRT TRADING LLC?","subtitleAr":"","subtitleEn":"","registrationNo":""},"version":"2.0"}]', '2026-06-05 11:01:42.387', NULL, '2026-06-01 13:36:59.340', '2026-06-05 11:01:42.409', '{}');
INSERT INTO `CmsPage` (`id`, `slug`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `templateKey`, `status`, `blocks`, `publishedAt`, `scheduledAt`, `createdAt`, `updatedAt`, `visualSettings`) VALUES ('cmpv9628d001uhf2wj35o8c1o', 'contact', 'Contact', 'اتصل بنا', '', '', 'contact', 'PUBLISHED', '[{"id":"hero-31","type":"hero","props":{"layout":"centered","badgeAr":"","badgeEn":"","ctaHref":"/contact","titleAr":"اتصل بنا","titleEn":"Contact Us","imageUrl":"","minHeight":"70vh","ctaLabelAr":"","ctaLabelEn":"","subtitleAr":"تواصل معنا لاستشارة مجانية وحل مخصص","subtitleEn":"Get in touch for a free consultation and customized solution","mediaAssetId":"","backgroundType":"gradient","overlayOpacity":60,"secondaryCtaHref":"","secondaryCtaLabelAr":"","secondaryCtaLabelEn":""},"version":"2.0"},{"id":"contactFormBuilder-32","type":"contactFormBuilder","props":{"layout":"stacked","titleAr":"أرسل لنا رسالة","titleEn":"Send Us a Message","templateId":"mock-form-brt-contact","redirectUrl":"","successMessageAr":"شكراً لك! سنتواصل معك قريباً.","successMessageEn":"Thank you! We will be in touch shortly."},"version":"2.0"},{"id":"richText-33","type":"richText","props":{"htmlAr":"<p><strong>BRT TRADING LLC</strong></p><p>📧 info@brt-me.com</p><p>🌐 www.brt-me.com</p><p>📞 +971 55 472 7292</p><p><em>تمكين الاتصال. تعزيز الأمن. تمكين المعيشة الذكية.</em></p>","htmlEn":"<p><strong>BRT TRADING LLC</strong></p><p>📧 info@brt-me.com</p><p>🌐 www.brt-me.com</p><p>📞 +971 55 472 7292</p><p><em>Empowering Connectivity. Enhancing Security. Enabling Smart Living.</em></p>"},"version":"2.0"}]', '2026-06-05 11:01:42.387', NULL, '2026-06-01 13:36:59.342', '2026-06-05 11:01:42.428', '{}');
INSERT INTO `CmsPage` (`id`, `slug`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `templateKey`, `status`, `blocks`, `publishedAt`, `scheduledAt`, `createdAt`, `updatedAt`, `visualSettings`) VALUES ('cmpv9628f001vhf2wywizdn0i', 'packages', '', '', '', '', 'packages', 'DRAFT', '[]', NULL, NULL, '2026-06-01 13:36:59.343', '2026-06-05 11:01:42.433', '{}');
INSERT INTO `CmsPage` (`id`, `slug`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `templateKey`, `status`, `blocks`, `publishedAt`, `scheduledAt`, `createdAt`, `updatedAt`, `visualSettings`) VALUES ('cmpv9628i001xhf2wh2ban5s8', 'gallery', 'Gallery', 'المعرض', '', '', 'gallery', 'PUBLISHED', '[{"id":"hero-27","type":"hero","props":{"layout":"centered","badgeAr":"","badgeEn":"","ctaHref":"/contact","titleAr":"معرض المشاريع","titleEn":"Project Gallery","imageUrl":"","minHeight":"70vh","ctaLabelAr":"","ctaLabelEn":"","subtitleAr":"استكشف مشاريعنا المكتملة في الاتصالات والأمن والتقنية الذكية","subtitleEn":"Explore our completed wireless, security, and smart technology projects","mediaAssetId":"","backgroundType":"gradient","overlayOpacity":60,"secondaryCtaHref":"","secondaryCtaLabelAr":"","secondaryCtaLabelEn":""},"version":"2.0"},{"id":"gallery-28","type":"gallery","props":{"limit":0,"columns":3,"titleAr":"أعمالنا","titleEn":"Our Work","variant":"grid","gallerySlug":"brt-projects","showViewAllLink":true},"version":"2.0"}]', '2026-06-05 11:01:42.387', NULL, '2026-06-01 13:36:59.347', '2026-06-05 11:01:42.424', '{}');
INSERT INTO `CmsPage` (`id`, `slug`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `templateKey`, `status`, `blocks`, `publishedAt`, `scheduledAt`, `createdAt`, `updatedAt`, `visualSettings`) VALUES ('cmpv9628k001yhf2wm8z0982c', 'testimonials', 'Testimonials', 'آراء العملاء', '', '', 'testimonials', 'PUBLISHED', '[{"id":"hero-29","type":"hero","props":{"layout":"centered","badgeAr":"","badgeEn":"","ctaHref":"/contact","titleAr":"آراء العملاء","titleEn":"Client Testimonials","imageUrl":"","minHeight":"70vh","ctaLabelAr":"","ctaLabelEn":"","subtitleAr":"استمع إلى الشركات وأصحاب المنازل الذين يثقون بـ BRT","subtitleEn":"Hear from businesses and homeowners who trust BRT TRADING LLC","mediaAssetId":"","backgroundType":"gradient","overlayOpacity":60,"secondaryCtaHref":"","secondaryCtaLabelAr":"","secondaryCtaLabelEn":""},"version":"2.0"},{"id":"testimonials-30","type":"testimonials","props":{"limit":12,"source":"collection","columns":3,"titleAr":"ماذا يقول عملاؤنا","titleEn":"What Our Clients Say","autoplay":false,"layoutMode":"grid","subtitleAr":"","subtitleEn":"","cardVariant":"default","sliderEnabled":false,"testimonialIds":[],"showViewAllLink":true,"autoplayIntervalMs":5000,"testimonialCollectionSlug":"brt-clients"},"version":"2.0"}]', '2026-06-05 11:01:42.387', NULL, '2026-06-01 13:36:59.348', '2026-06-05 11:01:42.426', '{}');
INSERT INTO `CmsPage` (`id`, `slug`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `templateKey`, `status`, `blocks`, `publishedAt`, `scheduledAt`, `createdAt`, `updatedAt`, `visualSettings`) VALUES ('cmpv9628l001zhf2wrg4nzifr', 'hotels-transport', '', '', '', '', 'hotels-transport', 'DRAFT', '[]', NULL, NULL, '2026-06-01 13:36:59.350', '2026-06-05 11:01:42.435', '{}');
INSERT INTO `CmsPage` (`id`, `slug`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `templateKey`, `status`, `blocks`, `publishedAt`, `scheduledAt`, `createdAt`, `updatedAt`, `visualSettings`) VALUES ('cmq05v0tp0007hflkcksu8qmq', 'products', '', '', '', '', 'products', 'DRAFT', '[]', NULL, NULL, '2026-06-05 00:03:16.334', '2026-06-05 11:01:42.436', '{}');
INSERT INTO `CmsPage` (`id`, `slug`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `templateKey`, `status`, `blocks`, `publishedAt`, `scheduledAt`, `createdAt`, `updatedAt`, `visualSettings`) VALUES ('cmq05v0u30008hflkq684a21o', 'collections', '', '', '', '', 'collections', 'DRAFT', '[]', NULL, NULL, '2026-06-05 00:03:16.348', '2026-06-05 11:01:42.437', '{}');
INSERT INTO `CmsPage` (`id`, `slug`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `templateKey`, `status`, `blocks`, `publishedAt`, `scheduledAt`, `createdAt`, `updatedAt`, `visualSettings`) VALUES ('cmq05v0u80009hflksefq0grx', 'services', 'Services', 'الخدمات', '', '', 'services', 'PUBLISHED', '[{"id":"hero-13","type":"hero","props":{"layout":"centered","badgeAr":"","badgeEn":"","ctaHref":"/contact","titleAr":"خدماتنا","titleEn":"Our Services","imageUrl":"","minHeight":"70vh","ctaLabelAr":"اطلب عرضاً","ctaLabelEn":"Request a Quote","subtitleAr":"حلول شاملة للاتصالات اللاسلكية والأمن والتقنية الذكية","subtitleEn":"Comprehensive wireless, security, and smart technology solutions","mediaAssetId":"","backgroundType":"gradient","overlayOpacity":60,"secondaryCtaHref":"","secondaryCtaLabelAr":"","secondaryCtaLabelEn":""},"version":"2.0"},{"id":"catalog-14","type":"catalog","props":{"city":"","limit":12,"source":"services","titleAr":"جميع الخدمات","titleEn":"All Services","manualIds":[],"subtitleAr":"","subtitleEn":"","serviceType":"","viewAllHref":"/services","categorySlug":"","featuredOnly":false,"emptyMessageAr":"","emptyMessageEn":"","displaySettings":{"limit":12,"columns":3,"autoplay":false,"showCity":true,"showIcon":true,"showPrice":true,"showStars":true,"layoutMode":"grid","cardVariant":"default","showExcerpt":true,"showCategory":true,"showDuration":true,"showViewAllLink":true,"autoplayIntervalMs":5000}},"version":"2.0"},{"id":"featureGrid-15","type":"featureGrid","props":{"items":[{"id":"feat-1","href":"/smart-home","icon":"fa-home","titleAr":"المنزل الذكي","titleEn":"Smart Home","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"أتمتة منزلية كاملة وتكامل صوتي.","descriptionEn":"Full home automation and voice integration."},{"id":"feat-2","href":"/security-solutions","icon":"fa-shield","titleAr":"الأمن","titleEn":"Security","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"مراقبة ذكية والتحكم في الوصول.","descriptionEn":"Intelligent surveillance and access control."},{"id":"feat-3","href":"/enterprise-wireless","icon":"fa-wifi","titleAr":"شبكة المؤسسات","titleEn":"Enterprise Wireless","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"تصميم ونشر وتحسين Wi-Fi.","descriptionEn":"Wi-Fi design, deployment, and optimization."}],"columns":3,"titleAr":"حلول متخصصة","titleEn":"Specialized Solutions","subtitleAr":"","subtitleEn":"","cardVariant":"iconTop","showCategories":false},"version":"2.0"}]', '2026-06-05 11:01:42.387', NULL, '2026-06-05 00:03:16.352', '2026-06-05 11:01:42.413', '{}');
INSERT INTO `CmsPage` (`id`, `slug`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `templateKey`, `status`, `blocks`, `publishedAt`, `scheduledAt`, `createdAt`, `updatedAt`, `visualSettings`) VALUES ('cmq05v0ub000ahflkd7ca8i8k', 'compare', '', '', '', '', 'compare', 'DRAFT', '[]', NULL, NULL, '2026-06-05 00:03:16.355', '2026-06-05 11:01:42.438', '{}');
INSERT INTO `CmsPage` (`id`, `slug`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `templateKey`, `status`, `blocks`, `publishedAt`, `scheduledAt`, `createdAt`, `updatedAt`, `visualSettings`) VALUES ('cmq05v0uf000bhflk8am0vhv5', 'favorites', '', '', '', '', 'favorites', 'DRAFT', '[]', NULL, NULL, '2026-06-05 00:03:16.360', '2026-06-05 11:01:42.439', '{}');
INSERT INTO `CmsPage` (`id`, `slug`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `templateKey`, `status`, `blocks`, `publishedAt`, `scheduledAt`, `createdAt`, `updatedAt`, `visualSettings`) VALUES ('cmq05v0uk000chflk5roi5z5m', 'account', '', '', '', '', 'account', 'DRAFT', '[]', NULL, NULL, '2026-06-05 00:03:16.364', '2026-06-05 11:01:42.440', '{}');
INSERT INTO `CmsPage` (`id`, `slug`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `templateKey`, `status`, `blocks`, `publishedAt`, `scheduledAt`, `createdAt`, `updatedAt`, `visualSettings`) VALUES ('cmq0j4wac0027hfd4sahais3b', 'smart-home', 'Smart Home Solutions', 'حلول المنزل الذكي', '', '', 'landing', 'PUBLISHED', '[{"id":"hero-16","type":"hero","props":{"layout":"centered","badgeAr":"","badgeEn":"","ctaHref":"/contact","titleAr":"تحويل المنازل عبر الأتمتة الذكية","titleEn":"Transforming Homes Through Intelligent Automation","imageUrl":"/images/placeholder.svg","minHeight":"70vh","ctaLabelAr":"ابدأ الآن","ctaLabelEn":"Get Started","subtitleAr":"راحة وأمان وكفاءة في استهلاك الطاقة","subtitleEn":"Convenience, comfort, security, and energy efficiency","mediaAssetId":"mock-media-service-smarthome","backgroundType":"image","overlayOpacity":60,"secondaryCtaHref":"","secondaryCtaLabelAr":"","secondaryCtaLabelEn":""},"version":"2.0"},{"id":"featureGrid-17","type":"featureGrid","props":{"items":[{"id":"feat-1","href":"","icon":"fa-magic","titleAr":"أتمتة المنزل","titleEn":"Home Automation","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"الإضاءة والمناخ والستائر والترفيه.","descriptionEn":"Lighting, climate, curtains, and entertainment."},{"id":"feat-2","href":"","icon":"fa-mobile","titleAr":"الوصول عن بُعد","titleEn":"Remote Access","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"التحكم من الهاتف أو الجهاز اللوحي أو الصوت.","descriptionEn":"Control from smartphone, tablet, or voice."},{"id":"feat-3","href":"","icon":"fa-lock","titleAr":"الأمن الذكي","titleEn":"Smart Security","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"أقفال ذكية وكاميرات وإشعارات فورية.","descriptionEn":"Smart locks, cameras, and instant notifications."},{"id":"feat-4","href":"","icon":"fa-bolt","titleAr":"إدارة الطاقة","titleEn":"Energy Management","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"تقليل تكاليف الطاقة بنسبة تصل إلى 30%.","descriptionEn":"Up to 30% reduction in energy costs."}],"columns":3,"titleAr":"ميزات المنزل الذكي","titleEn":"Smart Home Features","subtitleAr":"","subtitleEn":"","cardVariant":"iconTop","showCategories":false},"version":"2.0"},{"id":"benefitsGrid-18","type":"benefitsGrid","props":{"items":[{"id":"benefit-1","href":"","icon":"fa-th","titleAr":"أتمتة متعددة المناطق","titleEn":"Multi-Zone Automation","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"التحكم في مناطق مختلفة بشكل مستقل.","descriptionEn":"Control different areas independently."},{"id":"benefit-2","href":"","icon":"fa-clock","titleAr":"مراقبة 24/7","titleEn":"24/7 Monitoring","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"أمن وتنبيهات على مدار الساعة.","descriptionEn":"Round-the-clock security and alerts."},{"id":"benefit-3","href":"","icon":"fa-microphone","titleAr":"تكامل المساعد الصوتي","titleEn":"Voice Assistant Integration","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"أليكسا ومساعد جوجل وسيري.","descriptionEn":"Alexa, Google Assistant, and Siri."}],"layout":"numbered","titleAr":"الفوائد الرئيسية","titleEn":"Key Benefits","emphasis":"outcome","subtitleAr":"","subtitleEn":""},"version":"2.0"},{"id":"faq-19","type":"faq","props":{"limit":0,"titleAr":"أسئلة المنزل الذكي","titleEn":"Smart Home FAQ","faqSetSlug":"smart-home"},"version":"2.0"}]', '2026-06-05 11:01:42.387', NULL, '2026-06-05 06:14:52.020', '2026-06-05 11:01:42.416', '{}');
INSERT INTO `CmsPage` (`id`, `slug`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `templateKey`, `status`, `blocks`, `publishedAt`, `scheduledAt`, `createdAt`, `updatedAt`, `visualSettings`) VALUES ('cmq0j4waj0028hfd4muyeccf4', 'security-solutions', 'Security Solutions', 'حلول الأمن', '', '', 'landing', 'PUBLISHED', '[{"id":"hero-20","type":"hero","props":{"layout":"centered","badgeAr":"","badgeEn":"","ctaHref":"/contact","titleAr":"أنظمة أمن شاملة","titleEn":"Comprehensive Security Systems","imageUrl":"/images/placeholder.svg","minHeight":"70vh","ctaLabelAr":"أمّن ممتلكاتك","ctaLabelEn":"Secure Your Property","subtitleAr":"حماية الأشخاص والأصول والعمليات عبر مراقبة ذكية","subtitleEn":"Safeguard people, assets, and operations through intelligent monitoring","mediaAssetId":"mock-media-service-security","backgroundType":"image","overlayOpacity":60,"secondaryCtaHref":"","secondaryCtaLabelAr":"","secondaryCtaLabelEn":""},"version":"2.0"},{"id":"featureGrid-21","type":"featureGrid","props":{"items":[{"id":"feat-1","href":"","icon":"fa-video","titleAr":"مراقبة CCTV","titleEn":"CCTV Surveillance","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"كاميرات عالية الدقة مع عرض عن بُعد.","descriptionEn":"High-definition cameras with remote viewing."},{"id":"feat-2","href":"","icon":"fa-key","titleAr":"التحكم في الوصول","titleEn":"Access Control","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"أقفال ذكية وإدارة وصول مركزية.","descriptionEn":"Smart locks and centralized access management."},{"id":"feat-3","href":"","icon":"fa-brain","titleAr":"تحليلات الفيديو","titleEn":"Video Analytics","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"كشف حركة وتنبيهات بالذكاء الاصطناعي.","descriptionEn":"AI-powered motion detection and alerts."},{"id":"feat-4","href":"","icon":"fa-dashboard","titleAr":"منصات متكاملة","titleEn":"Integrated Platforms","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"لوحة إدارة أمن موحدة.","descriptionEn":"Unified security management dashboard."}],"columns":3,"titleAr":"حلول الأمن","titleEn":"Security Solutions","subtitleAr":"","subtitleEn":"","cardVariant":"iconTop","showCategories":false},"version":"2.0"},{"id":"beforeAfter-22","type":"beforeAfter","props":{"layout":"slider","titleAr":"قبل وبعد ترقية الأمن","titleEn":"Before & After Security Upgrade","subtitleAr":"","subtitleEn":"","afterLabelAr":"بعد","afterLabelEn":"After","afterImageUrl":"/images/placeholder.svg","beforeLabelAr":"قبل","beforeLabelEn":"Before","beforeImageUrl":"/images/placeholder.svg","afterMediaAssetId":"mock-media-project-9","beforeMediaAssetId":"mock-media-project-3"},"version":"2.0"},{"id":"faq-23","type":"faq","props":{"limit":0,"titleAr":"أسئلة الأمن","titleEn":"Security FAQ","faqSetSlug":"security"},"version":"2.0"}]', '2026-06-05 11:01:42.387', NULL, '2026-06-05 06:14:52.027', '2026-06-05 11:01:42.419', '{}');
INSERT INTO `CmsPage` (`id`, `slug`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `templateKey`, `status`, `blocks`, `publishedAt`, `scheduledAt`, `createdAt`, `updatedAt`, `visualSettings`) VALUES ('cmq0j4was0029hfd4p0t4ll4q', 'enterprise-wireless', 'Enterprise Wireless', 'الشبكة اللاسلكية للمؤسسات', '', '', 'landing', 'PUBLISHED', '[{"id":"hero-24","type":"hero","props":{"layout":"centered","badgeAr":"","badgeEn":"","ctaHref":"/contact","titleAr":"حلول الشبكة اللاسلكية للمؤسسات","titleEn":"Enterprise Wireless Network Solutions","imageUrl":"/images/placeholder.svg","minHeight":"70vh","ctaLabelAr":"اطلب معاينة","ctaLabelEn":"Request Survey","subtitleAr":"اتصال سلس وأداء مثالي واستقرار أقصى","subtitleEn":"Seamless connectivity, optimal performance, and maximum stability","mediaAssetId":"mock-media-service-wireless","backgroundType":"image","overlayOpacity":60,"secondaryCtaHref":"","secondaryCtaLabelAr":"","secondaryCtaLabelEn":""},"version":"2.0"},{"id":"benefitsGrid-25","type":"benefitsGrid","props":{"items":[{"id":"benefit-1","href":"","icon":"fa-drafting-compass","titleAr":"تصميم الشبكة","titleEn":"Network Design & Planning","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"مخططات بنية لاسلكية مخصصة.","descriptionEn":"Custom wireless infrastructure blueprints."},{"id":"benefit-2","href":"","icon":"fa-wifi","titleAr":"نشر Wi-Fi","titleEn":"Wi-Fi Deployment","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"تركيب وتكوين احترافي.","descriptionEn":"Professional installation and configuration."},{"id":"benefit-3","href":"","icon":"fa-map","titleAr":"معاينات الموقع","titleEn":"Site Surveys","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"تحليل التغطية وإزالة المناطق الميتة.","descriptionEn":"Coverage analysis and dead zone elimination."},{"id":"benefit-4","href":"","icon":"fa-heartbeat","titleAr":"المراقبة والصيانة","titleEn":"Monitoring & Maintenance","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"مراقبة صحة الشبكة على مدار الساعة.","descriptionEn":"24/7 network health monitoring."}],"layout":"cards","titleAr":"تشمل الخدمات","titleEn":"Services Include","emphasis":"outcome","subtitleAr":"","subtitleEn":""},"version":"2.0"},{"id":"statsCounter-26","type":"statsCounter","props":{"items":[{"id":"stat-1","icon":"","value":99,"prefix":"","suffix":"%","labelAr":"اتفاقية التشغيل","labelEn":"Uptime SLA","chartData":[],"chartType":"none","descriptionAr":"","descriptionEn":""},{"id":"stat-2","icon":"","value":24,"prefix":"","suffix":"/7","labelAr":"مراقبة NOC","labelEn":"NOC Monitoring","chartData":[],"chartType":"none","descriptionAr":"","descriptionEn":""},{"id":"stat-3","icon":"","value":100,"prefix":"","suffix":"%","labelAr":"هدف التغطية","labelEn":"Coverage Target","chartData":[],"chartType":"none","descriptionAr":"","descriptionEn":""}],"layout":"grid","titleAr":"أداء الشبكة","titleEn":"Network Performance","subtitleAr":"","subtitleEn":"","animateOnView":true},"version":"2.0"}]', '2026-06-05 11:01:42.387', NULL, '2026-06-05 06:14:52.036', '2026-06-05 11:01:42.422', '{}');
INSERT INTO `CmsPage` (`id`, `slug`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `templateKey`, `status`, `blocks`, `publishedAt`, `scheduledAt`, `createdAt`, `updatedAt`, `visualSettings`) VALUES ('cmq0j593r002rhffcy04slljf', 'why-choose-us', '', '', '', '', 'landing', 'DRAFT', '[]', NULL, NULL, '2026-06-05 06:15:08.631', '2026-06-05 11:01:42.441', '{}');

-- CompanyInfo (1 rows)
INSERT INTO `CompanyInfo` (`id`, `name`, `taglineEn`, `taglineAr`, `storyEn`, `storyAr`, `missionEn`, `missionAr`, `visionEn`, `visionAr`, `valuesEn`, `valuesAr`, `registrationNo`, `licenseInfo`, `addressEn`, `addressAr`, `phone`, `whatsapp`, `email`, `officeHoursEn`, `officeHoursAr`, `socialLinks`, `trustBadges`, `updatedAt`) VALUES ('default', 'BRT TRADING LLC', 'Innovative Wireless & Smart Technology Solutions', 'حلول لاسلكية وتقنية ذكية مبتكرة', 'BRT TRADING LLC is a leading provider of wireless communication, networking, security, and smart automation solutions. With over a decade of industry experience, we help organizations and homeowners leverage cutting-edge technologies to improve connectivity, security, operational efficiency, and digital transformation.', 'شركة BRT TRADING LLC هي مزود رائد لحلول الاتصالات اللاسلكية والشبكات والأمن والأتمتة الذكية. بخبرة تزيد عن عقد في المجال، نساعد المؤسسات وأصحاب المنازل على الاستفادة من أحدث التقنيات لتحسين الاتصال والأمن والكفاءة التشغيلية.', 'Deliver reliable, scalable, and future-ready technology solutions that enhance connectivity, improve security, and create smarter living and working environments.', 'تقديم حلول تقنية موثوقة وقابلة للتوسع وجاهزة للمستقبل تعزز الاتصال وتحسن الأمن وتخلق بيئات معيشة وعمل أكثر ذكاءً.', 'Empowering connectivity, enhancing security, and enabling smart living across enterprises and homes throughout the region.', 'تمكين الاتصال وتعزيز الأمن وتمكين المعيشة الذكية عبر المؤسسات والمنازل في المنطقة.', '["Quality","Innovation","Customer Satisfaction"]', '["الجودة","الابتكار","رضا العملاء"]', 'BRT-2024-UAE', 'Licensed technology solutions provider — UAE', 'Dubai, United Arab Emirates', 'دبي، الإمارات العربية المتحدة', '+971 55 472 7292', '+971554727292', 'info@brt-me.com', 'Sun–Thu: 9:00 AM – 6:00 PM', 'الأحد–الخميس: 9:00 ص – 6:00 م', '{"facebook":"https://facebook.com","linkedin":"https://linkedin.com","instagram":"https://instagram.com"}', '[{"icon":"fa-award","labelAr":"أكثر من 10 سنوات خبرة","labelEn":"10+ Years Experience"},{"icon":"fa-briefcase","labelAr":"أكثر من 500 مشروع","labelEn":"500+ Projects Delivered"},{"icon":"fa-star","labelAr":"99% رضا العملاء","labelEn":"99% Client Satisfaction"},{"icon":"fa-certificate","labelAr":"خبرة معتمدة","labelEn":"Certified Expertise"}]', '2026-06-05 11:01:42.305');

-- ContentItem (7 rows)
INSERT INTO `ContentItem` (`id`, `contentTypeId`, `collectionId`, `slug`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `descriptionEn`, `descriptionAr`, `attributes`, `blocks`, `displaySettings`, `metadata`, `status`, `isFeatured`, `isVisible`, `sortOrder`, `publishedAt`, `archivedAt`, `deletedAt`, `featuredImageUrl`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrw0001khf64xcwxvxk2', 'cmpv9625u0003hf2w6pjnojic', NULL, 'enterprise-wireless', 'Enterprise Wireless Networks', 'شبكات لاسلكية للمؤسسات', 'Robust wireless infrastructures for seamless connectivity.', 'بنى لاسلكية قوية لاتصال سلس.', 'Design and deployment of wireless networks including site surveys, optimization, and 24/7 monitoring.', 'تصميم ونشر شبكات لاسلكية تشمل المعاينات والتحسين والمراقبة على مدار الساعة.', '{"icon":"fa-wifi","ctaHref":"/enterprise-wireless","ctaLabel":"Learn More","offeringType":"OTHER"}', '[]', '{}', '{}', 'PUBLISHED', 1, 1, 0, '2026-06-05 11:01:42.368', NULL, NULL, NULL, '2026-06-05 11:01:42.384', '2026-06-05 11:01:42.384');
INSERT INTO `ContentItem` (`id`, `contentTypeId`, `collectionId`, `slug`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `descriptionEn`, `descriptionAr`, `attributes`, `blocks`, `displaySettings`, `metadata`, `status`, `isFeatured`, `isVisible`, `sortOrder`, `publishedAt`, `archivedAt`, `deletedAt`, `featuredImageUrl`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrw6001nhf64psq53ha1', 'cmpv9625u0003hf2w6pjnojic', NULL, 'indoor-coverage', 'Enterprise Indoor Coverage', 'تغطية داخلية للمؤسسات', 'Building-wide signal enhancement and multi-operator coverage.', 'تعزيز الإشارة على مستوى المبنى وتغطية متعددة المشغلين.', 'GSM stability, wireless data, handset connectivity, and IP PBX communication stability.', 'استقرار GSM والبيانات اللاسلكية واتصال الهواتف واستقرار IP PBX.', '{"icon":"fa-signal","ctaHref":"/services","ctaLabel":"Learn More","offeringType":"OTHER"}', '[]', '{}', '{}', 'PUBLISHED', 1, 1, 1, '2026-06-05 11:01:42.375', NULL, NULL, NULL, '2026-06-05 11:01:42.390', '2026-06-05 11:01:42.390');
INSERT INTO `ContentItem` (`id`, `contentTypeId`, `collectionId`, `slug`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `descriptionEn`, `descriptionAr`, `attributes`, `blocks`, `displaySettings`, `metadata`, `status`, `isFeatured`, `isVisible`, `sortOrder`, `publishedAt`, `archivedAt`, `deletedAt`, `featuredImageUrl`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrw7001qhf64eo8a04pt', 'cmpv9625u0003hf2w6pjnojic', NULL, 'security-systems', 'Security Solutions', 'حلول الأمن', 'CCTV, access control, smart locks, and integrated platforms.', 'CCTV والتحكم في الوصول والأقفال الذكية ومنصات متكاملة.', 'Comprehensive security systems with intelligent monitoring and proactive protection.', 'أنظمة أمن شاملة مع مراقبة ذكية وحماية استباقية.', '{"icon":"fa-shield","ctaHref":"/security-solutions","ctaLabel":"Learn More","offeringType":"OTHER"}', '[]', '{}', '{}', 'PUBLISHED', 1, 1, 2, '2026-06-05 11:01:42.377', NULL, NULL, NULL, '2026-06-05 11:01:42.392', '2026-06-05 11:01:42.392');
INSERT INTO `ContentItem` (`id`, `contentTypeId`, `collectionId`, `slug`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `descriptionEn`, `descriptionAr`, `attributes`, `blocks`, `displaySettings`, `metadata`, `status`, `isFeatured`, `isVisible`, `sortOrder`, `publishedAt`, `archivedAt`, `deletedAt`, `featuredImageUrl`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrwa001thf6438q97a7b', 'cmpv9625u0003hf2w6pjnojic', NULL, 'iot-solutions', 'IoT & Smart Technology', 'إنترنت الأشياء والتقنية الذكية', 'Device integration, automation, and real-time analytics.', 'تكامل الأجهزة والأتمتة والتحليلات الفورية.', 'Connect devices, automate processes, and gain insights through intelligent control systems.', 'ربط الأجهزة وأتمتة العمليات والحصول على رؤى عبر أنظمة تحكم ذكية.', '{"icon":"fa-microchip","ctaHref":"/services","ctaLabel":"Learn More","offeringType":"OTHER"}', '[]', '{}', '{}', 'PUBLISHED', 0, 1, 3, '2026-06-05 11:01:42.380', NULL, NULL, NULL, '2026-06-05 11:01:42.395', '2026-06-05 11:01:42.395');
INSERT INTO `ContentItem` (`id`, `contentTypeId`, `collectionId`, `slug`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `descriptionEn`, `descriptionAr`, `attributes`, `blocks`, `displaySettings`, `metadata`, `status`, `isFeatured`, `isVisible`, `sortOrder`, `publishedAt`, `archivedAt`, `deletedAt`, `featuredImageUrl`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrwc001whf64o6go41er', 'cmpv9625u0003hf2w6pjnojic', NULL, 'smart-home-automation', 'Smart Home Automation', 'أتمتة المنزل الذكي', 'Lighting, climate, security, and entertainment automation.', 'أتمتة الإضاءة والمناخ والأمن والترفيه.', 'Create connected living environments with mobile app and voice assistant control.', 'بيئات معيشة متصلة مع تحكم عبر التطبيق والمساعد الصوتي.', '{"icon":"fa-home","ctaHref":"/smart-home","ctaLabel":"Learn More","offeringType":"OTHER"}', '[]', '{}', '{}', 'PUBLISHED', 1, 1, 4, '2026-06-05 11:01:42.381', NULL, NULL, NULL, '2026-06-05 11:01:42.397', '2026-06-05 11:01:42.397');
INSERT INTO `ContentItem` (`id`, `contentTypeId`, `collectionId`, `slug`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `descriptionEn`, `descriptionAr`, `attributes`, `blocks`, `displaySettings`, `metadata`, `status`, `isFeatured`, `isVisible`, `sortOrder`, `publishedAt`, `archivedAt`, `deletedAt`, `featuredImageUrl`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrwe001zhf64ayx8e5qk', 'cmpv9625u0003hf2w6pjnojic', NULL, 'ip-pbx', 'IP PBX & Unified Communications', 'IP PBX والاتصالات الموحدة', 'Enterprise-grade voice and unified communication platforms.', 'منصات صوتية واتصالات موحدة للمؤسسات.', 'Reliable IP PBX deployment with building-wide communication stability.', 'نشر IP PBX موثوق مع استقرار اتصالات على مستوى المبنى.', '{"icon":"fa-phone","ctaHref":"/services","ctaLabel":"Learn More","offeringType":"OTHER"}', '[]', '{}', '{}', 'PUBLISHED', 0, 1, 5, '2026-06-05 11:01:42.383', NULL, NULL, NULL, '2026-06-05 11:01:42.399', '2026-06-05 11:01:42.399');
INSERT INTO `ContentItem` (`id`, `contentTypeId`, `collectionId`, `slug`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `descriptionEn`, `descriptionAr`, `attributes`, `blocks`, `displaySettings`, `metadata`, `status`, `isFeatured`, `isVisible`, `sortOrder`, `publishedAt`, `archivedAt`, `deletedAt`, `featuredImageUrl`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrwg0022hf6461hk63p5', 'cmpv9625u0003hf2w6pjnojic', NULL, 'infrastructure', 'Infrastructure Solutions', 'حلول البنية التحتية', 'Scalable network infrastructure design and deployment.', 'تصميم ونشر بنية شبكة قابلة للتوسع.', 'End-to-end infrastructure solutions for enterprises and commercial facilities.', 'حلول بنية تحتية متكاملة للمؤسسات والمرافق التجارية.', '{"icon":"fa-server","ctaHref":"/services","ctaLabel":"Learn More","offeringType":"OTHER"}', '[]', '{}', '{}', 'PUBLISHED', 0, 1, 6, '2026-06-05 11:01:42.385', NULL, NULL, NULL, '2026-06-05 11:01:42.400', '2026-06-05 11:01:42.400');

-- ContentItemMedia (7 rows)
INSERT INTO `ContentItemMedia` (`id`, `itemId`, `url`, `altEn`, `altAr`, `captionEn`, `captionAr`, `sortOrder`, `isPublished`, `isCover`, `isHidden`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrw0001lhf642s1ctubm', 'cmq0tdrw0001khf64xcwxvxk2', '/images/placeholder.svg', 'Enterprise Wireless Networks', 'شبكات لاسلكية للمؤسسات', '', '', 0, 1, 1, 0, '2026-06-05 11:01:42.384', '2026-06-05 11:01:42.384');
INSERT INTO `ContentItemMedia` (`id`, `itemId`, `url`, `altEn`, `altAr`, `captionEn`, `captionAr`, `sortOrder`, `isPublished`, `isCover`, `isHidden`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrw6001ohf64gh9ptcqe', 'cmq0tdrw6001nhf64psq53ha1', '/images/placeholder.svg', 'Enterprise Indoor Coverage', 'تغطية داخلية للمؤسسات', '', '', 0, 1, 1, 0, '2026-06-05 11:01:42.390', '2026-06-05 11:01:42.390');
INSERT INTO `ContentItemMedia` (`id`, `itemId`, `url`, `altEn`, `altAr`, `captionEn`, `captionAr`, `sortOrder`, `isPublished`, `isCover`, `isHidden`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrw7001rhf64johrshzl', 'cmq0tdrw7001qhf64eo8a04pt', '/images/placeholder.svg', 'Security Solutions', 'حلول الأمن', '', '', 0, 1, 1, 0, '2026-06-05 11:01:42.392', '2026-06-05 11:01:42.392');
INSERT INTO `ContentItemMedia` (`id`, `itemId`, `url`, `altEn`, `altAr`, `captionEn`, `captionAr`, `sortOrder`, `isPublished`, `isCover`, `isHidden`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrwa001uhf64ptaofh1j', 'cmq0tdrwa001thf6438q97a7b', '/images/placeholder.svg', 'IoT & Smart Technology', 'إنترنت الأشياء والتقنية الذكية', '', '', 0, 1, 1, 0, '2026-06-05 11:01:42.395', '2026-06-05 11:01:42.395');
INSERT INTO `ContentItemMedia` (`id`, `itemId`, `url`, `altEn`, `altAr`, `captionEn`, `captionAr`, `sortOrder`, `isPublished`, `isCover`, `isHidden`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrwd001xhf64sppnym25', 'cmq0tdrwc001whf64o6go41er', '/images/placeholder.svg', 'Smart Home Automation', 'أتمتة المنزل الذكي', '', '', 0, 1, 1, 0, '2026-06-05 11:01:42.397', '2026-06-05 11:01:42.397');
INSERT INTO `ContentItemMedia` (`id`, `itemId`, `url`, `altEn`, `altAr`, `captionEn`, `captionAr`, `sortOrder`, `isPublished`, `isCover`, `isHidden`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrwe0020hf6496el7xls', 'cmq0tdrwe001zhf64ayx8e5qk', '/images/placeholder.svg', 'IP PBX & Unified Communications', 'IP PBX والاتصالات الموحدة', '', '', 0, 1, 1, 0, '2026-06-05 11:01:42.399', '2026-06-05 11:01:42.399');
INSERT INTO `ContentItemMedia` (`id`, `itemId`, `url`, `altEn`, `altAr`, `captionEn`, `captionAr`, `sortOrder`, `isPublished`, `isCover`, `isHidden`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrwg0023hf64j998g1dv', 'cmq0tdrwg0022hf6461hk63p5', '/images/placeholder.svg', 'Infrastructure Solutions', 'حلول البنية التحتية', '', '', 0, 1, 1, 0, '2026-06-05 11:01:42.400', '2026-06-05 11:01:42.400');

-- ContentType (4 rows)
INSERT INTO `ContentType` (`id`, `slug`, `nameEn`, `nameAr`, `labelSingularEn`, `labelSingularAr`, `labelPluralEn`, `labelPluralAr`, `icon`, `routePrefix`, `fieldSchema`, `displaySchema`, `adminConfig`, `sortOrder`, `isEnabled`, `createdAt`, `updatedAt`) VALUES ('cmpv9625p0001hf2w01fa4hzm', 'catalog-items', 'Catalog Items', 'عناصر الفهرس', 'Catalog item', 'عنصر', 'Catalog items', 'عناصر الفهرس', 'package', 'packages', '[{"key":"duration","type":"number","group":"pricing","compare":true,"labelEn":"Duration (days)","required":true,"compareGroup":"Pricing","compareOrder":0,"highlightDifferences":true},{"key":"price","type":"price","group":"pricing","compare":true,"labelEn":"Price","required":true,"compareGroup":"Pricing","compareOrder":10,"highlightDifferences":true},{"key":"currency","type":"text","group":"pricing","compare":true,"labelEn":"Currency","placeholder":"USD","compareGroup":"Pricing","compareOrder":20,"highlightDifferences":true},{"key":"travelDates","type":"json","group":"details","labelEn":"Travel dates (JSON array)"},{"key":"facilities","type":"json","group":"details","labelEn":"Facilities (JSON)","localized":true},{"key":"features","type":"json","group":"details","labelEn":"Features (JSON)","localized":true},{"key":"itinerary","type":"json","group":"details","labelEn":"Itinerary (JSON)","localized":true},{"key":"hotelInfo","type":"textarea","group":"details","compare":true,"labelEn":"Hotel info","localized":true,"compareGroup":"Details","compareOrder":30,"highlightDifferences":true},{"key":"airlineInfo","type":"textarea","group":"details","compare":true,"labelEn":"Airline info","localized":true,"compareGroup":"Details","compareOrder":40,"highlightDifferences":true}]', '{"showPrice":true,"showCategory":true,"showDuration":true}', '{"isComparable":true,"inquiryEnabled":true,"comparisonSettings":{"enabled":true,"maxItems":4,"comparisonMode":"hybrid"}}', 0, 1, '2026-06-01 13:36:59.246', '2026-06-04 21:15:29.372');
INSERT INTO `ContentType` (`id`, `slug`, `nameEn`, `nameAr`, `labelSingularEn`, `labelSingularAr`, `labelPluralEn`, `labelPluralAr`, `icon`, `routePrefix`, `fieldSchema`, `displaySchema`, `adminConfig`, `sortOrder`, `isEnabled`, `createdAt`, `updatedAt`) VALUES ('cmpv9625t0002hf2wcgzesujw', 'listings', 'Listings', 'قوائم', 'Listing', 'قائمة', 'Listings', 'قوائم', 'building', 'hotels-transport', '[{"key":"city","type":"select","group":"location","compare":true,"labelEn":"City","options":[{"value":"MAKKAH","labelEn":"Makkah"},{"value":"MADINAH","labelEn":"Madinah"}],"compareGroup":"Location","compareOrder":0,"highlightDifferences":true},{"key":"stars","type":"number","group":"details","compare":true,"labelEn":"Star rating","compareGroup":"Details","compareOrder":10,"highlightDifferences":true},{"key":"highlights","type":"json","group":"details","labelEn":"Highlights (JSON)","localized":true},{"key":"address","type":"textarea","group":"location","labelEn":"Address","localized":true},{"key":"distance","type":"textarea","group":"location","compare":true,"labelEn":"Distance info","localized":true,"compareGroup":"Location","compareOrder":20,"highlightDifferences":true},{"key":"amenities","type":"json","group":"details","compare":true,"labelEn":"Amenities (JSON)","localized":true,"compareGroup":"Details","compareOrder":30,"highlightDifferences":true}]', '{"showCity":true,"showPrice":false,"showStars":true}', '{"isComparable":true,"inquiryEnabled":false,"comparisonSettings":{"enabled":true,"maxItems":4,"comparisonMode":"hybrid"}}', 1, 1, '2026-06-01 13:36:59.249', '2026-06-04 21:15:29.384');
INSERT INTO `ContentType` (`id`, `slug`, `nameEn`, `nameAr`, `labelSingularEn`, `labelSingularAr`, `labelPluralEn`, `labelPluralAr`, `icon`, `routePrefix`, `fieldSchema`, `displaySchema`, `adminConfig`, `sortOrder`, `isEnabled`, `createdAt`, `updatedAt`) VALUES ('cmpv9625u0003hf2w6pjnojic', 'offerings', 'Offerings', 'عروض', 'Offering', 'عرض', 'Offerings', 'عروض', 'briefcase', 'hotels-transport', '[{"key":"offeringType","type":"select","group":"cta","compare":true,"labelEn":"Type","options":[{"value":"TRANSPORT","labelEn":"Transport"},{"value":"AIRPORT_PICKUP","labelEn":"Airport pickup"},{"value":"HOTEL","labelEn":"Hotel service"},{"value":"OTHER","labelEn":"Other"}],"compareGroup":"Cta","compareOrder":0,"highlightDifferences":true},{"key":"highlights","type":"json","group":"details","compare":true,"labelEn":"Highlights (JSON)","localized":true,"compareGroup":"Details","compareOrder":10,"highlightDifferences":true},{"key":"icon","type":"text","group":"display","labelEn":"Icon name","placeholder":"compass"},{"key":"ctaLabel","type":"text","group":"cta","compare":true,"labelEn":"CTA label","localized":true,"compareGroup":"Cta","compareOrder":20,"highlightDifferences":true},{"key":"ctaHref","type":"url","group":"cta","labelEn":"CTA link"}]', '{"showIcon":true,"showPrice":false}', '{"isComparable":true,"inquiryEnabled":false,"comparisonSettings":{"enabled":true,"maxItems":4,"comparisonMode":"hybrid"}}', 2, 1, '2026-06-01 13:36:59.251', '2026-06-04 21:15:29.387');
INSERT INTO `ContentType` (`id`, `slug`, `nameEn`, `nameAr`, `labelSingularEn`, `labelSingularAr`, `labelPluralEn`, `labelPluralAr`, `icon`, `routePrefix`, `fieldSchema`, `displaySchema`, `adminConfig`, `sortOrder`, `isEnabled`, `createdAt`, `updatedAt`) VALUES ('cmpwfc6xz0000hfl4uqgff75a', 'test-content', 'test content', 'اختبار محتوى', 'Item', 'عنصر', 'Items', 'عناصر', 'box', 'test-content', '[{"key":"field1","type":"text","group":"general","labelEn":"New field","localized":true},{"key":"field2","type":"number","group":"general","labelEn":"New field","localized":true},{"key":"field3","type":"price","group":"general","labelEn":"New field"}]', '{}', '{"inquiryEnabled":true}', 0, 1, '2026-06-02 09:17:29.253', '2026-06-02 09:22:56.531');

-- Custom404 (2 rows)
INSERT INTO `Custom404` (`id`, `locale`, `titleEn`, `titleAr`, `bodyEn`, `bodyAr`, `blocks`, `updatedAt`) VALUES ('cmpv9628r0021hf2wt3cns8bm', 'en', '', '', '', '', '[]', '2026-06-05 11:01:41.536');
INSERT INTO `Custom404` (`id`, `locale`, `titleEn`, `titleAr`, `bodyEn`, `bodyAr`, `blocks`, `updatedAt`) VALUES ('cmpv9628t0022hf2w412o0vn6', 'ar', '', '', '', '', '[]', '2026-06-05 11:01:41.536');

-- FaqItem (6 rows)
INSERT INTO `FaqItem` (`id`, `faqSetId`, `questionEn`, `questionAr`, `answerEn`, `answerAr`, `sortOrder`, `isPublished`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrv6000khf64t7m4n8uk', 'cmq0tdrv6000jhf644uswq4dj', 'What industries does BRT TRADING LLC serve?', 'ما القطاعات التي تخدمها BRT TRADING LLC؟', 'We serve enterprises, commercial facilities, hospitality, residential developments, and government sectors with wireless, security, and smart technology solutions.', 'نخدم المؤسسات والمرافق التجارية والضيافة والتطويرات السكنية والقطاع الحكومي بحلول لاسلكية وأمنية وتقنية ذكية.', 0, 1, '2026-06-05 11:01:42.354', '2026-06-05 11:01:42.354');
INSERT INTO `FaqItem` (`id`, `faqSetId`, `questionEn`, `questionAr`, `answerEn`, `answerAr`, `sortOrder`, `isPublished`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrv6000lhf64ho27or6v', 'cmq0tdrv6000jhf644uswq4dj', 'Do you provide ongoing support after installation?', 'هل تقدمون دعماً مستمراً بعد التركيب؟', 'Yes. We offer continuous monitoring, technical support, upgrades, and optimization services to keep systems performing at their best.', 'نعم. نقدم مراقبة مستمرة ودعماً فنياً وترقيات وخدمات تحسين لضمان أداء الأنظمة بأفضل حال.', 1, 1, '2026-06-05 11:01:42.354', '2026-06-05 11:01:42.354');
INSERT INTO `FaqItem` (`id`, `faqSetId`, `questionEn`, `questionAr`, `answerEn`, `answerAr`, `sortOrder`, `isPublished`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrv6000mhf64sots1nse', 'cmq0tdrv6000jhf644uswq4dj', 'How long does a typical project take?', 'كم تستغرق المشاريع عادةً؟', 'Project timelines vary by scope. A site survey and consultation typically lead to a detailed timeline during the design phase.', 'تختلف الجداول الزمنية حسب نطاق المشروع. عادةً يتم تحديد جدول مفصل خلال مرحلة التصميم بعد المعاينة.', 2, 1, '2026-06-05 11:01:42.354', '2026-06-05 11:01:42.354');
INSERT INTO `FaqItem` (`id`, `faqSetId`, `questionEn`, `questionAr`, `answerEn`, `answerAr`, `sortOrder`, `isPublished`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrvd000ohf64h7nwqq9t', 'cmq0tdrvd000nhf64pzu1d682', 'Which voice assistants are supported?', 'ما المساعدات الصوتية المدعومة؟', 'Our smart home solutions integrate with Amazon Alexa, Google Assistant, and Apple Siri.', 'تتكامل حلول المنزل الذكي مع Amazon Alexa وGoogle Assistant وApple Siri.', 0, 1, '2026-06-05 11:01:42.361', '2026-06-05 11:01:42.361');
INSERT INTO `FaqItem` (`id`, `faqSetId`, `questionEn`, `questionAr`, `answerEn`, `answerAr`, `sortOrder`, `isPublished`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrvd000phf64vm9nrz5r', 'cmq0tdrvd000nhf64pzu1d682', 'Can I control my home remotely?', 'هل يمكنني التحكم في منزلي عن بُعد؟', 'Yes. Monitor and manage lighting, climate, security, and devices from your smartphone, tablet, or voice commands.', 'نعم. راقب وأدر الإضاءة والمناخ والأمن والأجهزة من هاتفك أو جهازك اللوحي أو الأوامر الصوتية.', 1, 1, '2026-06-05 11:01:42.361', '2026-06-05 11:01:42.361');
INSERT INTO `FaqItem` (`id`, `faqSetId`, `questionEn`, `questionAr`, `answerEn`, `answerAr`, `sortOrder`, `isPublished`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrvg000rhf647lslusoc', 'cmq0tdrvg000qhf648rfl3owb', 'What security systems do you install?', 'ما أنظمة الأمن التي تركبونها؟', 'CCTV surveillance, access control, smart locks, video analytics, motion detection, and integrated security platforms.', 'أنظمة CCTV والتحكم في الوصول والأقفال الذكية وتحليلات الفيديو وكشف الحركة ومنصات أمن متكاملة.', 0, 1, '2026-06-05 11:01:42.364', '2026-06-05 11:01:42.364');

-- FaqSet (3 rows)
INSERT INTO `FaqSet` (`id`, `slug`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `descriptionEn`, `descriptionAr`, `sortOrder`, `isPublished`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrv6000jhf644uswq4dj', 'general', 'General FAQ', 'الأسئلة الشائعة', NULL, NULL, '', '', 0, 1, '2026-06-05 11:01:42.354', '2026-06-05 11:01:42.354');
INSERT INTO `FaqSet` (`id`, `slug`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `descriptionEn`, `descriptionAr`, `sortOrder`, `isPublished`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrvd000nhf64pzu1d682', 'smart-home', 'Smart Home FAQ', 'أسئلة المنزل الذكي', NULL, NULL, '', '', 0, 1, '2026-06-05 11:01:42.361', '2026-06-05 11:01:42.361');
INSERT INTO `FaqSet` (`id`, `slug`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `descriptionEn`, `descriptionAr`, `sortOrder`, `isPublished`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrvg000qhf648rfl3owb', 'security', 'Security FAQ', 'أسئلة الأمن', NULL, NULL, '', '', 0, 1, '2026-06-05 11:01:42.364', '2026-06-05 11:01:42.364');

-- FormTemplate (1 rows)
INSERT INTO `FormTemplate` (`id`, `name`, `slug`, `category`, `description`, `definition`, `isPublished`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrv3000ihf64qf8zdxzy', 'BRT Contact Form', 'brt-contact', 'CONTACT', NULL, '{"fields":[{"id":"name","type":"text","labelAr":"الاسم الكامل","labelEn":"Full Name","required":true},{"id":"email","type":"email","labelAr":"البريد الإلكتروني","labelEn":"Email","required":true},{"id":"phone","type":"phone","labelAr":"الهاتف","labelEn":"Phone","required":false},{"id":"service","type":"select","labelAr":"الخدمة المطلوبة","labelEn":"Service Interest","options":[{"value":"wireless","labelAr":"شبكة لاسلكية","labelEn":"Enterprise Wireless"},{"value":"security","labelAr":"الأمن","labelEn":"Security"},{"value":"smarthome","labelAr":"المنزل الذكي","labelEn":"Smart Home"},{"value":"iot","labelAr":"إنترنت الأشياء","labelEn":"IoT"}],"required":false},{"id":"message","type":"textarea","labelAr":"الرسالة","labelEn":"Message","required":true}]}', 1, '2026-06-05 11:01:42.351', '2026-06-05 11:01:42.351');

-- Gallery (1 rows)
INSERT INTO `Gallery` (`id`, `slug`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `descriptionEn`, `descriptionAr`, `infoEn`, `infoAr`, `coverUrl`, `sortOrder`, `isPublished`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrvs0016hf64pm8tg4pa', 'brt-projects', 'Project Gallery', 'معرض المشاريع', NULL, NULL, '', '', NULL, NULL, NULL, 0, 1, '2026-06-05 11:01:42.376', '2026-06-05 11:01:42.376');

-- GalleryMedia (12 rows)
INSERT INTO `GalleryMedia` (`id`, `galleryId`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `descriptionEn`, `descriptionAr`, `infoEn`, `infoAr`, `mediaUrl`, `mediaKind`, `sortOrder`, `isPublished`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrvs0017hf64b75l21u2', 'cmq0tdrvs0016hf64pm8tg4pa', 'Enterprise Wireless Deployment', 'نشر شبكة لاسلكية', NULL, NULL, '', '', NULL, NULL, '/images/placeholder.svg', 'IMAGE', 0, 1, '2026-06-05 11:01:42.376', '2026-06-05 11:01:42.376');
INSERT INTO `GalleryMedia` (`id`, `galleryId`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `descriptionEn`, `descriptionAr`, `infoEn`, `infoAr`, `mediaUrl`, `mediaKind`, `sortOrder`, `isPublished`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrvs0018hf64cgen5j9u', 'cmq0tdrvs0016hf64pm8tg4pa', 'Smart Home Automation', 'أتمتة المنزل الذكي', NULL, NULL, '', '', NULL, NULL, '/images/placeholder.svg', 'IMAGE', 1, 1, '2026-06-05 11:01:42.376', '2026-06-05 11:01:42.376');
INSERT INTO `GalleryMedia` (`id`, `galleryId`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `descriptionEn`, `descriptionAr`, `infoEn`, `infoAr`, `mediaUrl`, `mediaKind`, `sortOrder`, `isPublished`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrvs0019hf64n3k45aeu', 'cmq0tdrvs0016hf64pm8tg4pa', 'Security Surveillance', 'مراقبة أمنية', NULL, NULL, '', '', NULL, NULL, '/images/placeholder.svg', 'IMAGE', 2, 1, '2026-06-05 11:01:42.376', '2026-06-05 11:01:42.376');
INSERT INTO `GalleryMedia` (`id`, `galleryId`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `descriptionEn`, `descriptionAr`, `infoEn`, `infoAr`, `mediaUrl`, `mediaKind`, `sortOrder`, `isPublished`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrvs001ahf64xkkqhta4', 'cmq0tdrvs0016hf64pm8tg4pa', 'IoT Sensor Network', 'شبكة مستشعرات', NULL, NULL, '', '', NULL, NULL, '/images/placeholder.svg', 'IMAGE', 3, 1, '2026-06-05 11:01:42.376', '2026-06-05 11:01:42.376');
INSERT INTO `GalleryMedia` (`id`, `galleryId`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `descriptionEn`, `descriptionAr`, `infoEn`, `infoAr`, `mediaUrl`, `mediaKind`, `sortOrder`, `isPublished`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrvs001bhf646l32rcpk', 'cmq0tdrvs0016hf64pm8tg4pa', 'Indoor Coverage', 'تغطية داخلية', NULL, NULL, '', '', NULL, NULL, '/images/placeholder.svg', 'IMAGE', 4, 1, '2026-06-05 11:01:42.376', '2026-06-05 11:01:42.376');
INSERT INTO `GalleryMedia` (`id`, `galleryId`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `descriptionEn`, `descriptionAr`, `infoEn`, `infoAr`, `mediaUrl`, `mediaKind`, `sortOrder`, `isPublished`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrvs001chf64p4f71xzl', 'cmq0tdrvs0016hf64pm8tg4pa', 'IP PBX System', 'نظام IP PBX', NULL, NULL, '', '', NULL, NULL, '/images/placeholder.svg', 'IMAGE', 5, 1, '2026-06-05 11:01:42.376', '2026-06-05 11:01:42.376');
INSERT INTO `GalleryMedia` (`id`, `galleryId`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `descriptionEn`, `descriptionAr`, `infoEn`, `infoAr`, `mediaUrl`, `mediaKind`, `sortOrder`, `isPublished`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrvs001dhf64q7sxegwn', 'cmq0tdrvs0016hf64pm8tg4pa', 'Network Infrastructure', 'بنية شبكة', NULL, NULL, '', '', NULL, NULL, '/images/placeholder.svg', 'IMAGE', 6, 1, '2026-06-05 11:01:42.376', '2026-06-05 11:01:42.376');
INSERT INTO `GalleryMedia` (`id`, `galleryId`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `descriptionEn`, `descriptionAr`, `infoEn`, `infoAr`, `mediaUrl`, `mediaKind`, `sortOrder`, `isPublished`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrvs001ehf64m8qtoznm', 'cmq0tdrvs0016hf64pm8tg4pa', 'Smart Lock Integration', 'أقفال ذكية', NULL, NULL, '', '', NULL, NULL, '/images/placeholder.svg', 'IMAGE', 7, 1, '2026-06-05 11:01:42.376', '2026-06-05 11:01:42.376');
INSERT INTO `GalleryMedia` (`id`, `galleryId`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `descriptionEn`, `descriptionAr`, `infoEn`, `infoAr`, `mediaUrl`, `mediaKind`, `sortOrder`, `isPublished`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrvs001fhf64oiouufh5', 'cmq0tdrvs0016hf64pm8tg4pa', 'CCTV Analytics', 'تحليلات CCTV', NULL, NULL, '', '', NULL, NULL, '/images/placeholder.svg', 'IMAGE', 8, 1, '2026-06-05 11:01:42.376', '2026-06-05 11:01:42.376');
INSERT INTO `GalleryMedia` (`id`, `galleryId`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `descriptionEn`, `descriptionAr`, `infoEn`, `infoAr`, `mediaUrl`, `mediaKind`, `sortOrder`, `isPublished`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrvs001ghf6401bnduz6', 'cmq0tdrvs0016hf64pm8tg4pa', 'Building Automation', 'أتمتة المباني', NULL, NULL, '', '', NULL, NULL, '/images/placeholder.svg', 'IMAGE', 9, 1, '2026-06-05 11:01:42.376', '2026-06-05 11:01:42.376');
INSERT INTO `GalleryMedia` (`id`, `galleryId`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `descriptionEn`, `descriptionAr`, `infoEn`, `infoAr`, `mediaUrl`, `mediaKind`, `sortOrder`, `isPublished`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrvs001hhf64saydiijb', 'cmq0tdrvs0016hf64pm8tg4pa', 'Voice Assistant Setup', 'مساعد صوتي', NULL, NULL, '', '', NULL, NULL, '/images/placeholder.svg', 'IMAGE', 10, 1, '2026-06-05 11:01:42.376', '2026-06-05 11:01:42.376');
INSERT INTO `GalleryMedia` (`id`, `galleryId`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `descriptionEn`, `descriptionAr`, `infoEn`, `infoAr`, `mediaUrl`, `mediaKind`, `sortOrder`, `isPublished`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrvs001ihf64mfnawt59', 'cmq0tdrvs0016hf64pm8tg4pa', 'Energy Management', 'إدارة الطاقة', NULL, NULL, '', '', NULL, NULL, '/images/placeholder.svg', 'IMAGE', 11, 1, '2026-06-05 11:01:42.376', '2026-06-05 11:01:42.376');

-- JsonStore (14 rows)
INSERT INTO `JsonStore` (`id`, `namespace`, `key`, `data`, `version`, `createdAt`, `updatedAt`) VALUES ('cmpwnoz4r000nhfesvci156mx', 'personalization', 'settings', '{"enabled":true,"presets":[{"id":"networking","visibleToUsers":false},{"id":"gaming","visibleToUsers":false},{"id":"sports","visibleToUsers":false},{"id":"luxury","visibleToUsers":true},{"id":"medical","visibleToUsers":true},{"id":"agency","visibleToUsers":true},{"id":"restaurant","visibleToUsers":false},{"id":"education","visibleToUsers":false},{"id":"realestate","visibleToUsers":false},{"id":"finance","visibleToUsers":true},{"id":"fashion","visibleToUsers":false},{"id":"saas","visibleToUsers":true},{"id":"automotive","visibleToUsers":false},{"id":"travel","visibleToUsers":true},{"id":"enterprise-wifi","visibleToUsers":false},{"id":"wireless-isp","visibleToUsers":false},{"id":"datacenter","visibleToUsers":false},{"id":"smart-home","visibleToUsers":false},{"id":"telecom","visibleToUsers":false},{"id":"brt","visibleToUsers":false}],"position":"bottom-start","widgetSections":{"showStyle":true,"showBackToTop":true,"showAppearance":true,"showFabThemeToggle":true}}', 3, '2026-06-02 13:11:22.587', '2026-06-04 09:58:07.328');
INSERT INTO `JsonStore` (`id`, `namespace`, `key`, `data`, `version`, `createdAt`, `updatedAt`) VALUES ('cmpwp7h8w0000hfyst0whe5u3', 'preview-tokens', 'f20ff027f653253e85e575af35e1fee495ac1a7b3fb821de', '{"slug":"home","blocks":[{"id":"block-1780321018964-o7gjykp","seo":{},"type":"hero","props":{"ctaHref":"/packages","titleAr":"رحلتك المقدسة، برعاية واهتمام","titleEn":"Your Sacred Journey, Guided with Care","imageUrl":"","ctaLabelAr":"استكشف الباقات","ctaLabelEn":"Explore Packages","subtitleAr":"باقات عمرة فاخرة وخدمات سفر إسلامية — مُعدّة بإخلاص، ومُقدَّمة بتميز.","subtitleEn":"Premium Umrah packages and Islamic travel services — crafted with devotion, delivered with excellence.","mediaAssetId":"","headerOverlay":{"enabled":true,"surface":"solid","paddingTop":"calc(15px + 0px)","contentInset":"auto"}},"styles":{},"version":"2.0","settings":{"ctaHref":"/packages","titleAr":"رحلتك المقدسة، برعاية واهتمام","titleEn":"Your Sacred Journey, Guided with Care","imageUrl":"","ctaLabelAr":"استكشف الباقات","ctaLabelEn":"Explore Packages","subtitleAr":"باقات عمرة فاخرة وخدمات سفر إسلامية — مُعدّة بإخلاص، ومُقدَّمة بتميز.","subtitleEn":"Premium Umrah packages and Islamic travel services — crafted with devotion, delivered with excellence.","mediaAssetId":"","headerOverlay":{"enabled":true,"surface":"solid","paddingTop":"calc(15px + 0px)","contentInset":"auto"}},"animation":{"scroll":{"type":"zoom"},"enabled":true,"entrance":{"type":"fade"}},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-j6zrn3c","seo":{},"type":"catalog","props":{"city":"","limit":6,"source":"packages","titleAr":"باقات العمرة المميزة","titleEn":"Featured Umrah Packages","manualIds":[],"subtitleAr":"رحلات مختارة لكل حاج — من الراحة الأساسية إلى الفخامة الملكية.","subtitleEn":"Handpicked journeys for every pilgrim — from essential comfort to royal luxury.","serviceType":"","viewAllHref":"","categorySlug":"","featuredOnly":false,"emptyMessageAr":"","emptyMessageEn":"","displaySettings":{"limit":6,"columns":3,"autoplay":false,"showCity":true,"showIcon":true,"showPrice":true,"showStars":true,"layoutMode":"grid","cardVariant":"default","showExcerpt":true,"showCategory":true,"showDuration":true,"showViewAllLink":true,"autoplayIntervalMs":5000}},"styles":{},"version":"2.0","settings":{"city":"","limit":6,"source":"packages","titleAr":"باقات العمرة المميزة","titleEn":"Featured Umrah Packages","manualIds":[],"subtitleAr":"رحلات مختارة لكل حاج — من الراحة الأساسية إلى الفخامة الملكية.","subtitleEn":"Handpicked journeys for every pilgrim — from essential comfort to royal luxury.","serviceType":"","viewAllHref":"","categorySlug":"","featuredOnly":false,"emptyMessageAr":"","emptyMessageEn":"","displaySettings":{"limit":6,"columns":3,"autoplay":false,"showCity":true,"showIcon":true,"showPrice":true,"showStars":true,"layoutMode":"grid","cardVariant":"default","showExcerpt":true,"showCategory":true,"showDuration":true,"showViewAllLink":true,"autoplayIntervalMs":5000}},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-r3mrvzt","seo":{},"type":"testimonials","props":{"limit":3,"source":"collection","columns":3,"titleAr":"قصص الحجاج","titleEn":"Pilgrim Stories","autoplay":false,"layoutMode":"grid","subtitleAr":"استمع إلى من سافروا معنا.","subtitleEn":"Hear from those who traveled with us.","cardVariant":"default","sliderEnabled":false,"testimonialIds":[],"showViewAllLink":true,"autoplayIntervalMs":5000,"testimonialCollectionSlug":"home"},"styles":{},"version":"2.0","settings":{"limit":3,"source":"collection","columns":3,"titleAr":"قصص الحجاج","titleEn":"Pilgrim Stories","autoplay":false,"layoutMode":"grid","subtitleAr":"استمع إلى من سافروا معنا.","subtitleEn":"Hear from those who traveled with us.","cardVariant":"default","sliderEnabled":false,"testimonialIds":[],"showViewAllLink":true,"autoplayIntervalMs":5000,"testimonialCollectionSlug":"home"},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-bcjbsen","seo":{},"type":"cta","props":{"href":"/contact","titleAr":"ابدأ رحلتك المقدسة","titleEn":"Begin Your Sacred Journey","buttonAr":"تواصل معنا","buttonEn":"Get in Touch"},"styles":{},"version":"2.0","settings":{"href":"/contact","titleAr":"ابدأ رحلتك المقدسة","titleEn":"Begin Your Sacred Journey","buttonAr":"تواصل معنا","buttonEn":"Get in Touch"},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}}],"locale":"en","pageId":"cmpv9628a001shf2w4z2l68c6","titleAr":"الرئيسية","titleEn":"Home","expiresAt":"2026-06-02T14:53:45.483Z"}', 1, '2026-06-02 13:53:45.487', '2026-06-02 13:53:45.487');
INSERT INTO `JsonStore` (`id`, `namespace`, `key`, `data`, `version`, `createdAt`, `updatedAt`) VALUES ('cmpwp7h8x0001hfys2o9mgfs6', 'preview-tokens', '99f3861d84613f6d1d78b9455b99c551c3569548be3bca2d', '{"slug":"home","blocks":[{"id":"block-1780321018964-o7gjykp","seo":{},"type":"hero","props":{"ctaHref":"/packages","titleAr":"رحلتك المقدسة، برعاية واهتمام","titleEn":"Your Sacred Journey, Guided with Care","imageUrl":"","ctaLabelAr":"استكشف الباقات","ctaLabelEn":"Explore Packages","subtitleAr":"باقات عمرة فاخرة وخدمات سفر إسلامية — مُعدّة بإخلاص، ومُقدَّمة بتميز.","subtitleEn":"Premium Umrah packages and Islamic travel services — crafted with devotion, delivered with excellence.","mediaAssetId":"","headerOverlay":{"enabled":true,"surface":"solid","paddingTop":"calc(15px + 0px)","contentInset":"auto"}},"styles":{},"version":"2.0","settings":{"ctaHref":"/packages","titleAr":"رحلتك المقدسة، برعاية واهتمام","titleEn":"Your Sacred Journey, Guided with Care","imageUrl":"","ctaLabelAr":"استكشف الباقات","ctaLabelEn":"Explore Packages","subtitleAr":"باقات عمرة فاخرة وخدمات سفر إسلامية — مُعدّة بإخلاص، ومُقدَّمة بتميز.","subtitleEn":"Premium Umrah packages and Islamic travel services — crafted with devotion, delivered with excellence.","mediaAssetId":"","headerOverlay":{"enabled":true,"surface":"solid","paddingTop":"calc(15px + 0px)","contentInset":"auto"}},"animation":{"scroll":{"type":"zoom"},"enabled":true,"entrance":{"type":"fade"}},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-j6zrn3c","seo":{},"type":"catalog","props":{"city":"","limit":6,"source":"packages","titleAr":"باقات العمرة المميزة","titleEn":"Featured Umrah Packages","manualIds":[],"subtitleAr":"رحلات مختارة لكل حاج — من الراحة الأساسية إلى الفخامة الملكية.","subtitleEn":"Handpicked journeys for every pilgrim — from essential comfort to royal luxury.","serviceType":"","viewAllHref":"","categorySlug":"","featuredOnly":false,"emptyMessageAr":"","emptyMessageEn":"","displaySettings":{"limit":6,"columns":3,"autoplay":false,"showCity":true,"showIcon":true,"showPrice":true,"showStars":true,"layoutMode":"grid","cardVariant":"default","showExcerpt":true,"showCategory":true,"showDuration":true,"showViewAllLink":true,"autoplayIntervalMs":5000}},"styles":{},"version":"2.0","settings":{"city":"","limit":6,"source":"packages","titleAr":"باقات العمرة المميزة","titleEn":"Featured Umrah Packages","manualIds":[],"subtitleAr":"رحلات مختارة لكل حاج — من الراحة الأساسية إلى الفخامة الملكية.","subtitleEn":"Handpicked journeys for every pilgrim — from essential comfort to royal luxury.","serviceType":"","viewAllHref":"","categorySlug":"","featuredOnly":false,"emptyMessageAr":"","emptyMessageEn":"","displaySettings":{"limit":6,"columns":3,"autoplay":false,"showCity":true,"showIcon":true,"showPrice":true,"showStars":true,"layoutMode":"grid","cardVariant":"default","showExcerpt":true,"showCategory":true,"showDuration":true,"showViewAllLink":true,"autoplayIntervalMs":5000}},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-r3mrvzt","seo":{},"type":"testimonials","props":{"limit":3,"source":"collection","columns":3,"titleAr":"قصص الحجاج","titleEn":"Pilgrim Stories","autoplay":false,"layoutMode":"grid","subtitleAr":"استمع إلى من سافروا معنا.","subtitleEn":"Hear from those who traveled with us.","cardVariant":"default","sliderEnabled":false,"testimonialIds":[],"showViewAllLink":true,"autoplayIntervalMs":5000,"testimonialCollectionSlug":"home"},"styles":{},"version":"2.0","settings":{"limit":3,"source":"collection","columns":3,"titleAr":"قصص الحجاج","titleEn":"Pilgrim Stories","autoplay":false,"layoutMode":"grid","subtitleAr":"استمع إلى من سافروا معنا.","subtitleEn":"Hear from those who traveled with us.","cardVariant":"default","sliderEnabled":false,"testimonialIds":[],"showViewAllLink":true,"autoplayIntervalMs":5000,"testimonialCollectionSlug":"home"},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-bcjbsen","seo":{},"type":"cta","props":{"href":"/contact","titleAr":"ابدأ رحلتك المقدسة","titleEn":"Begin Your Sacred Journey","buttonAr":"تواصل معنا","buttonEn":"Get in Touch"},"styles":{},"version":"2.0","settings":{"href":"/contact","titleAr":"ابدأ رحلتك المقدسة","titleEn":"Begin Your Sacred Journey","buttonAr":"تواصل معنا","buttonEn":"Get in Touch"},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}}],"locale":"en","pageId":"cmpv9628a001shf2w4z2l68c6","titleAr":"الرئيسية","titleEn":"Home","expiresAt":"2026-06-02T14:53:45.485Z"}', 1, '2026-06-02 13:53:45.489', '2026-06-02 13:53:45.489');
INSERT INTO `JsonStore` (`id`, `namespace`, `key`, `data`, `version`, `createdAt`, `updatedAt`) VALUES ('cmpwp7h9g0002hfys4wu0avzi', 'preview-tokens', '6665c7d196724132a7cff412cb6cccb4e67c40d08fdfb0af', '{"slug":"home","blocks":[{"id":"block-1780321018964-o7gjykp","seo":{},"type":"hero","props":{"ctaHref":"/packages","titleAr":"رحلتك المقدسة، برعاية واهتمام","titleEn":"Your Sacred Journey, Guided with Care","imageUrl":"","ctaLabelAr":"استكشف الباقات","ctaLabelEn":"Explore Packages","subtitleAr":"باقات عمرة فاخرة وخدمات سفر إسلامية — مُعدّة بإخلاص، ومُقدَّمة بتميز.","subtitleEn":"Premium Umrah packages and Islamic travel services — crafted with devotion, delivered with excellence.","mediaAssetId":"","headerOverlay":{"enabled":true,"surface":"solid","paddingTop":"calc(15px + 0px)","contentInset":"auto"}},"styles":{},"version":"2.0","settings":{"ctaHref":"/packages","titleAr":"رحلتك المقدسة، برعاية واهتمام","titleEn":"Your Sacred Journey, Guided with Care","imageUrl":"","ctaLabelAr":"استكشف الباقات","ctaLabelEn":"Explore Packages","subtitleAr":"باقات عمرة فاخرة وخدمات سفر إسلامية — مُعدّة بإخلاص، ومُقدَّمة بتميز.","subtitleEn":"Premium Umrah packages and Islamic travel services — crafted with devotion, delivered with excellence.","mediaAssetId":"","headerOverlay":{"enabled":true,"surface":"solid","paddingTop":"calc(15px + 0px)","contentInset":"auto"}},"animation":{"scroll":{"type":"zoom"},"enabled":true,"entrance":{"type":"fade"}},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-j6zrn3c","seo":{},"type":"catalog","props":{"city":"","limit":6,"source":"packages","titleAr":"باقات العمرة المميزة","titleEn":"Featured Umrah Packages","manualIds":[],"subtitleAr":"رحلات مختارة لكل حاج — من الراحة الأساسية إلى الفخامة الملكية.","subtitleEn":"Handpicked journeys for every pilgrim — from essential comfort to royal luxury.","serviceType":"","viewAllHref":"","categorySlug":"","featuredOnly":false,"emptyMessageAr":"","emptyMessageEn":"","displaySettings":{"limit":6,"columns":3,"autoplay":false,"showCity":true,"showIcon":true,"showPrice":true,"showStars":true,"layoutMode":"grid","cardVariant":"default","showExcerpt":true,"showCategory":true,"showDuration":true,"showViewAllLink":true,"autoplayIntervalMs":5000}},"styles":{},"version":"2.0","settings":{"city":"","limit":6,"source":"packages","titleAr":"باقات العمرة المميزة","titleEn":"Featured Umrah Packages","manualIds":[],"subtitleAr":"رحلات مختارة لكل حاج — من الراحة الأساسية إلى الفخامة الملكية.","subtitleEn":"Handpicked journeys for every pilgrim — from essential comfort to royal luxury.","serviceType":"","viewAllHref":"","categorySlug":"","featuredOnly":false,"emptyMessageAr":"","emptyMessageEn":"","displaySettings":{"limit":6,"columns":3,"autoplay":false,"showCity":true,"showIcon":true,"showPrice":true,"showStars":true,"layoutMode":"grid","cardVariant":"default","showExcerpt":true,"showCategory":true,"showDuration":true,"showViewAllLink":true,"autoplayIntervalMs":5000}},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-r3mrvzt","seo":{},"type":"testimonials","props":{"limit":3,"source":"collection","columns":3,"titleAr":"قصص الحجاج","titleEn":"Pilgrim Stories","autoplay":false,"layoutMode":"grid","subtitleAr":"استمع إلى من سافروا معنا.","subtitleEn":"Hear from those who traveled with us.","cardVariant":"default","sliderEnabled":false,"testimonialIds":[],"showViewAllLink":true,"autoplayIntervalMs":5000,"testimonialCollectionSlug":"home"},"styles":{},"version":"2.0","settings":{"limit":3,"source":"collection","columns":3,"titleAr":"قصص الحجاج","titleEn":"Pilgrim Stories","autoplay":false,"layoutMode":"grid","subtitleAr":"استمع إلى من سافروا معنا.","subtitleEn":"Hear from those who traveled with us.","cardVariant":"default","sliderEnabled":false,"testimonialIds":[],"showViewAllLink":true,"autoplayIntervalMs":5000,"testimonialCollectionSlug":"home"},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-bcjbsen","seo":{},"type":"cta","props":{"href":"/contact","titleAr":"ابدأ رحلتك المقدسة","titleEn":"Begin Your Sacred Journey","buttonAr":"تواصل معنا","buttonEn":"Get in Touch"},"styles":{},"version":"2.0","settings":{"href":"/contact","titleAr":"ابدأ رحلتك المقدسة","titleEn":"Begin Your Sacred Journey","buttonAr":"تواصل معنا","buttonEn":"Get in Touch"},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}}],"locale":"en","pageId":"cmpv9628a001shf2w4z2l68c6","titleAr":"الرئيسية","titleEn":"Home","expiresAt":"2026-06-02T14:53:45.505Z"}', 1, '2026-06-02 13:53:45.508', '2026-06-02 13:53:45.508');
INSERT INTO `JsonStore` (`id`, `namespace`, `key`, `data`, `version`, `createdAt`, `updatedAt`) VALUES ('cmpwp7h9h0003hfysjri8euj6', 'preview-tokens', '1da6a4629c7599736d0430f98431726fbeb8644356b3cec7', '{"slug":"home","blocks":[{"id":"block-1780321018964-o7gjykp","seo":{},"type":"hero","props":{"ctaHref":"/packages","titleAr":"رحلتك المقدسة، برعاية واهتمام","titleEn":"Your Sacred Journey, Guided with Care","imageUrl":"","ctaLabelAr":"استكشف الباقات","ctaLabelEn":"Explore Packages","subtitleAr":"باقات عمرة فاخرة وخدمات سفر إسلامية — مُعدّة بإخلاص، ومُقدَّمة بتميز.","subtitleEn":"Premium Umrah packages and Islamic travel services — crafted with devotion, delivered with excellence.","mediaAssetId":"","headerOverlay":{"enabled":true,"surface":"solid","paddingTop":"calc(15px + 0px)","contentInset":"auto"}},"styles":{},"version":"2.0","settings":{"ctaHref":"/packages","titleAr":"رحلتك المقدسة، برعاية واهتمام","titleEn":"Your Sacred Journey, Guided with Care","imageUrl":"","ctaLabelAr":"استكشف الباقات","ctaLabelEn":"Explore Packages","subtitleAr":"باقات عمرة فاخرة وخدمات سفر إسلامية — مُعدّة بإخلاص، ومُقدَّمة بتميز.","subtitleEn":"Premium Umrah packages and Islamic travel services — crafted with devotion, delivered with excellence.","mediaAssetId":"","headerOverlay":{"enabled":true,"surface":"solid","paddingTop":"calc(15px + 0px)","contentInset":"auto"}},"animation":{"scroll":{"type":"zoom"},"enabled":true,"entrance":{"type":"fade"}},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-j6zrn3c","seo":{},"type":"catalog","props":{"city":"","limit":6,"source":"packages","titleAr":"باقات العمرة المميزة","titleEn":"Featured Umrah Packages","manualIds":[],"subtitleAr":"رحلات مختارة لكل حاج — من الراحة الأساسية إلى الفخامة الملكية.","subtitleEn":"Handpicked journeys for every pilgrim — from essential comfort to royal luxury.","serviceType":"","viewAllHref":"","categorySlug":"","featuredOnly":false,"emptyMessageAr":"","emptyMessageEn":"","displaySettings":{"limit":6,"columns":3,"autoplay":false,"showCity":true,"showIcon":true,"showPrice":true,"showStars":true,"layoutMode":"grid","cardVariant":"default","showExcerpt":true,"showCategory":true,"showDuration":true,"showViewAllLink":true,"autoplayIntervalMs":5000}},"styles":{},"version":"2.0","settings":{"city":"","limit":6,"source":"packages","titleAr":"باقات العمرة المميزة","titleEn":"Featured Umrah Packages","manualIds":[],"subtitleAr":"رحلات مختارة لكل حاج — من الراحة الأساسية إلى الفخامة الملكية.","subtitleEn":"Handpicked journeys for every pilgrim — from essential comfort to royal luxury.","serviceType":"","viewAllHref":"","categorySlug":"","featuredOnly":false,"emptyMessageAr":"","emptyMessageEn":"","displaySettings":{"limit":6,"columns":3,"autoplay":false,"showCity":true,"showIcon":true,"showPrice":true,"showStars":true,"layoutMode":"grid","cardVariant":"default","showExcerpt":true,"showCategory":true,"showDuration":true,"showViewAllLink":true,"autoplayIntervalMs":5000}},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-r3mrvzt","seo":{},"type":"testimonials","props":{"limit":3,"source":"collection","columns":3,"titleAr":"قصص الحجاج","titleEn":"Pilgrim Stories","autoplay":false,"layoutMode":"grid","subtitleAr":"استمع إلى من سافروا معنا.","subtitleEn":"Hear from those who traveled with us.","cardVariant":"default","sliderEnabled":false,"testimonialIds":[],"showViewAllLink":true,"autoplayIntervalMs":5000,"testimonialCollectionSlug":"home"},"styles":{},"version":"2.0","settings":{"limit":3,"source":"collection","columns":3,"titleAr":"قصص الحجاج","titleEn":"Pilgrim Stories","autoplay":false,"layoutMode":"grid","subtitleAr":"استمع إلى من سافروا معنا.","subtitleEn":"Hear from those who traveled with us.","cardVariant":"default","sliderEnabled":false,"testimonialIds":[],"showViewAllLink":true,"autoplayIntervalMs":5000,"testimonialCollectionSlug":"home"},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-bcjbsen","seo":{},"type":"cta","props":{"href":"/contact","titleAr":"ابدأ رحلتك المقدسة","titleEn":"Begin Your Sacred Journey","buttonAr":"تواصل معنا","buttonEn":"Get in Touch"},"styles":{},"version":"2.0","settings":{"href":"/contact","titleAr":"ابدأ رحلتك المقدسة","titleEn":"Begin Your Sacred Journey","buttonAr":"تواصل معنا","buttonEn":"Get in Touch"},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}}],"locale":"en","pageId":"cmpv9628a001shf2w4z2l68c6","titleAr":"الرئيسية","titleEn":"Home","expiresAt":"2026-06-02T14:53:45.507Z"}', 1, '2026-06-02 13:53:45.510', '2026-06-02 13:53:45.510');
INSERT INTO `JsonStore` (`id`, `namespace`, `key`, `data`, `version`, `createdAt`, `updatedAt`) VALUES ('cmpwp7r430004hfys07jtezk9', 'preview-tokens', '327abab096951d60f6891156663cc540eb1d0cfc5a6fd7ed', '{"slug":"hotels-transport","blocks":[{"id":"block-1780321018964-rtxghxw","type":"hero","props":{"titleAr":"الفنادق والنقل","titleEn":"Hotels & Transportation","subtitleAr":"إقامة فاخرة ونقل سلس بين المدن المقدسة.","subtitleEn":"Premium stays and seamless travel across the holy cities."}},{"id":"block-1780321018964-twfp7ze","type":"catalog","props":{"limit":6,"source":"hotels","titleAr":"فنادق الشركاء","titleEn":"Partner Hotels"}},{"id":"block-1780321018964-3880ox0","type":"catalog","props":{"limit":6,"source":"services","titleAr":"خدمات النقل","titleEn":"Transportation Services"}}],"locale":"en","pageId":"cmpv9628l001zhf2wrg4nzifr","titleAr":"الفنادق والنقل","titleEn":"Hotels & Transport","expiresAt":"2026-06-02T14:53:58.272Z"}', 1, '2026-06-02 13:53:58.275', '2026-06-02 13:53:58.275');
INSERT INTO `JsonStore` (`id`, `namespace`, `key`, `data`, `version`, `createdAt`, `updatedAt`) VALUES ('cmpxvj47x0004hfo49zy1kblr', 'preview-tokens', '1fe9bd293331b857357975999e34122129b3bf6f41a966e6', '{"slug":"home","blocks":[{"id":"block-1780321018964-o7gjykp","seo":{},"type":"hero","props":{"ctaHref":"/packages","titleAr":"رحلتك المقدسة، برعاية واهتمام","titleEn":"Your Sacred Journey, Guided with Care","imageUrl":"","ctaLabelAr":"استكشف الباقات","ctaLabelEn":"Explore Packages","subtitleAr":"باقات عمرة فاخرة وخدمات سفر إسلامية — مُعدّة بإخلاص، ومُقدَّمة بتميز.","subtitleEn":"Premium Umrah packages and Islamic travel services — crafted with devotion, delivered with excellence.","mediaAssetId":"","headerOverlay":{"enabled":true,"surface":"solid","paddingTop":"calc(15px + 0px)","contentInset":"auto"}},"styles":{},"version":"2.0","settings":{"ctaHref":"/packages","titleAr":"رحلتك المقدسة، برعاية واهتمام","titleEn":"Your Sacred Journey, Guided with Care","imageUrl":"","ctaLabelAr":"استكشف الباقات","ctaLabelEn":"Explore Packages","subtitleAr":"باقات عمرة فاخرة وخدمات سفر إسلامية — مُعدّة بإخلاص، ومُقدَّمة بتميز.","subtitleEn":"Premium Umrah packages and Islamic travel services — crafted with devotion, delivered with excellence.","mediaAssetId":"","headerOverlay":{"enabled":true,"surface":"solid","paddingTop":"calc(15px + 0px)","contentInset":"auto"}},"animation":{"scroll":{"type":"zoom"},"enabled":true,"entrance":{"type":"fade"}},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-j6zrn3c","seo":{},"type":"catalog","props":{"city":"","limit":6,"source":"packages","titleAr":"باقات العمرة المميزة","titleEn":"Featured Umrah Packages","manualIds":[],"subtitleAr":"رحلات مختارة لكل حاج — من الراحة الأساسية إلى الفخامة الملكية.","subtitleEn":"Handpicked journeys for every pilgrim — from essential comfort to royal luxury.","serviceType":"","viewAllHref":"","categorySlug":"","featuredOnly":false,"emptyMessageAr":"","emptyMessageEn":"","displaySettings":{"limit":6,"columns":3,"autoplay":false,"showCity":true,"showIcon":true,"showPrice":true,"showStars":true,"layoutMode":"grid","cardVariant":"default","showExcerpt":true,"showCategory":true,"showDuration":true,"showViewAllLink":true,"autoplayIntervalMs":5000}},"styles":{},"version":"2.0","settings":{"city":"","limit":6,"source":"packages","titleAr":"باقات العمرة المميزة","titleEn":"Featured Umrah Packages","manualIds":[],"subtitleAr":"رحلات مختارة لكل حاج — من الراحة الأساسية إلى الفخامة الملكية.","subtitleEn":"Handpicked journeys for every pilgrim — from essential comfort to royal luxury.","serviceType":"","viewAllHref":"","categorySlug":"","featuredOnly":false,"emptyMessageAr":"","emptyMessageEn":"","displaySettings":{"limit":6,"columns":3,"autoplay":false,"showCity":true,"showIcon":true,"showPrice":true,"showStars":true,"layoutMode":"grid","cardVariant":"default","showExcerpt":true,"showCategory":true,"showDuration":true,"showViewAllLink":true,"autoplayIntervalMs":5000}},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-r3mrvzt","seo":{},"type":"testimonials","props":{"limit":3,"source":"collection","columns":3,"titleAr":"قصص الحجاج","titleEn":"Pilgrim Stories","autoplay":false,"layoutMode":"grid","subtitleAr":"استمع إلى من سافروا معنا.","subtitleEn":"Hear from those who traveled with us.","cardVariant":"default","sliderEnabled":false,"testimonialIds":[],"showViewAllLink":true,"autoplayIntervalMs":5000,"testimonialCollectionSlug":"home"},"styles":{},"version":"2.0","settings":{"limit":3,"source":"collection","columns":3,"titleAr":"قصص الحجاج","titleEn":"Pilgrim Stories","autoplay":false,"layoutMode":"grid","subtitleAr":"استمع إلى من سافروا معنا.","subtitleEn":"Hear from those who traveled with us.","cardVariant":"default","sliderEnabled":false,"testimonialIds":[],"showViewAllLink":true,"autoplayIntervalMs":5000,"testimonialCollectionSlug":"home"},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-bcjbsen","seo":{},"type":"cta","props":{"href":"/contact","titleAr":"ابدأ رحلتك المقدسة","titleEn":"Begin Your Sacred Journey","buttonAr":"تواصل معنا","buttonEn":"Get in Touch"},"styles":{},"version":"2.0","settings":{"href":"/contact","titleAr":"ابدأ رحلتك المقدسة","titleEn":"Begin Your Sacred Journey","buttonAr":"تواصل معنا","buttonEn":"Get in Touch"},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}}],"locale":"en","pageId":"cmpv9628a001shf2w4z2l68c6","titleAr":"الرئيسية","titleEn":"Home","expiresAt":"2026-06-03T10:38:32.345Z"}', 1, '2026-06-03 09:38:32.349', '2026-06-03 09:38:32.349');
INSERT INTO `JsonStore` (`id`, `namespace`, `key`, `data`, `version`, `createdAt`, `updatedAt`) VALUES ('cmpxvj47v0003hfo4xfcfdni4', 'preview-tokens', '9c19336f534f570fab17e3c6ee766464c9459e76f281a4e4', '{"slug":"home","blocks":[{"id":"block-1780321018964-o7gjykp","seo":{},"type":"hero","props":{"ctaHref":"/packages","titleAr":"رحلتك المقدسة، برعاية واهتمام","titleEn":"Your Sacred Journey, Guided with Care","imageUrl":"","ctaLabelAr":"استكشف الباقات","ctaLabelEn":"Explore Packages","subtitleAr":"باقات عمرة فاخرة وخدمات سفر إسلامية — مُعدّة بإخلاص، ومُقدَّمة بتميز.","subtitleEn":"Premium Umrah packages and Islamic travel services — crafted with devotion, delivered with excellence.","mediaAssetId":"","headerOverlay":{"enabled":true,"surface":"solid","paddingTop":"calc(15px + 0px)","contentInset":"auto"}},"styles":{},"version":"2.0","settings":{"ctaHref":"/packages","titleAr":"رحلتك المقدسة، برعاية واهتمام","titleEn":"Your Sacred Journey, Guided with Care","imageUrl":"","ctaLabelAr":"استكشف الباقات","ctaLabelEn":"Explore Packages","subtitleAr":"باقات عمرة فاخرة وخدمات سفر إسلامية — مُعدّة بإخلاص، ومُقدَّمة بتميز.","subtitleEn":"Premium Umrah packages and Islamic travel services — crafted with devotion, delivered with excellence.","mediaAssetId":"","headerOverlay":{"enabled":true,"surface":"solid","paddingTop":"calc(15px + 0px)","contentInset":"auto"}},"animation":{"scroll":{"type":"zoom"},"enabled":true,"entrance":{"type":"fade"}},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-j6zrn3c","seo":{},"type":"catalog","props":{"city":"","limit":6,"source":"packages","titleAr":"باقات العمرة المميزة","titleEn":"Featured Umrah Packages","manualIds":[],"subtitleAr":"رحلات مختارة لكل حاج — من الراحة الأساسية إلى الفخامة الملكية.","subtitleEn":"Handpicked journeys for every pilgrim — from essential comfort to royal luxury.","serviceType":"","viewAllHref":"","categorySlug":"","featuredOnly":false,"emptyMessageAr":"","emptyMessageEn":"","displaySettings":{"limit":6,"columns":3,"autoplay":false,"showCity":true,"showIcon":true,"showPrice":true,"showStars":true,"layoutMode":"grid","cardVariant":"default","showExcerpt":true,"showCategory":true,"showDuration":true,"showViewAllLink":true,"autoplayIntervalMs":5000}},"styles":{},"version":"2.0","settings":{"city":"","limit":6,"source":"packages","titleAr":"باقات العمرة المميزة","titleEn":"Featured Umrah Packages","manualIds":[],"subtitleAr":"رحلات مختارة لكل حاج — من الراحة الأساسية إلى الفخامة الملكية.","subtitleEn":"Handpicked journeys for every pilgrim — from essential comfort to royal luxury.","serviceType":"","viewAllHref":"","categorySlug":"","featuredOnly":false,"emptyMessageAr":"","emptyMessageEn":"","displaySettings":{"limit":6,"columns":3,"autoplay":false,"showCity":true,"showIcon":true,"showPrice":true,"showStars":true,"layoutMode":"grid","cardVariant":"default","showExcerpt":true,"showCategory":true,"showDuration":true,"showViewAllLink":true,"autoplayIntervalMs":5000}},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-r3mrvzt","seo":{},"type":"testimonials","props":{"limit":3,"source":"collection","columns":3,"titleAr":"قصص الحجاج","titleEn":"Pilgrim Stories","autoplay":false,"layoutMode":"grid","subtitleAr":"استمع إلى من سافروا معنا.","subtitleEn":"Hear from those who traveled with us.","cardVariant":"default","sliderEnabled":false,"testimonialIds":[],"showViewAllLink":true,"autoplayIntervalMs":5000,"testimonialCollectionSlug":"home"},"styles":{},"version":"2.0","settings":{"limit":3,"source":"collection","columns":3,"titleAr":"قصص الحجاج","titleEn":"Pilgrim Stories","autoplay":false,"layoutMode":"grid","subtitleAr":"استمع إلى من سافروا معنا.","subtitleEn":"Hear from those who traveled with us.","cardVariant":"default","sliderEnabled":false,"testimonialIds":[],"showViewAllLink":true,"autoplayIntervalMs":5000,"testimonialCollectionSlug":"home"},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-bcjbsen","seo":{},"type":"cta","props":{"href":"/contact","titleAr":"ابدأ رحلتك المقدسة","titleEn":"Begin Your Sacred Journey","buttonAr":"تواصل معنا","buttonEn":"Get in Touch"},"styles":{},"version":"2.0","settings":{"href":"/contact","titleAr":"ابدأ رحلتك المقدسة","titleEn":"Begin Your Sacred Journey","buttonAr":"تواصل معنا","buttonEn":"Get in Touch"},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}}],"locale":"en","pageId":"cmpv9628a001shf2w4z2l68c6","titleAr":"الرئيسية","titleEn":"Home","expiresAt":"2026-06-03T10:38:32.341Z"}', 1, '2026-06-03 09:38:32.347', '2026-06-03 09:38:32.347');
INSERT INTO `JsonStore` (`id`, `namespace`, `key`, `data`, `version`, `createdAt`, `updatedAt`) VALUES ('cmpxvj47z0005hfo4epcvq2zo', 'preview-tokens', 'b71c06a1bea253066af03e1352ca77ec1cdd777d172ff83e', '{"slug":"home","blocks":[{"id":"block-1780321018964-o7gjykp","seo":{},"type":"hero","props":{"ctaHref":"/packages","titleAr":"رحلتك المقدسة، برعاية واهتمام","titleEn":"Your Sacred Journey, Guided with Care","imageUrl":"","ctaLabelAr":"استكشف الباقات","ctaLabelEn":"Explore Packages","subtitleAr":"باقات عمرة فاخرة وخدمات سفر إسلامية — مُعدّة بإخلاص، ومُقدَّمة بتميز.","subtitleEn":"Premium Umrah packages and Islamic travel services — crafted with devotion, delivered with excellence.","mediaAssetId":"","headerOverlay":{"enabled":true,"surface":"solid","paddingTop":"calc(15px + 0px)","contentInset":"auto"}},"styles":{},"version":"2.0","settings":{"ctaHref":"/packages","titleAr":"رحلتك المقدسة، برعاية واهتمام","titleEn":"Your Sacred Journey, Guided with Care","imageUrl":"","ctaLabelAr":"استكشف الباقات","ctaLabelEn":"Explore Packages","subtitleAr":"باقات عمرة فاخرة وخدمات سفر إسلامية — مُعدّة بإخلاص، ومُقدَّمة بتميز.","subtitleEn":"Premium Umrah packages and Islamic travel services — crafted with devotion, delivered with excellence.","mediaAssetId":"","headerOverlay":{"enabled":true,"surface":"solid","paddingTop":"calc(15px + 0px)","contentInset":"auto"}},"animation":{"scroll":{"type":"zoom"},"enabled":true,"entrance":{"type":"fade"}},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-j6zrn3c","seo":{},"type":"catalog","props":{"city":"","limit":6,"source":"packages","titleAr":"باقات العمرة المميزة","titleEn":"Featured Umrah Packages","manualIds":[],"subtitleAr":"رحلات مختارة لكل حاج — من الراحة الأساسية إلى الفخامة الملكية.","subtitleEn":"Handpicked journeys for every pilgrim — from essential comfort to royal luxury.","serviceType":"","viewAllHref":"","categorySlug":"","featuredOnly":false,"emptyMessageAr":"","emptyMessageEn":"","displaySettings":{"limit":6,"columns":3,"autoplay":false,"showCity":true,"showIcon":true,"showPrice":true,"showStars":true,"layoutMode":"grid","cardVariant":"default","showExcerpt":true,"showCategory":true,"showDuration":true,"showViewAllLink":true,"autoplayIntervalMs":5000}},"styles":{},"version":"2.0","settings":{"city":"","limit":6,"source":"packages","titleAr":"باقات العمرة المميزة","titleEn":"Featured Umrah Packages","manualIds":[],"subtitleAr":"رحلات مختارة لكل حاج — من الراحة الأساسية إلى الفخامة الملكية.","subtitleEn":"Handpicked journeys for every pilgrim — from essential comfort to royal luxury.","serviceType":"","viewAllHref":"","categorySlug":"","featuredOnly":false,"emptyMessageAr":"","emptyMessageEn":"","displaySettings":{"limit":6,"columns":3,"autoplay":false,"showCity":true,"showIcon":true,"showPrice":true,"showStars":true,"layoutMode":"grid","cardVariant":"default","showExcerpt":true,"showCategory":true,"showDuration":true,"showViewAllLink":true,"autoplayIntervalMs":5000}},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-r3mrvzt","seo":{},"type":"testimonials","props":{"limit":3,"source":"collection","columns":3,"titleAr":"قصص الحجاج","titleEn":"Pilgrim Stories","autoplay":false,"layoutMode":"grid","subtitleAr":"استمع إلى من سافروا معنا.","subtitleEn":"Hear from those who traveled with us.","cardVariant":"default","sliderEnabled":false,"testimonialIds":[],"showViewAllLink":true,"autoplayIntervalMs":5000,"testimonialCollectionSlug":"home"},"styles":{},"version":"2.0","settings":{"limit":3,"source":"collection","columns":3,"titleAr":"قصص الحجاج","titleEn":"Pilgrim Stories","autoplay":false,"layoutMode":"grid","subtitleAr":"استمع إلى من سافروا معنا.","subtitleEn":"Hear from those who traveled with us.","cardVariant":"default","sliderEnabled":false,"testimonialIds":[],"showViewAllLink":true,"autoplayIntervalMs":5000,"testimonialCollectionSlug":"home"},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-bcjbsen","seo":{},"type":"cta","props":{"href":"/contact","titleAr":"ابدأ رحلتك المقدسة","titleEn":"Begin Your Sacred Journey","buttonAr":"تواصل معنا","buttonEn":"Get in Touch"},"styles":{},"version":"2.0","settings":{"href":"/contact","titleAr":"ابدأ رحلتك المقدسة","titleEn":"Begin Your Sacred Journey","buttonAr":"تواصل معنا","buttonEn":"Get in Touch"},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}}],"locale":"en","pageId":"cmpv9628a001shf2w4z2l68c6","titleAr":"الرئيسية","titleEn":"Home","expiresAt":"2026-06-03T10:38:32.347Z"}', 1, '2026-06-03 09:38:32.351', '2026-06-03 09:38:32.351');
INSERT INTO `JsonStore` (`id`, `namespace`, `key`, `data`, `version`, `createdAt`, `updatedAt`) VALUES ('cmpxvj4810006hfo4ef6rcwr9', 'preview-tokens', '57f0b9a5838ebe15acd78f8af5f1a6875598c28bf436ac86', '{"slug":"home","blocks":[{"id":"block-1780321018964-o7gjykp","seo":{},"type":"hero","props":{"ctaHref":"/packages","titleAr":"رحلتك المقدسة، برعاية واهتمام","titleEn":"Your Sacred Journey, Guided with Care","imageUrl":"","ctaLabelAr":"استكشف الباقات","ctaLabelEn":"Explore Packages","subtitleAr":"باقات عمرة فاخرة وخدمات سفر إسلامية — مُعدّة بإخلاص، ومُقدَّمة بتميز.","subtitleEn":"Premium Umrah packages and Islamic travel services — crafted with devotion, delivered with excellence.","mediaAssetId":"","headerOverlay":{"enabled":true,"surface":"solid","paddingTop":"calc(15px + 0px)","contentInset":"auto"}},"styles":{},"version":"2.0","settings":{"ctaHref":"/packages","titleAr":"رحلتك المقدسة، برعاية واهتمام","titleEn":"Your Sacred Journey, Guided with Care","imageUrl":"","ctaLabelAr":"استكشف الباقات","ctaLabelEn":"Explore Packages","subtitleAr":"باقات عمرة فاخرة وخدمات سفر إسلامية — مُعدّة بإخلاص، ومُقدَّمة بتميز.","subtitleEn":"Premium Umrah packages and Islamic travel services — crafted with devotion, delivered with excellence.","mediaAssetId":"","headerOverlay":{"enabled":true,"surface":"solid","paddingTop":"calc(15px + 0px)","contentInset":"auto"}},"animation":{"scroll":{"type":"zoom"},"enabled":true,"entrance":{"type":"fade"}},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-j6zrn3c","seo":{},"type":"catalog","props":{"city":"","limit":6,"source":"packages","titleAr":"باقات العمرة المميزة","titleEn":"Featured Umrah Packages","manualIds":[],"subtitleAr":"رحلات مختارة لكل حاج — من الراحة الأساسية إلى الفخامة الملكية.","subtitleEn":"Handpicked journeys for every pilgrim — from essential comfort to royal luxury.","serviceType":"","viewAllHref":"","categorySlug":"","featuredOnly":false,"emptyMessageAr":"","emptyMessageEn":"","displaySettings":{"limit":6,"columns":3,"autoplay":false,"showCity":true,"showIcon":true,"showPrice":true,"showStars":true,"layoutMode":"grid","cardVariant":"default","showExcerpt":true,"showCategory":true,"showDuration":true,"showViewAllLink":true,"autoplayIntervalMs":5000}},"styles":{},"version":"2.0","settings":{"city":"","limit":6,"source":"packages","titleAr":"باقات العمرة المميزة","titleEn":"Featured Umrah Packages","manualIds":[],"subtitleAr":"رحلات مختارة لكل حاج — من الراحة الأساسية إلى الفخامة الملكية.","subtitleEn":"Handpicked journeys for every pilgrim — from essential comfort to royal luxury.","serviceType":"","viewAllHref":"","categorySlug":"","featuredOnly":false,"emptyMessageAr":"","emptyMessageEn":"","displaySettings":{"limit":6,"columns":3,"autoplay":false,"showCity":true,"showIcon":true,"showPrice":true,"showStars":true,"layoutMode":"grid","cardVariant":"default","showExcerpt":true,"showCategory":true,"showDuration":true,"showViewAllLink":true,"autoplayIntervalMs":5000}},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-r3mrvzt","seo":{},"type":"testimonials","props":{"limit":3,"source":"collection","columns":3,"titleAr":"قصص الحجاج","titleEn":"Pilgrim Stories","autoplay":false,"layoutMode":"grid","subtitleAr":"استمع إلى من سافروا معنا.","subtitleEn":"Hear from those who traveled with us.","cardVariant":"default","sliderEnabled":false,"testimonialIds":[],"showViewAllLink":true,"autoplayIntervalMs":5000,"testimonialCollectionSlug":"home"},"styles":{},"version":"2.0","settings":{"limit":3,"source":"collection","columns":3,"titleAr":"قصص الحجاج","titleEn":"Pilgrim Stories","autoplay":false,"layoutMode":"grid","subtitleAr":"استمع إلى من سافروا معنا.","subtitleEn":"Hear from those who traveled with us.","cardVariant":"default","sliderEnabled":false,"testimonialIds":[],"showViewAllLink":true,"autoplayIntervalMs":5000,"testimonialCollectionSlug":"home"},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-bcjbsen","seo":{},"type":"cta","props":{"href":"/contact","titleAr":"ابدأ رحلتك المقدسة","titleEn":"Begin Your Sacred Journey","buttonAr":"تواصل معنا","buttonEn":"Get in Touch"},"styles":{},"version":"2.0","settings":{"href":"/contact","titleAr":"ابدأ رحلتك المقدسة","titleEn":"Begin Your Sacred Journey","buttonAr":"تواصل معنا","buttonEn":"Get in Touch"},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}}],"locale":"en","pageId":"cmpv9628a001shf2w4z2l68c6","titleAr":"الرئيسية","titleEn":"Home","expiresAt":"2026-06-03T10:38:32.349Z"}', 1, '2026-06-03 09:38:32.354', '2026-06-03 09:38:32.354');
INSERT INTO `JsonStore` (`id`, `namespace`, `key`, `data`, `version`, `createdAt`, `updatedAt`) VALUES ('cmpztabzt0000hff8g12r94l5', 'settings', 'system', '{"setupComplete":false,"comingSoonEnabled":false,"registrationEnabled":true}', 2, '2026-06-04 18:11:15.640', '2026-06-04 18:40:41.111');
INSERT INTO `JsonStore` (`id`, `namespace`, `key`, `data`, `version`, `createdAt`, `updatedAt`) VALUES ('cmq0tdr8q0001hfewvgs61509', 'footer-workspace', 'default', '{"design":{"columnGap":"normal","linkStyle":"muted","borderStyle":"subtle","headingStyle":"uppercase"},"layout":"grid","columns":[{"id":"brand","type":"brand","title":"","enabled":true,"showEmail":false,"showPhone":false,"showSocial":false,"showAddress":false},{"id":"services","type":"menu","links":[{"href":"/enterprise-wireless","label":"Enterprise Wireless"},{"href":"/smart-home","label":"Smart Home"},{"href":"/security-solutions","label":"Security Solutions"},{"href":"/services","label":"IoT & Connected Tech"}],"title":"Services","enabled":true,"showEmail":false,"showPhone":false,"menuSource":"custom","showSocial":false,"showAddress":false},{"id":"company","type":"menu","links":[{"href":"/about","label":"About Us"},{"href":"/about#process","label":"Our Process"},{"href":"/testimonials","label":"Testimonials"},{"href":"/contact","label":"Contact"}],"title":"Company","enabled":true,"showEmail":false,"showPhone":false,"menuSource":"custom","showSocial":false,"showAddress":false},{"id":"contact","type":"contact","title":"Contact","enabled":true,"showEmail":true,"showPhone":true,"showSocial":false,"showAddress":true},{"id":"social","type":"social","title":"Connect","enabled":true,"showEmail":false,"showPhone":false,"showSocial":true,"showAddress":false}],"version":1,"copyright":{"suffix":"Empowering Connectivity. Enhancing Security. Enabling Smart Living.","showBar":true,"legalLinks":[],"rightsText":"© BRT TRADING LLC. All rights reserved."},"gridColumns":4}', 1, '2026-06-05 11:01:41.547', '2026-06-05 11:01:42.326');
INSERT INTO `JsonStore` (`id`, `namespace`, `key`, `data`, `version`, `createdAt`, `updatedAt`) VALUES ('cmq0tdr8j0000hfewqtf1lch2', 'header-workspace', 'default', '{"version":1,"branding":{"tagline":"Wireless & Smart Technology","logoMode":"text","logoText":"BRT","areaStyle":"default","brandName":"BRT TRADING LLC","logoSizing":{"mode":"fixed","adaptiveMax":48,"adaptiveMin":28,"heightMobile":32,"heightTablet":36,"heightDesktop":42},"showTagline":true,"logoImageDarkUrl":"","brandLayoutMobile":"logo-and-text","logoImageLightUrl":"","brandLayoutDesktop":"logo-and-text","brandNameTypography":{"customFont":"","fontSource":"heading","fontWeight":800,"sizeMobile":"1rem","sizeDesktop":"1.2rem"},"brandTaglineTypography":{"customFont":"","fontSource":"body","fontWeight":400,"sizeMobile":"0.65rem","sizeDesktop":"0.72rem"}},"settings":{"menuType":"dropdown","menuShadow":"strong","mobileType":"hamburger","headerStyle":"normal-compact","overlayMode":"none","overlaySurface":"glass","menuBlurStrength":"medium","menuGlassEnabled":true,"menuTransparency":92,"mobileMenuShadow":"strong","headerDesktopMode":"sticky","mobileMenuSurface":"glass","headerBorderRadius":"lg","menuPanelAnimation":"slide","mobileMenuAnimation":"slide","mobileMenuBlurStrength":"medium","mobileMenuGlassEnabled":true,"mobileMenuTransparency":96,"firstBlockHeaderOverlay":{"enabled":false,"contentInset":"auto"}},"activeMenuKey":"mainMenu","headerActions":[{"id":"action-search","icon":"fa-search","type":"search","label":"Search","style":"icon","visible":true,"outlined":false},{"id":"action-account","icon":"fa-user","type":"account","label":"Account","style":"icon","visible":true,"outlined":false},{"id":"action-cta","icon":"fa-paper-plane","type":"custom","label":"Get a Quote","style":"solid","visible":true,"outlined":false}],"menusDatabase":{"mainMenu":{"name":"Main Menu","items":[{"id":"nav-home","url":"/","type":"link","label":"Home","labels":{"ar":"الرئيسية","en":"Home"},"children":[],"placement":"both"},{"id":"nav-about","url":"/about","type":"link","label":"About","labels":{"ar":"من نحن","en":"About"},"children":[],"placement":"both"},{"id":"nav-services","url":"/services","type":"link","label":"Services","labels":{"ar":"الخدمات","en":"Services"},"children":[],"placement":"both"},{"id":"nav-smart-home","url":"/smart-home","type":"link","label":"Smart Home","labels":{"ar":"المنزل الذكي","en":"Smart Home"},"children":[],"placement":"both"},{"id":"nav-gallery","url":"/gallery","type":"link","label":"Gallery","labels":{"ar":"المعرض","en":"Gallery"},"children":[],"placement":"both"},{"id":"nav-blog","url":"/blog","type":"link","label":"Blog","labels":{"ar":"المدونة","en":"Blog"},"children":[],"placement":"both"},{"id":"nav-contact","url":"/contact","type":"link","label":"Contact","labels":{"ar":"اتصل بنا","en":"Contact"},"children":[],"placement":"both"}],"globalApply":"Both"}}}', 1, '2026-06-05 11:01:41.539', '2026-06-05 11:01:42.322');
INSERT INTO `JsonStore` (`id`, `namespace`, `key`, `data`, `version`, `createdAt`, `updatedAt`) VALUES ('cmpzxm61e0007hfc8nco1a0jf', 'whatsapp', 'settings', '{"fab":{"size":"sm","enabled":true,"iconUrl":null,"iconSize":"1.75rem","position":"bottom-end","showIcon":true,"showLabel":false,"textColor":"#ffffff","offsetSide":24,"offsetBottom":24,"buttonVariant":"custom","backgroundColor":"#25D366"},"contactPage":{"size":"md","enabled":true,"iconUrl":null,"iconSize":"1.75rem","showIcon":true,"fullWidth":true,"showLabel":true,"textColor":"#ffffff","buttonVariant":"gold","backgroundColor":"#25D366"},"contentInquiry":{"size":"md","enabled":true,"iconUrl":null,"iconSize":"1.75rem","showIcon":true,"fullWidth":true,"showLabel":true,"textColor":"#ffffff","buttonVariant":"gold","backgroundColor":"#25D366"}}', 1, '2026-06-04 20:12:26.255', '2026-06-04 20:12:26.255');

-- LocaleConfig (1 rows)
INSERT INTO `LocaleConfig` (`id`, `code`, `urlPrefix`, `label`, `htmlLang`, `dir`, `flag`, `dateLocale`, `currency`, `numberLocale`, `isEnabled`, `isDefault`, `sortOrder`, `createdAt`, `updatedAt`) VALUES ('cmpv9628u0023hf2whrsan6vt', 'en', 'en', 'English', 'en', 'ltr', '🇺🇸', 'en-US', 'USD', 'en-US', 1, 1, 0, '2026-06-01 13:36:59.358', '2026-06-04 21:15:29.596');

-- MediaAsset (16 rows)
INSERT INTO `MediaAsset` (`id`, `filename`, `url`, `mimeType`, `mediaType`, `sizeBytes`, `width`, `height`, `altEn`, `altAr`, `folderId`, `uploadedById`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrug0002hf64va1ow9yp', 'hero.svg', '/demo/brt/hero.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, 'BRT TRADING LLC technology solutions', 'حلول BRT TRADING LLC التقنية', NULL, NULL, '2026-06-05 11:01:42.328', '2026-06-05 11:01:42.328');
INSERT INTO `MediaAsset` (`id`, `filename`, `url`, `mimeType`, `mediaType`, `sizeBytes`, `width`, `height`, `altEn`, `altAr`, `folderId`, `uploadedById`, `createdAt`, `updatedAt`) VALUES ('cmq0tdruj0003hf64noofloax', 'project-1.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, 'Enterprise wireless deployment', 'نشر شبكة لاسلكية للمؤسسات', NULL, NULL, '2026-06-05 11:01:42.332', '2026-06-05 11:01:42.332');
INSERT INTO `MediaAsset` (`id`, `filename`, `url`, `mimeType`, `mediaType`, `sizeBytes`, `width`, `height`, `altEn`, `altAr`, `folderId`, `uploadedById`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrul0004hf64uy6r4g79', 'project-2.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, 'Smart home automation', 'أتمتة المنزل الذكي', NULL, NULL, '2026-06-05 11:01:42.333', '2026-06-05 11:01:42.333');
INSERT INTO `MediaAsset` (`id`, `filename`, `url`, `mimeType`, `mediaType`, `sizeBytes`, `width`, `height`, `altEn`, `altAr`, `folderId`, `uploadedById`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrum0005hf64vsdbr5q0', 'project-3.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, 'Security surveillance system', 'نظام مراقبة أمنية', NULL, NULL, '2026-06-05 11:01:42.334', '2026-06-05 11:01:42.334');
INSERT INTO `MediaAsset` (`id`, `filename`, `url`, `mimeType`, `mediaType`, `sizeBytes`, `width`, `height`, `altEn`, `altAr`, `folderId`, `uploadedById`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrun0006hf64h0stiwnr', 'project-4.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, 'IoT sensor network', 'شبكة مستشعرات إنترنت الأشياء', NULL, NULL, '2026-06-05 11:01:42.335', '2026-06-05 11:01:42.335');
INSERT INTO `MediaAsset` (`id`, `filename`, `url`, `mimeType`, `mediaType`, `sizeBytes`, `width`, `height`, `altEn`, `altAr`, `folderId`, `uploadedById`, `createdAt`, `updatedAt`) VALUES ('cmq0tdruo0007hf64ajl538fz', 'project-5.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, 'Indoor coverage solution', 'حل تغطية داخلية', NULL, NULL, '2026-06-05 11:01:42.336', '2026-06-05 11:01:42.336');
INSERT INTO `MediaAsset` (`id`, `filename`, `url`, `mimeType`, `mediaType`, `sizeBytes`, `width`, `height`, `altEn`, `altAr`, `folderId`, `uploadedById`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrup0008hf6419b9wjpx', 'project-6.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, 'IP PBX installation', 'تركيب IP PBX', NULL, NULL, '2026-06-05 11:01:42.338', '2026-06-05 11:01:42.338');
INSERT INTO `MediaAsset` (`id`, `filename`, `url`, `mimeType`, `mediaType`, `sizeBytes`, `width`, `height`, `altEn`, `altAr`, `folderId`, `uploadedById`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrur0009hf64t9fgor72', 'project-7.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, 'Network infrastructure', 'بنية شبكة تحتية', NULL, NULL, '2026-06-05 11:01:42.340', '2026-06-05 11:01:42.340');
INSERT INTO `MediaAsset` (`id`, `filename`, `url`, `mimeType`, `mediaType`, `sizeBytes`, `width`, `height`, `altEn`, `altAr`, `folderId`, `uploadedById`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrut000ahf64xw43732z', 'project-8.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, 'Smart lock integration', 'تكامل الأقفال الذكية', NULL, NULL, '2026-06-05 11:01:42.341', '2026-06-05 11:01:42.341');
INSERT INTO `MediaAsset` (`id`, `filename`, `url`, `mimeType`, `mediaType`, `sizeBytes`, `width`, `height`, `altEn`, `altAr`, `folderId`, `uploadedById`, `createdAt`, `updatedAt`) VALUES ('cmq0tdruu000bhf64siacyyxg', 'project-9.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, 'CCTV analytics', 'تحليلات كاميرات المراقبة', NULL, NULL, '2026-06-05 11:01:42.343', '2026-06-05 11:01:42.343');
INSERT INTO `MediaAsset` (`id`, `filename`, `url`, `mimeType`, `mediaType`, `sizeBytes`, `width`, `height`, `altEn`, `altAr`, `folderId`, `uploadedById`, `createdAt`, `updatedAt`) VALUES ('cmq0tdruv000chf64lz2g1p36', 'project-10.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, 'Building automation', 'أتمتة المباني', NULL, NULL, '2026-06-05 11:01:42.344', '2026-06-05 11:01:42.344');
INSERT INTO `MediaAsset` (`id`, `filename`, `url`, `mimeType`, `mediaType`, `sizeBytes`, `width`, `height`, `altEn`, `altAr`, `folderId`, `uploadedById`, `createdAt`, `updatedAt`) VALUES ('cmq0tdruw000dhf64a20c0ijp', 'project-11.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, 'Voice assistant setup', 'إعداد المساعد الصوتي', NULL, NULL, '2026-06-05 11:01:42.345', '2026-06-05 11:01:42.345');
INSERT INTO `MediaAsset` (`id`, `filename`, `url`, `mimeType`, `mediaType`, `sizeBytes`, `width`, `height`, `altEn`, `altAr`, `folderId`, `uploadedById`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrux000ehf64744jlrnl', 'project-12.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, 'Energy management', 'إدارة الطاقة', NULL, NULL, '2026-06-05 11:01:42.346', '2026-06-05 11:01:42.346');
INSERT INTO `MediaAsset` (`id`, `filename`, `url`, `mimeType`, `mediaType`, `sizeBytes`, `width`, `height`, `altEn`, `altAr`, `folderId`, `uploadedById`, `createdAt`, `updatedAt`) VALUES ('cmq0tdruz000fhf64iuz3dr62', 'service-wireless.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, 'Enterprise wireless', 'شبكة لاسلكية للمؤسسات', NULL, NULL, '2026-06-05 11:01:42.348', '2026-06-05 11:01:42.348');
INSERT INTO `MediaAsset` (`id`, `filename`, `url`, `mimeType`, `mediaType`, `sizeBytes`, `width`, `height`, `altEn`, `altAr`, `folderId`, `uploadedById`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrv1000ghf64ngat3h9r', 'service-security.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, 'Security solutions', 'حلول الأمن', NULL, NULL, '2026-06-05 11:01:42.349', '2026-06-05 11:01:42.349');
INSERT INTO `MediaAsset` (`id`, `filename`, `url`, `mimeType`, `mediaType`, `sizeBytes`, `width`, `height`, `altEn`, `altAr`, `folderId`, `uploadedById`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrv2000hhf64yp3u46zc', 'service-smarthome.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, 'Smart home', 'المنزل الذكي', NULL, NULL, '2026-06-05 11:01:42.350', '2026-06-05 11:01:42.350');

-- Post (4 rows)
INSERT INTO `Post` (`id`, `slug`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `contentEn`, `contentAr`, `blocks`, `relatedPostIds`, `status`, `featuredImageId`, `authorId`, `publishedAt`, `scheduledAt`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrxr002hhf643sqmuivb', 'iot-trends-2026', 'IoT Trends Shaping Smart Buildings in 2026', 'اتجاهات إنترنت الأشياء في المباني الذكية 2026', 'How connected devices are transforming facility management and energy efficiency.', 'كيف تحول الأجهزة المتصلة إدارة المرافق وكفاءة الطاقة.', '<p>The Internet of Things continues to revolutionize how buildings operate. From predictive maintenance to real-time energy monitoring, IoT solutions deliver measurable ROI for enterprises.</p><p>BRT TRADING LLC helps organizations integrate devices, automate processes, and gain valuable insights through intelligent control systems.</p>', '<p>يستمر إنترنت الأشياء في إحداث ثورة في تشغيل المباني. من الصيانة التنبؤية إلى مراقبة الطاقة الفورية، تقدم حلول IoT عائداً استثمارياً ملموساً للمؤسسات.</p>', '[]', '[]', 'PUBLISHED', 'cmq0tdrun0006hf64h0stiwnr', 'cmq0tdrxo002fhf64ucvpvoji', '2026-06-05 11:01:42.432', NULL, '2026-06-05 11:01:42.447', '2026-06-05 11:01:42.447');
INSERT INTO `Post` (`id`, `slug`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `contentEn`, `contentAr`, `blocks`, `relatedPostIds`, `status`, `featuredImageId`, `authorId`, `publishedAt`, `scheduledAt`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrxv002jhf648v08san5', 'smart-home-security-guide', 'Smart Home Security: A Complete Guide', 'أمن المنزل الذكي: دليل شامل', 'Protect your property with integrated smart locks, cameras, and automated responses.', 'احمِ ممتلكاتك بأقفال ذكية وكاميرات واستجابات آلية متكاملة.', '<p>Smart security goes beyond traditional alarms. With intelligent surveillance, motion detection, and automated response systems, homeowners gain peace of mind and instant alerts.</p>', '<p>الأمن الذكي يتجاوز الإنذارات التقليدية. مع المراقبة الذكية وكشف الحركة والاستجابات الآلية، يحصل أصحاب المنازل على راحة البال.</p>', '[]', '[]', 'PUBLISHED', 'cmq0tdrum0005hf64vsdbr5q0', 'cmq0tdrxo002fhf64ucvpvoji', '2026-06-05 11:01:42.436', NULL, '2026-06-05 11:01:42.451', '2026-06-05 11:01:42.451');
INSERT INTO `Post` (`id`, `slug`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `contentEn`, `contentAr`, `blocks`, `relatedPostIds`, `status`, `featuredImageId`, `authorId`, `publishedAt`, `scheduledAt`, `createdAt`, `updatedAt`) VALUES ('cmq0tdry0002lhf64b3bc8mks', 'enterprise-wifi-best-practices', 'Enterprise Wi-Fi Best Practices', 'أفضل ممارسات Wi-Fi للمؤسسات', 'Design principles for reliable, high-performance wireless networks.', 'مبادئ تصميم شبكات لاسلكية موثوقة وعالية الأداء.', '<p>Enterprise wireless networks require careful planning. Site surveys, coverage analysis, and ongoing optimization ensure maximum stability and performance across your facility.</p>', '<p>تتطلب الشبكات اللاسلكية للمؤسسات تخطيطاً دقيقاً. المعاينات وتحليل التغطية والتحسين المستمر يضمن أقصى استقرار وأداء.</p>', '[]', '[]', 'PUBLISHED', 'cmq0tdruz000fhf64iuz3dr62', 'cmq0tdrxo002fhf64ucvpvoji', '2026-06-05 11:01:42.441', NULL, '2026-06-05 11:01:42.456', '2026-06-05 11:01:42.456');
INSERT INTO `Post` (`id`, `slug`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `contentEn`, `contentAr`, `blocks`, `relatedPostIds`, `status`, `featuredImageId`, `authorId`, `publishedAt`, `scheduledAt`, `createdAt`, `updatedAt`) VALUES ('cmq0tdry2002nhf64yujo4i0d', 'energy-efficiency-smart-tech', 'Energy Efficiency Through Smart Technology', 'كفاءة الطاقة عبر التقنية الذكية', 'Reduce energy costs by up to 30% with intelligent scheduling and automation.', 'قلل تكاليف الطاقة بنسبة تصل إلى 30% عبر الجدولة الذكية والأتمتة.', '<p>Smart technologies help reduce energy consumption while improving comfort. Automated monitoring, intelligent scheduling, and 24/7 energy analytics deliver sustainable building management.</p>', '<p>تساعد التقنيات الذكية على تقليل استهلاك الطاقة مع تحسين الراحة. المراقبة الآلية والجدولة الذكية تحقق إدارة مباني مستدامة.</p>', '[]', '[]', 'PUBLISHED', 'cmq0tdrux000ehf64744jlrnl', 'cmq0tdrxo002fhf64ucvpvoji', '2026-06-05 11:01:42.443', NULL, '2026-06-05 11:01:42.458', '2026-06-05 11:01:42.458');

-- PostAuthor (1 rows)
INSERT INTO `PostAuthor` (`id`, `name`, `bioEn`, `bioAr`, `avatarUrl`, `userId`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrxo002fhf64ucvpvoji', 'BRT TRADING LLC', 'Editorial team at BRT TRADING LLC', 'فريق التحرير في BRT TRADING LLC', NULL, NULL, '2026-06-05 11:01:42.445', '2026-06-05 11:01:42.445');

-- PostCategory (2 rows)
INSERT INTO `PostCategory` (`id`, `slug`, `nameEn`, `nameAr`, `sortOrder`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrxm002dhf64d19wvmnc', 'technology', 'Technology', 'التقنية', 0, '2026-06-05 11:01:42.443', '2026-06-05 11:01:42.443');
INSERT INTO `PostCategory` (`id`, `slug`, `nameEn`, `nameAr`, `sortOrder`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrxn002ehf6450v45ej7', 'smart-home', 'Smart Home', 'المنزل الذكي', 0, '2026-06-05 11:01:42.444', '2026-06-05 11:01:42.444');

-- PostCategoryOnPost (4 rows)
INSERT INTO `PostCategoryOnPost` (`postId`, `categoryId`) VALUES ('cmq0tdrxr002hhf643sqmuivb', 'cmq0tdrxm002dhf64d19wvmnc');
INSERT INTO `PostCategoryOnPost` (`postId`, `categoryId`) VALUES ('cmq0tdrxv002jhf648v08san5', 'cmq0tdrxn002ehf6450v45ej7');
INSERT INTO `PostCategoryOnPost` (`postId`, `categoryId`) VALUES ('cmq0tdry0002lhf64b3bc8mks', 'cmq0tdrxm002dhf64d19wvmnc');
INSERT INTO `PostCategoryOnPost` (`postId`, `categoryId`) VALUES ('cmq0tdry2002nhf64yujo4i0d', 'cmq0tdrxn002ehf6450v45ej7');

-- SiteTheme (2 rows)
INSERT INTO `SiteTheme` (`id`, `preset`, `primaryColor`, `secondaryColor`, `typography`, `faviconUrl`, `logoUrl`, `headerConfig`, `footerConfig`, `animationsEnabled`, `animationSpeed`, `lazyLoadEnabled`, `darkModeEnabled`, `spacingScale`, `customCss`, `updatedAt`, `activePresetId`, `cursorEffect`, `backgroundEffect`, `textEffect`, `brandConfig`, `backgroundEffectEnabled`, `borderStyle`, `cardStyle`, `cursorEffectEnabled`, `textEffectEnabled`) VALUES ('published', 'CUSTOM', '#00e5ff', '#7c3aed', '{"bodyFont":"Barlow","headingFont":"Exo 2","baseFontSize":"16px","headingScale":1.25}', NULL, NULL, '{"sticky":true,"ctaHref":"/contact","showCta":true,"showNav":true,"showLogo":true,"ctaLabelAr":"احصل على عرض","ctaLabelEn":"Get a Quote","showSearch":true}', '{"columns":4,"taglineAr":"تمكين الاتصال. تعزيز الأمن. تمكين المعيشة الذكية.","taglineEn":"Empowering Connectivity. Enhancing Security. Enabling Smart Living.","showSocial":true,"showContact":true,"showQuickLinks":true}', 1, 1, 1, 1, 1, NULL, '2026-06-05 11:01:42.313', 'brt', 'neon-dot', 'circuit', 'neon-glow', '{"name":"BRT TRADING LLC","tagline":"Innovative Wireless & Smart Technology Solutions","logoMode":"text","logoText":"BRT","shortName":"BRT","showTagline":true}', 1, NULL, NULL, 1, 1);
INSERT INTO `SiteTheme` (`id`, `preset`, `primaryColor`, `secondaryColor`, `typography`, `faviconUrl`, `logoUrl`, `headerConfig`, `footerConfig`, `animationsEnabled`, `animationSpeed`, `lazyLoadEnabled`, `darkModeEnabled`, `spacingScale`, `customCss`, `updatedAt`, `activePresetId`, `cursorEffect`, `backgroundEffect`, `textEffect`, `brandConfig`, `backgroundEffectEnabled`, `borderStyle`, `cardStyle`, `cursorEffectEnabled`, `textEffectEnabled`) VALUES ('draft', 'CUSTOM', '#00e5ff', '#7c3aed', '{"bodyFont":"Barlow","headingFont":"Exo 2","baseFontSize":"16px","headingScale":1.25}', NULL, NULL, '{"sticky":true,"ctaHref":"/contact","showCta":true,"showNav":true,"showLogo":true,"ctaLabelAr":"احصل على عرض","ctaLabelEn":"Get a Quote","showSearch":true}', '{"columns":4,"taglineAr":"تمكين الاتصال. تعزيز الأمن. تمكين المعيشة الذكية.","taglineEn":"Empowering Connectivity. Enhancing Security. Enabling Smart Living.","showSocial":true,"showContact":true,"showQuickLinks":true}', 1, 1, 1, 1, 1, NULL, '2026-06-05 11:01:42.318', 'brt', 'neon-dot', 'circuit', 'neon-glow', '{"name":"BRT TRADING LLC","tagline":"Innovative Wireless & Smart Technology Solutions","logoMode":"text","logoText":"BRT","shortName":"BRT","showTagline":true}', 1, NULL, NULL, 1, 1);

-- Testimonial (6 rows)
INSERT INTO `Testimonial` (`id`, `name`, `location`, `rating`, `contentEn`, `contentAr`, `videoUrl`, `imageUrl`, `isPublished`, `sortOrder`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrvi000shf640c8v3nu1', 'Ahmed Al-Rashid', 'Dubai, UAE', 5, 'BRT delivered a flawless enterprise wireless network for our headquarters. Coverage is excellent and support is responsive.', 'قدمت BRT شبكة لاسلكية ممتازة لمقرنا. التغطية رائعة والدعم سريع الاستجابة.', NULL, '', 1, 0, '2026-06-05 11:01:42.366', '2026-06-05 11:01:42.366');
INSERT INTO `Testimonial` (`id`, `name`, `location`, `rating`, `contentEn`, `contentAr`, `videoUrl`, `imageUrl`, `isPublished`, `sortOrder`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrvl000thf64ctnbms3j', 'Sarah Mitchell', 'Abu Dhabi, UAE', 5, 'Our smart home automation project exceeded expectations. Everything works seamlessly with voice control.', 'مشروع أتمتة منزلنا الذكي فاق التوقعات. كل شيء يعمل بسلاسة مع التحكم الصوتي.', NULL, '', 1, 1, '2026-06-05 11:01:42.369', '2026-06-05 11:01:42.369');
INSERT INTO `Testimonial` (`id`, `name`, `location`, `rating`, `contentEn`, `contentAr`, `videoUrl`, `imageUrl`, `isPublished`, `sortOrder`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrvm000uhf643ji7rije', 'Khalid Hassan', 'Sharjah, UAE', 5, 'Professional security installation with intelligent monitoring. We feel much safer with BRT''s integrated system.', 'تركيب أمني احترافي مع مراقبة ذكية. نشعر بأمان أكبر مع النظام المتكامل من BRT.', NULL, '', 1, 2, '2026-06-05 11:01:42.370', '2026-06-05 11:01:42.370');
INSERT INTO `Testimonial` (`id`, `name`, `location`, `rating`, `contentEn`, `contentAr`, `videoUrl`, `imageUrl`, `isPublished`, `sortOrder`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrvm000vhf642fzf3quo', 'Jennifer Park', 'Dubai, UAE', 5, 'Indoor coverage solutions eliminated dead zones across our commercial building. Highly recommended.', 'حلول التغطية الداخلية أزالت المناطق الميتة في مبنانا التجاري. نوصي بها بشدة.', NULL, '', 1, 3, '2026-06-05 11:01:42.371', '2026-06-05 11:01:42.371');
INSERT INTO `Testimonial` (`id`, `name`, `location`, `rating`, `contentEn`, `contentAr`, `videoUrl`, `imageUrl`, `isPublished`, `sortOrder`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrvn000whf64gu8fbryj', 'Omar Farouk', 'Ajman, UAE', 5, 'IoT integration helped us automate facility management and reduce operational costs significantly.', 'تكامل إنترنت الأشياء ساعدنا على أتمتة إدارة المرافق وتقليل التكاليف التشغيلية بشكل كبير.', NULL, '', 1, 4, '2026-06-05 11:01:42.372', '2026-06-05 11:01:42.372');
INSERT INTO `Testimonial` (`id`, `name`, `location`, `rating`, `contentEn`, `contentAr`, `videoUrl`, `imageUrl`, `isPublished`, `sortOrder`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrvo000xhf6439atnifr', 'Lisa Chen', 'Dubai, UAE', 5, 'End-to-end project delivery from consultation to training. BRT''s team is knowledgeable and reliable.', 'تسليم مشروع متكامل من الاستشارة إلى التدريب. فريق BRT على دراية وموثوق.', NULL, '', 1, 5, '2026-06-05 11:01:42.373', '2026-06-05 11:01:42.373');

-- TestimonialCollection (1 rows)
INSERT INTO `TestimonialCollection` (`id`, `slug`, `titleEn`, `titleAr`, `excerptEn`, `excerptAr`, `sortOrder`, `isPublished`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrvp000yhf642suswnek', 'brt-clients', 'Client Testimonials', 'آراء العملاء', NULL, NULL, 0, 1, '2026-06-05 11:01:42.374', '2026-06-05 11:01:42.374');

-- TestimonialCollectionItem (6 rows)
INSERT INTO `TestimonialCollectionItem` (`id`, `collectionId`, `testimonialId`, `sortOrder`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrvp0010hf6499zcmdzk', 'cmq0tdrvp000yhf642suswnek', 'cmq0tdrvi000shf640c8v3nu1', 0, '2026-06-05 11:01:42.374', '2026-06-05 11:01:42.374');
INSERT INTO `TestimonialCollectionItem` (`id`, `collectionId`, `testimonialId`, `sortOrder`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrvp0011hf64hjlkjmto', 'cmq0tdrvp000yhf642suswnek', 'cmq0tdrvl000thf64ctnbms3j', 1, '2026-06-05 11:01:42.374', '2026-06-05 11:01:42.374');
INSERT INTO `TestimonialCollectionItem` (`id`, `collectionId`, `testimonialId`, `sortOrder`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrvp0012hf64ue08sjlg', 'cmq0tdrvp000yhf642suswnek', 'cmq0tdrvm000uhf643ji7rije', 2, '2026-06-05 11:01:42.374', '2026-06-05 11:01:42.374');
INSERT INTO `TestimonialCollectionItem` (`id`, `collectionId`, `testimonialId`, `sortOrder`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrvp0013hf64b59u7hg3', 'cmq0tdrvp000yhf642suswnek', 'cmq0tdrvm000vhf642fzf3quo', 3, '2026-06-05 11:01:42.374', '2026-06-05 11:01:42.374');
INSERT INTO `TestimonialCollectionItem` (`id`, `collectionId`, `testimonialId`, `sortOrder`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrvp0014hf64e3udtsp6', 'cmq0tdrvp000yhf642suswnek', 'cmq0tdrvn000whf64gu8fbryj', 4, '2026-06-05 11:01:42.374', '2026-06-05 11:01:42.374');
INSERT INTO `TestimonialCollectionItem` (`id`, `collectionId`, `testimonialId`, `sortOrder`, `createdAt`, `updatedAt`) VALUES ('cmq0tdrvp0015hf64n5hta0d0', 'cmq0tdrvp000yhf642suswnek', 'cmq0tdrvo000xhf6439atnifr', 5, '2026-06-05 11:01:42.374', '2026-06-05 11:01:42.374');

-- TranslationJob (3 rows)
INSERT INTO `TranslationJob` (`id`, `entityType`, `languageCode`, `status`, `totalEntities`, `processedCount`, `errorMessage`, `createdAt`, `updatedAt`, `completedAt`) VALUES ('cmpziifc20001hfo8pl45d97s', NULL, 'ar', 'COMPLETED', 11, 2, NULL, '2026-06-04 13:09:37.442', '2026-06-04 13:09:37.540', '2026-06-04 13:09:37.537');
INSERT INTO `TranslationJob` (`id`, `entityType`, `languageCode`, `status`, `totalEntities`, `processedCount`, `errorMessage`, `createdAt`, `updatedAt`, `completedAt`) VALUES ('cmpzmx20q000dhfz0o2nlo9ko', NULL, 'ar', 'COMPLETED', 11, 0, NULL, '2026-06-04 15:12:58.491', '2026-06-04 15:12:58.522', '2026-06-04 15:12:58.519');
INSERT INTO `TranslationJob` (`id`, `entityType`, `languageCode`, `status`, `totalEntities`, `processedCount`, `errorMessage`, `createdAt`, `updatedAt`, `completedAt`) VALUES ('cmq046dp80001hf98b7c01qv8', NULL, 'ar', 'COMPLETED', 74, 63, NULL, '2026-06-04 23:16:07.003', '2026-06-04 23:16:07.675', '2026-06-04 23:16:07.673');

-- User (2 rows)
INSERT INTO `User` (`id`, `email`, `passwordHash`, `name`, `role`, `createdAt`, `updatedAt`, `addressLine1`, `addressLine2`, `city`, `country`, `dateOfBirth`, `marketingOptIn`, `phone`, `postalCode`, `state`) VALUES ('cmq0p45gz0000hfw8uh43tbf9', 'admin@azura.com', '$2b$12$7sRKw6v9xxnKrM1H0uo00OgOEdDSniUFj8lQ/G52/5AU.qJYAAYNq', 'Admin', 'ADMIN', '2026-06-05 09:02:14.963', '2026-06-05 09:02:14.963', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL);
INSERT INTO `User` (`id`, `email`, `passwordHash`, `name`, `role`, `createdAt`, `updatedAt`, `addressLine1`, `addressLine2`, `city`, `country`, `dateOfBirth`, `marketingOptIn`, `phone`, `postalCode`, `state`) VALUES ('cmpzkiwbe0000hfn0kuhcbwbf', 'ali@brt-me.com', '$2b$12$bDag4gsVvZJDi5Ogw4aevuBTE8ZYUUJuPR7oJJE81Y70RoflfRtfi', 'Ali Zahedah', 'CUSTOMER', '2026-06-04 14:05:58.680', '2026-06-04 14:05:58.680', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL);

SET FOREIGN_KEY_CHECKS = 1;
