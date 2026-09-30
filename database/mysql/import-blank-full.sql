-- AZURA one-file MySQL import: blank (full schema + seed)
-- phpMyAdmin / Hostinger: create empty database (utf8mb4_unicode_ci) → Import this file
--
-- Includes:
--   • Final schema from prisma/schema/mysql (all Prisma migrations applied)
--   • Prisma migrations folded: 20260530200231_init, 20260530232125_safar_madina_devi, 20260531120000_platform_upgrade, 20260531140000_search_fulltext, 20260531160000_locale_config, 20260531160000_theme_preset_effects, 20260531180000_multi_gallery_system, 20260531200000_multi_faq_system, 20260531210000_testimonial_collections, 20260531210001_testimonial_collection_item_fix, 20260531220000_catalog_entity_images, 20260531230000_drop_package_image, 20260531240000_site_theme_brand_config, 20260601120000_azura_company_default, 20260601120000_entity_translations, 20260601133653_azura_migration, 20260601133811_azura_migration, 20260602220000_site_theme_effect_toggles, 20260603120000_search_catalog_entity_types, 20260604120000_conversion_forms, 20260604180000_portal_support_blocks, 20260604200000_visitor_accounts_setup, 20260605120000_customer_profile_password_reset, 20260610120000_background_effect_settings, 20260614120000_catalog_products_table, 20260615120000_translation_only_architecture, 20260616120000_drop_ui_message, 20260622120000_search_portal_entity_types, 20260625120000_site_settings_published_version, 20260625140000_site_theme_preset_identity_backfill, 20260627120000_drop_seo_settings, 20260627130000_merge_wired_seo_meta
--   • mysql-schema-extras.sql (e.g. SearchDocument FULLTEXT)
--   • Blank factory seed (no admin user — complete /setup on first visit)
--
-- After import: set DATABASE_URL=mysql://… and MEDIA_STORAGE=local for Hostinger disk uploads.
-- Set SKIP_DB_MIGRATE=1 on deploy if tables already exist from this import.
--

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ========== SCHEMA (prisma/schema/mysql) ==========
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
    `registrationNo` VARCHAR(191) NOT NULL,
    `licenseInfo` TEXT NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `whatsapp` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `socialLinks` JSON NOT NULL,
    `trustBadges` JSON NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContentType` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
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
CREATE TABLE `EntityTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(64) NOT NULL,
    `entityId` VARCHAR(36) NOT NULL,
    `field` VARCHAR(64) NOT NULL,
    `localeCode` VARCHAR(16) NOT NULL,
    `value` TEXT NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('DRAFT', 'REVIEW', 'PUBLISHED') NOT NULL DEFAULT 'PUBLISHED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `EntityTranslation_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `EntityTranslation_localeCode_entityType_idx`(`localeCode`, `entityType`),
    INDEX `EntityTranslation_entityType_localeCode_status_idx`(`entityType`, `localeCode`, `status`),
    UNIQUE INDEX `EntityTranslation_entityType_entityId_field_localeCode_key`(`entityType`, `entityId`, `field`, `localeCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EntityTranslationVersion` (
    `id` VARCHAR(191) NOT NULL,
    `translationId` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `status` ENUM('DRAFT', 'REVIEW', 'PUBLISHED') NOT NULL,
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
    `localeCode` VARCHAR(16) NOT NULL,
    `slug` VARCHAR(128) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LocalizedSlug_entityType_slug_idx`(`entityType`, `slug`),
    UNIQUE INDEX `LocalizedSlug_entityType_entityId_localeCode_key`(`entityType`, `entityId`, `localeCode`),
    UNIQUE INDEX `LocalizedSlug_entityType_slug_localeCode_key`(`entityType`, `slug`, `localeCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TranslationJob` (
    `id` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(64) NULL,
    `localeCode` VARCHAR(16) NOT NULL,
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
CREATE TABLE `TranslationMemory` (
    `id` VARCHAR(191) NOT NULL,
    `sourceLocale` VARCHAR(16) NOT NULL,
    `targetLocale` VARCHAR(16) NOT NULL,
    `sourceHash` VARCHAR(64) NOT NULL,
    `sourceText` TEXT NOT NULL,
    `targetText` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TranslationMemory_sourceLocale_targetLocale_idx`(`sourceLocale`, `targetLocale`),
    UNIQUE INDEX `TranslationMemory_sourceHash_targetLocale_key`(`sourceHash`, `targetLocale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SiteTheme` (
    `id` VARCHAR(191) NOT NULL,
    `preset` ENUM('CLASSIC', 'MODERN', 'LUXURY', 'CUSTOM') NOT NULL DEFAULT 'CLASSIC',
    `siteDefaultPresetId` VARCHAR(191) NULL,
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
    `backgroundEffectSettings` JSON NOT NULL,
    `cardStyle` VARCHAR(191) NULL,
    `borderStyle` VARCHAR(191) NULL,
    `themeProvenance` JSON NOT NULL,
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
    `assetScope` VARCHAR(16) NOT NULL DEFAULT 'CMS',
    `sizeBytes` INTEGER NOT NULL DEFAULT 0,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `folderId` VARCHAR(191) NULL,
    `uploadedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MediaAsset_folderId_idx`(`folderId`),
    INDEX `MediaAsset_mediaType_idx`(`mediaType`),
    INDEX `MediaAsset_assetScope_idx`(`assetScope`),
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
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PostTag_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PostAuthor` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
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
CREATE TABLE `Product` (
    `id` VARCHAR(191) NOT NULL,
    `canonicalSlug` VARCHAR(255) NOT NULL,
    `sku` VARCHAR(64) NULL,
    `priceValue` DECIMAL(12, 2) NULL,
    `priceCurrency` VARCHAR(3) NULL,
    `availability` VARCHAR(32) NULL,
    `stockStatus` VARCHAR(32) NULL,
    `brand` VARCHAR(128) NULL,
    `category` VARCHAR(128) NULL,
    `categories` JSON NULL,
    `tags` JSON NULL,
    `collectionSlugs` JSON NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'published',
    `sourceType` VARCHAR(16) NULL,
    `sourceFile` VARCHAR(512) NULL,
    `payload` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Product_canonicalSlug_key`(`canonicalSlug`),
    UNIQUE INDEX `Product_sku_key`(`sku`),
    INDEX `Product_canonicalSlug_idx`(`canonicalSlug`),
    INDEX `Product_brand_idx`(`brand`),
    INDEX `Product_category_idx`(`category`),
    INDEX `Product_status_idx`(`status`),
    INDEX `Product_stockStatus_idx`(`stockStatus`),
    INDEX `Product_priceValue_idx`(`priceValue`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CatalogCollection` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(128) NOT NULL,
    `parentSlug` VARCHAR(128) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `visible` BOOLEAN NOT NULL DEFAULT true,
    `conditions` JSON NOT NULL,
    `metadata` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CatalogCollection_slug_key`(`slug`),
    INDEX `CatalogCollection_parentSlug_idx`(`parentSlug`),
    INDEX `CatalogCollection_visible_idx`(`visible`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SiteSettings` (
    `locale` VARCHAR(10) NOT NULL,
    `payload` JSON NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `publishedVersion` INTEGER NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`locale`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SearchAnalyticsSnapshot` (
    `locale` VARCHAR(10) NOT NULL,
    `data` JSON NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`locale`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SearchDocument` (
    `id` VARCHAR(191) NOT NULL,
    `entityType` ENUM('CONTENT_ITEM', 'CONTENT_COLLECTION', 'CONTENT_TYPE', 'CATALOG_PRODUCT', 'CATALOG_COLLECTION', 'CATALOG_CATEGORY', 'POST', 'CMS_PAGE', 'FAQ', 'MEDIA', 'TESTIMONIAL', 'TEAM_MEMBER', 'PARTNER') NOT NULL,
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
    `canonicalUrl` VARCHAR(191) NULL,
    `robots` VARCHAR(191) NULL,
    `focusKeywords` VARCHAR(191) NULL,
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
CREATE TABLE `SeoSubmissionJob` (
    `id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(32) NOT NULL,
    `kind` VARCHAR(16) NOT NULL,
    `reason` VARCHAR(64) NOT NULL,
    `url` VARCHAR(512) NOT NULL,
    `status` ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'EXHAUSTED') NOT NULL DEFAULT 'PENDING',
    `attemptCount` INTEGER NOT NULL DEFAULT 0,
    `responseStatus` INTEGER NULL,
    `lastError` TEXT NULL,
    `metadata` JSON NOT NULL,
    `scheduledAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SeoSubmissionJob_status_scheduledAt_idx`(`status`, `scheduledAt`),
    INDEX `SeoSubmissionJob_provider_status_idx`(`provider`, `status`),
    UNIQUE INDEX `SeoSubmissionJob_provider_kind_url_key`(`provider`, `kind`, `url`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SeoRunnerLock` (
    `key` VARCHAR(64) NOT NULL,
    `lockedUntil` DATETIME(3) NOT NULL,
    `owner` VARCHAR(128) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SeoProviderTelemetry` (
    `id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(32) NOT NULL,
    `eventType` ENUM('QUEUED', 'STARTED', 'COMPLETED', 'FAILED', 'EXHAUSTED', 'SKIPPED') NOT NULL,
    `status` ENUM('SUCCESS', 'FAILURE', 'INFO') NOT NULL,
    `responseCode` INTEGER NULL,
    `latencyMs` INTEGER NULL,
    `attemptCount` INTEGER NOT NULL DEFAULT 0,
    `errorClass` VARCHAR(64) NULL,
    `jobId` VARCHAR(128) NULL,
    `url` VARCHAR(512) NULL,
    `metadata` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SeoProviderTelemetry_provider_createdAt_idx`(`provider`, `createdAt`),
    INDEX `SeoProviderTelemetry_eventType_createdAt_idx`(`eventType`, `createdAt`),
    INDEX `SeoProviderTelemetry_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SeoHealthSnapshot` (
    `id` VARCHAR(191) NOT NULL,
    `score` INTEGER NOT NULL,
    `componentBreakdown` JSON NOT NULL,
    `generatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SeoHealthSnapshot_generatedAt_idx`(`generatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SeoCrawlIssue` (
    `id` VARCHAR(191) NOT NULL,
    `issueKey` VARCHAR(256) NOT NULL,
    `type` VARCHAR(64) NOT NULL,
    `severity` ENUM('CRITICAL', 'WARNING', 'INFO') NOT NULL,
    `url` VARCHAR(512) NOT NULL,
    `details` JSON NOT NULL,
    `source` VARCHAR(64) NULL,
    `firstDetectedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastDetectedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SeoCrawlIssue_issueKey_key`(`issueKey`),
    INDEX `SeoCrawlIssue_severity_resolvedAt_idx`(`severity`, `resolvedAt`),
    INDEX `SeoCrawlIssue_type_resolvedAt_idx`(`type`, `resolvedAt`),
    INDEX `SeoCrawlIssue_lastDetectedAt_idx`(`lastDetectedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SeoSearchMetric` (
    `id` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `url` VARCHAR(512) NOT NULL,
    `query` VARCHAR(512) NOT NULL DEFAULT '',
    `country` VARCHAR(8) NOT NULL DEFAULT '',
    `device` VARCHAR(32) NOT NULL DEFAULT '',
    `source` VARCHAR(32) NOT NULL,
    `clicks` INTEGER NOT NULL DEFAULT 0,
    `impressions` INTEGER NOT NULL DEFAULT 0,
    `ctr` DOUBLE NOT NULL DEFAULT 0,
    `position` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SeoSearchMetric_date_source_idx`(`date`, `source`),
    INDEX `SeoSearchMetric_url_date_idx`(`url`, `date`),
    INDEX `SeoSearchMetric_query_date_idx`(`query`, `date`),
    UNIQUE INDEX `SeoSearchMetric_source_date_url_query_country_device_key`(`source`, `date`, `url`, `query`, `country`, `device`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SeoRichResultIssue` (
    `id` VARCHAR(191) NOT NULL,
    `issueKey` VARCHAR(256) NOT NULL,
    `type` VARCHAR(64) NOT NULL,
    `category` ENUM('ERROR', 'WARNING') NOT NULL,
    `url` VARCHAR(512) NOT NULL,
    `details` JSON NOT NULL,
    `eligibility` ENUM('ELIGIBLE', 'ELIGIBLE_WITH_WARNINGS', 'NOT_ELIGIBLE') NOT NULL,
    `source` VARCHAR(64) NOT NULL DEFAULT 'internal',
    `detectedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SeoRichResultIssue_issueKey_key`(`issueKey`),
    INDEX `SeoRichResultIssue_type_eligibility_idx`(`type`, `eligibility`),
    INDEX `SeoRichResultIssue_category_resolvedAt_idx`(`category`, `resolvedAt`),
    INDEX `SeoRichResultIssue_detectedAt_idx`(`detectedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Custom404` (
    `id` VARCHAR(191) NOT NULL,
    `locale` VARCHAR(191) NOT NULL,
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
    `fallbackLocaleCode` VARCHAR(16) NULL,
    `completionPercent` INTEGER NOT NULL DEFAULT 0,
    `lastTranslationSyncAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `LocaleConfig_code_key`(`code`),
    UNIQUE INDEX `LocaleConfig_urlPrefix_key`(`urlPrefix`),
    INDEX `LocaleConfig_isEnabled_sortOrder_idx`(`isEnabled`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PricingPlanSet` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
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
    `priceMonthly` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `priceYearly` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `discountPercent` INTEGER NOT NULL DEFAULT 0,
    `isHighlighted` BOOLEAN NOT NULL DEFAULT false,
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
    `href` VARCHAR(191) NOT NULL DEFAULT '',
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
    `email` VARCHAR(191) NOT NULL DEFAULT '',
    `phone` VARCHAR(191) NOT NULL DEFAULT '',
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
    `logoUrl` VARCHAR(191) NOT NULL DEFAULT '',
    `websiteUrl` VARCHAR(191) NOT NULL DEFAULT '',
    `profileUrl` VARCHAR(191) NOT NULL DEFAULT '',
    `email` VARCHAR(191) NOT NULL DEFAULT '',
    `phone` VARCHAR(191) NOT NULL DEFAULT '',
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
ALTER TABLE `FormSubmission` ADD CONSTRAINT `FormSubmission_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `FormTemplate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FormDraft` ADD CONSTRAINT `FormDraft_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `FormTemplate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DownloadGateUnlock` ADD CONSTRAINT `DownloadGateUnlock_mediaAssetId_fkey` FOREIGN KEY (`mediaAssetId`) REFERENCES `MediaAsset`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FormWebhookDelivery` ADD CONSTRAINT `FormWebhookDelivery_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `FormSubmission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EntityTranslationVersion` ADD CONSTRAINT `EntityTranslationVersion_translationId_fkey` FOREIGN KEY (`translationId`) REFERENCES `EntityTranslation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

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

-- ========== SCHEMA EXTRAS ==========
-- MySQL-only schema extras (not emitted by Prisma migrate diff).
-- Sourced from prisma/migrations where indexes live outside the datamodel.

-- 20260531140000_search_fulltext
CREATE FULLTEXT INDEX `SearchDocument_fulltext_idx` ON `SearchDocument`(`title`, `body`);

-- ========== SEED (blank) ==========
-- CmsPage (17 rows)
INSERT INTO `CmsPage` (`id`, `slug`, `templateKey`, `status`, `blocks`, `publishedAt`, `scheduledAt`, `createdAt`, `updatedAt`, `visualSettings`) VALUES ('cmpv9628a001shf2w4z2l68c6', 'home', 'home', 'DRAFT', '[]', NULL, NULL, '2026-06-01 13:36:59.338', '2026-06-05 11:01:39.371', '{"siteEffects":{"background":"inherit"},"animationsEnabled":true}');
INSERT INTO `CmsPage` (`id`, `slug`, `templateKey`, `status`, `blocks`, `publishedAt`, `scheduledAt`, `createdAt`, `updatedAt`, `visualSettings`) VALUES ('cmpv9628c001thf2w3e8te0ly', 'about', 'about', 'DRAFT', '[]', NULL, NULL, '2026-06-01 13:36:59.340', '2026-06-05 11:01:39.371', '{}');
INSERT INTO `CmsPage` (`id`, `slug`, `templateKey`, `status`, `blocks`, `publishedAt`, `scheduledAt`, `createdAt`, `updatedAt`, `visualSettings`) VALUES ('cmpv9628d001uhf2wj35o8c1o', 'contact', 'contact', 'DRAFT', '[]', NULL, NULL, '2026-06-01 13:36:59.342', '2026-06-05 11:01:39.371', '{}');
INSERT INTO `CmsPage` (`id`, `slug`, `templateKey`, `status`, `blocks`, `publishedAt`, `scheduledAt`, `createdAt`, `updatedAt`, `visualSettings`) VALUES ('cmpv9628f001vhf2wywizdn0i', 'packages', 'packages', 'DRAFT', '[]', NULL, NULL, '2026-06-01 13:36:59.343', '2026-06-05 11:01:39.371', '{}');
INSERT INTO `CmsPage` (`id`, `slug`, `templateKey`, `status`, `blocks`, `publishedAt`, `scheduledAt`, `createdAt`, `updatedAt`, `visualSettings`) VALUES ('cmpv9628i001xhf2wh2ban5s8', 'gallery', 'gallery', 'DRAFT', '[]', NULL, NULL, '2026-06-01 13:36:59.347', '2026-06-05 11:01:39.371', '{}');
INSERT INTO `CmsPage` (`id`, `slug`, `templateKey`, `status`, `blocks`, `publishedAt`, `scheduledAt`, `createdAt`, `updatedAt`, `visualSettings`) VALUES ('cmpv9628k001yhf2wm8z0982c', 'testimonials', 'testimonials', 'DRAFT', '[]', NULL, NULL, '2026-06-01 13:36:59.348', '2026-06-05 11:01:39.371', '{}');
INSERT INTO `CmsPage` (`id`, `slug`, `templateKey`, `status`, `blocks`, `publishedAt`, `scheduledAt`, `createdAt`, `updatedAt`, `visualSettings`) VALUES ('cmpv9628l001zhf2wrg4nzifr', 'hotels-transport', 'hotels-transport', 'DRAFT', '[]', NULL, NULL, '2026-06-01 13:36:59.350', '2026-06-05 11:01:39.371', '{}');
INSERT INTO `CmsPage` (`id`, `slug`, `templateKey`, `status`, `blocks`, `publishedAt`, `scheduledAt`, `createdAt`, `updatedAt`, `visualSettings`) VALUES ('cmq05v0tp0007hflkcksu8qmq', 'products', 'products', 'DRAFT', '[]', NULL, NULL, '2026-06-05 00:03:16.334', '2026-06-05 11:01:39.371', '{}');
INSERT INTO `CmsPage` (`id`, `slug`, `templateKey`, `status`, `blocks`, `publishedAt`, `scheduledAt`, `createdAt`, `updatedAt`, `visualSettings`) VALUES ('cmq05v0u30008hflkq684a21o', 'collections', 'collections', 'DRAFT', '[]', NULL, NULL, '2026-06-05 00:03:16.348', '2026-06-05 11:01:39.371', '{}');
INSERT INTO `CmsPage` (`id`, `slug`, `templateKey`, `status`, `blocks`, `publishedAt`, `scheduledAt`, `createdAt`, `updatedAt`, `visualSettings`) VALUES ('cmq05v0u80009hflksefq0grx', 'services', 'services', 'DRAFT', '[]', NULL, NULL, '2026-06-05 00:03:16.352', '2026-06-05 11:01:39.371', '{}');
INSERT INTO `CmsPage` (`id`, `slug`, `templateKey`, `status`, `blocks`, `publishedAt`, `scheduledAt`, `createdAt`, `updatedAt`, `visualSettings`) VALUES ('cmq05v0ub000ahflkd7ca8i8k', 'compare', 'compare', 'DRAFT', '[]', NULL, NULL, '2026-06-05 00:03:16.355', '2026-06-05 11:01:39.371', '{}');
INSERT INTO `CmsPage` (`id`, `slug`, `templateKey`, `status`, `blocks`, `publishedAt`, `scheduledAt`, `createdAt`, `updatedAt`, `visualSettings`) VALUES ('cmq05v0uf000bhflk8am0vhv5', 'favorites', 'favorites', 'DRAFT', '[]', NULL, NULL, '2026-06-05 00:03:16.360', '2026-06-05 11:01:39.371', '{}');
INSERT INTO `CmsPage` (`id`, `slug`, `templateKey`, `status`, `blocks`, `publishedAt`, `scheduledAt`, `createdAt`, `updatedAt`, `visualSettings`) VALUES ('cmq05v0uk000chflk5roi5z5m', 'account', 'account', 'DRAFT', '[]', NULL, NULL, '2026-06-05 00:03:16.364', '2026-06-05 11:01:39.371', '{}');
INSERT INTO `CmsPage` (`id`, `slug`, `templateKey`, `status`, `blocks`, `publishedAt`, `scheduledAt`, `createdAt`, `updatedAt`, `visualSettings`) VALUES ('cmq0j4wac0027hfd4sahais3b', 'smart-home', 'landing', 'DRAFT', '[]', NULL, NULL, '2026-06-05 06:14:52.020', '2026-06-05 11:01:39.371', '{}');
INSERT INTO `CmsPage` (`id`, `slug`, `templateKey`, `status`, `blocks`, `publishedAt`, `scheduledAt`, `createdAt`, `updatedAt`, `visualSettings`) VALUES ('cmq0j4waj0028hfd4muyeccf4', 'security-solutions', 'landing', 'DRAFT', '[]', NULL, NULL, '2026-06-05 06:14:52.027', '2026-06-05 11:01:39.371', '{}');
INSERT INTO `CmsPage` (`id`, `slug`, `templateKey`, `status`, `blocks`, `publishedAt`, `scheduledAt`, `createdAt`, `updatedAt`, `visualSettings`) VALUES ('cmq0j4was0029hfd4p0t4ll4q', 'enterprise-wireless', 'landing', 'DRAFT', '[]', NULL, NULL, '2026-06-05 06:14:52.036', '2026-06-05 11:01:39.371', '{}');
INSERT INTO `CmsPage` (`id`, `slug`, `templateKey`, `status`, `blocks`, `publishedAt`, `scheduledAt`, `createdAt`, `updatedAt`, `visualSettings`) VALUES ('cmq0j593r002rhffcy04slljf', 'why-choose-us', 'landing', 'DRAFT', '[]', NULL, NULL, '2026-06-05 06:15:08.631', '2026-06-05 11:01:39.371', '{}');

-- CompanyInfo (1 rows)
INSERT INTO `CompanyInfo` (`id`, `name`, `registrationNo`, `licenseInfo`, `phone`, `whatsapp`, `email`, `socialLinks`, `trustBadges`, `updatedAt`) VALUES ('default', 'AZURA solution', '', '', '', '', 'info@azura.com', '{}', '[]', '2026-06-05 11:01:39.398');

-- ContentType (4 rows)
INSERT INTO `ContentType` (`id`, `slug`, `icon`, `routePrefix`, `fieldSchema`, `displaySchema`, `adminConfig`, `sortOrder`, `isEnabled`, `createdAt`, `updatedAt`) VALUES ('cmpv9625p0001hf2w01fa4hzm', 'catalog-items', 'package', 'packages', '[{"key":"duration","type":"number","group":"pricing","compare":true,"labelEn":"Duration (days)","required":true,"compareGroup":"Pricing","compareOrder":0,"highlightDifferences":true},{"key":"price","type":"price","group":"pricing","compare":true,"labelEn":"Price","required":true,"compareGroup":"Pricing","compareOrder":10,"highlightDifferences":true},{"key":"currency","type":"text","group":"pricing","compare":true,"labelEn":"Currency","placeholder":"USD","compareGroup":"Pricing","compareOrder":20,"highlightDifferences":true},{"key":"travelDates","type":"json","group":"details","labelEn":"Travel dates (JSON array)"},{"key":"facilities","type":"json","group":"details","labelEn":"Facilities (JSON)","localized":true},{"key":"features","type":"json","group":"details","labelEn":"Features (JSON)","localized":true},{"key":"itinerary","type":"json","group":"details","labelEn":"Itinerary (JSON)","localized":true},{"key":"hotelInfo","type":"textarea","group":"details","compare":true,"labelEn":"Hotel info","localized":true,"compareGroup":"Details","compareOrder":30,"highlightDifferences":true},{"key":"airlineInfo","type":"textarea","group":"details","compare":true,"labelEn":"Airline info","localized":true,"compareGroup":"Details","compareOrder":40,"highlightDifferences":true}]', '{"showPrice":true,"showCategory":true,"showDuration":true}', '{"isComparable":true,"inquiryEnabled":true,"comparisonSettings":{"enabled":true,"maxItems":4,"comparisonMode":"hybrid"}}', 0, 1, '2026-06-01 13:36:59.246', '2026-06-04 21:15:29.372');
INSERT INTO `ContentType` (`id`, `slug`, `icon`, `routePrefix`, `fieldSchema`, `displaySchema`, `adminConfig`, `sortOrder`, `isEnabled`, `createdAt`, `updatedAt`) VALUES ('cmpv9625t0002hf2wcgzesujw', 'listings', 'building', 'hotels-transport', '[{"key":"city","type":"select","group":"location","compare":true,"labelEn":"City","options":[{"value":"MAKKAH","labelEn":"Makkah"},{"value":"MADINAH","labelEn":"Madinah"}],"compareGroup":"Location","compareOrder":0,"highlightDifferences":true},{"key":"stars","type":"number","group":"details","compare":true,"labelEn":"Star rating","compareGroup":"Details","compareOrder":10,"highlightDifferences":true},{"key":"highlights","type":"json","group":"details","labelEn":"Highlights (JSON)","localized":true},{"key":"address","type":"textarea","group":"location","labelEn":"Address","localized":true},{"key":"distance","type":"textarea","group":"location","compare":true,"labelEn":"Distance info","localized":true,"compareGroup":"Location","compareOrder":20,"highlightDifferences":true},{"key":"amenities","type":"json","group":"details","compare":true,"labelEn":"Amenities (JSON)","localized":true,"compareGroup":"Details","compareOrder":30,"highlightDifferences":true}]', '{"showCity":true,"showPrice":false,"showStars":true}', '{"isComparable":true,"inquiryEnabled":false,"comparisonSettings":{"enabled":true,"maxItems":4,"comparisonMode":"hybrid"}}', 1, 1, '2026-06-01 13:36:59.249', '2026-06-04 21:15:29.384');
INSERT INTO `ContentType` (`id`, `slug`, `icon`, `routePrefix`, `fieldSchema`, `displaySchema`, `adminConfig`, `sortOrder`, `isEnabled`, `createdAt`, `updatedAt`) VALUES ('cmpv9625u0003hf2w6pjnojic', 'offerings', 'briefcase', 'hotels-transport', '[{"key":"offeringType","type":"select","group":"cta","compare":true,"labelEn":"Type","options":[{"value":"TRANSPORT","labelEn":"Transport"},{"value":"AIRPORT_PICKUP","labelEn":"Airport pickup"},{"value":"HOTEL","labelEn":"Hotel service"},{"value":"OTHER","labelEn":"Other"}],"compareGroup":"Cta","compareOrder":0,"highlightDifferences":true},{"key":"highlights","type":"json","group":"details","compare":true,"labelEn":"Highlights (JSON)","localized":true,"compareGroup":"Details","compareOrder":10,"highlightDifferences":true},{"key":"icon","type":"text","group":"display","labelEn":"Icon name","placeholder":"compass"},{"key":"ctaLabel","type":"text","group":"cta","compare":true,"labelEn":"CTA label","localized":true,"compareGroup":"Cta","compareOrder":20,"highlightDifferences":true},{"key":"ctaHref","type":"url","group":"cta","labelEn":"CTA link"}]', '{"showIcon":true,"showPrice":false}', '{"isComparable":true,"inquiryEnabled":false,"comparisonSettings":{"enabled":true,"maxItems":4,"comparisonMode":"hybrid"}}', 2, 1, '2026-06-01 13:36:59.251', '2026-06-04 21:15:29.387');
INSERT INTO `ContentType` (`id`, `slug`, `icon`, `routePrefix`, `fieldSchema`, `displaySchema`, `adminConfig`, `sortOrder`, `isEnabled`, `createdAt`, `updatedAt`) VALUES ('cmpwfc6xz0000hfl4uqgff75a', 'test-content', 'box', 'test-content', '[{"key":"field1","type":"text","group":"general","labelEn":"New field","localized":true},{"key":"field2","type":"number","group":"general","labelEn":"New field","localized":true},{"key":"field3","type":"price","group":"general","labelEn":"New field"}]', '{}', '{"inquiryEnabled":true}', 0, 1, '2026-06-02 09:17:29.253', '2026-06-02 09:22:56.531');

-- Custom404 (2 rows)
INSERT INTO `Custom404` (`id`, `locale`, `blocks`, `updatedAt`) VALUES ('cmpv9628r0021hf2wt3cns8bm', 'en', '[]', '2026-06-05 11:01:39.419');
INSERT INTO `Custom404` (`id`, `locale`, `blocks`, `updatedAt`) VALUES ('cmpv9628t0022hf2w412o0vn6', 'ar', '[]', '2026-06-05 11:01:39.419');

-- FormTemplate (1 rows)
INSERT INTO `FormTemplate` (`id`, `name`, `slug`, `category`, `description`, `definition`, `isPublished`, `createdAt`, `updatedAt`) VALUES ('cmq0kxvsw0037hfa4mozlyyi3', 'Travel Inquiry Form', 'safar-inquiry', 'GENERAL', NULL, '{"fields":[{"id":"name","type":"text","labelAr":"الاسم الكامل","labelEn":"Full Name","required":true},{"id":"email","type":"email","labelAr":"البريد الإلكتروني","labelEn":"Email","required":true},{"id":"phone","type":"phone","labelAr":"الهاتف","labelEn":"Phone","required":true},{"id":"destination","type":"text","labelAr":"الوجهة المفضلة","labelEn":"Preferred Destination","required":false},{"id":"dates","type":"text","labelAr":"تواريخ السفر","labelEn":"Travel Dates","required":false},{"id":"travelers","type":"number","labelAr":"عدد المسافرين","labelEn":"Number of Travelers","required":false},{"id":"budget","type":"text","labelAr":"نطاق الميزانية","labelEn":"Budget Range","required":false},{"id":"message","type":"textarea","labelAr":"تفاصيل إضافية","labelEn":"Additional Details","required":false}]}', 1, '2026-06-05 07:05:24.032', '2026-06-05 07:05:24.032');

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
INSERT INTO `JsonStore` (`id`, `namespace`, `key`, `data`, `version`, `createdAt`, `updatedAt`) VALUES ('cmq0tdplr0000hfakvmu818gt', 'header-workspace', 'default', '{"version":1,"branding":{"tagline":"","logoMode":"text","logoText":"AZURA","areaStyle":"default","brandName":"AZURA solution","logoSizing":{"mode":"fixed","adaptiveMax":48,"adaptiveMin":28,"heightMobile":32,"heightTablet":36,"heightDesktop":42},"showTagline":false,"logoImageDarkUrl":"","brandLayoutMobile":"logo-and-text","logoImageLightUrl":"","brandLayoutDesktop":"logo-and-text","brandNameTypography":{"customFont":"","fontSource":"heading","fontWeight":800,"sizeMobile":"1rem","sizeDesktop":"1.2rem"},"brandTaglineTypography":{"customFont":"","fontSource":"body","fontWeight":400,"sizeMobile":"0.65rem","sizeDesktop":"0.72rem"}},"settings":{"menuType":"dropdown","menuShadow":"strong","mobileType":"hamburger","headerStyle":"normal-compact","overlayMode":"none","overlaySurface":"glass","menuBlurStrength":"medium","menuGlassEnabled":true,"menuTransparency":92,"mobileMenuShadow":"strong","headerDesktopMode":"sticky","mobileMenuSurface":"glass","headerBorderRadius":"lg","menuPanelAnimation":"slide","mobileMenuAnimation":"slide","mobileMenuBlurStrength":"medium","mobileMenuGlassEnabled":true,"mobileMenuTransparency":96,"firstBlockHeaderOverlay":{"enabled":false,"contentInset":"auto"}},"activeMenuKey":"mainMenu","headerActions":[{"id":"action-search","icon":"fa-search","type":"search","label":"Search","style":"icon","visible":true,"outlined":false},{"id":"action-account","icon":"fa-user","type":"account","label":"Account","style":"icon","visible":true,"outlined":false},{"id":"action-cta","icon":"fa-envelope","type":"custom","label":"Inquire","style":"solid","visible":true,"outlined":false}],"menusDatabase":{"mainMenu":{"name":"Main Menu","items":[],"globalApply":"Both"}}}', 1, '2026-06-05 11:01:39.423', '2026-06-05 11:01:39.423');
INSERT INTO `JsonStore` (`id`, `namespace`, `key`, `data`, `version`, `createdAt`, `updatedAt`) VALUES ('cmq0tdpmb0001hfak2erm7icf', 'footer-workspace', 'default', '{"design":{"columnGap":"normal","linkStyle":"muted","borderStyle":"subtle","headingStyle":"uppercase"},"layout":"grid","columns":[{"id":"brand","type":"brand","links":[],"title":"","enabled":true,"showEmail":true,"showPhone":true,"menuSource":"custom","showSocial":true,"showAddress":true},{"id":"links","type":"menu","links":[{"href":"/","label":"Home"},{"href":"/products","label":"Products"},{"href":"/collections","label":"Collections"},{"href":"/about","label":"About"},{"href":"/contact","label":"Contact"}],"title":"Quick links","enabled":true,"showEmail":true,"showPhone":true,"menuSource":"custom","showSocial":true,"showAddress":true},{"id":"contact","type":"contact","links":[],"title":"Contact","enabled":true,"showEmail":true,"showPhone":true,"menuSource":"custom","showSocial":true,"showAddress":false},{"id":"social","type":"social","links":[],"title":"Connect","enabled":true,"showEmail":true,"showPhone":true,"menuSource":"custom","showSocial":true,"showAddress":true}],"version":1,"copyright":{"suffix":"","showBar":true,"legalLinks":[],"rightsText":"All rights reserved."},"gridColumns":3}', 1, '2026-06-05 11:01:39.443', '2026-06-05 11:01:39.443');
INSERT INTO `JsonStore` (`id`, `namespace`, `key`, `data`, `version`, `createdAt`, `updatedAt`) VALUES ('cmpzxm61e0007hfc8nco1a0jf', 'whatsapp', 'settings', '{"fab":{"size":"sm","enabled":true,"iconUrl":null,"iconSize":"1.75rem","position":"bottom-end","showIcon":true,"showLabel":false,"textColor":"#ffffff","offsetSide":24,"offsetBottom":24,"buttonVariant":"custom","backgroundColor":"#25D366"},"contactPage":{"size":"md","enabled":true,"iconUrl":null,"iconSize":"1.75rem","showIcon":true,"fullWidth":true,"showLabel":true,"textColor":"#ffffff","buttonVariant":"gold","backgroundColor":"#25D366"},"contentInquiry":{"size":"md","enabled":true,"iconUrl":null,"iconSize":"1.75rem","showIcon":true,"fullWidth":true,"showLabel":true,"textColor":"#ffffff","buttonVariant":"gold","backgroundColor":"#25D366"}}', 1, '2026-06-04 20:12:26.255', '2026-06-04 20:12:26.255');

-- EntityTranslation (58 rows)
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-1', 'ContentType', 'cmpv9625p0001hf2w01fa4hzm', 'name', 'en', 'Catalog Items', 1, 'PUBLISHED', '2026-06-01 13:36:59.246', '2026-06-01 13:36:59.246');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-2', 'ContentType', 'cmpv9625p0001hf2w01fa4hzm', 'name', 'ar', 'عناصر الفهرس', 1, 'PUBLISHED', '2026-06-01 13:36:59.246', '2026-06-01 13:36:59.246');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-3', 'ContentType', 'cmpv9625p0001hf2w01fa4hzm', 'labelSingular', 'en', 'Catalog item', 1, 'PUBLISHED', '2026-06-01 13:36:59.246', '2026-06-01 13:36:59.246');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-4', 'ContentType', 'cmpv9625p0001hf2w01fa4hzm', 'labelSingular', 'ar', 'عنصر', 1, 'PUBLISHED', '2026-06-01 13:36:59.246', '2026-06-01 13:36:59.246');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-5', 'ContentType', 'cmpv9625p0001hf2w01fa4hzm', 'labelPlural', 'en', 'Catalog items', 1, 'PUBLISHED', '2026-06-01 13:36:59.246', '2026-06-01 13:36:59.246');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-6', 'ContentType', 'cmpv9625p0001hf2w01fa4hzm', 'labelPlural', 'ar', 'عناصر الفهرس', 1, 'PUBLISHED', '2026-06-01 13:36:59.246', '2026-06-01 13:36:59.246');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-7', 'ContentType', 'cmpv9625t0002hf2wcgzesujw', 'name', 'en', 'Listings', 1, 'PUBLISHED', '2026-06-01 13:36:59.249', '2026-06-01 13:36:59.249');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-8', 'ContentType', 'cmpv9625t0002hf2wcgzesujw', 'name', 'ar', 'قوائم', 1, 'PUBLISHED', '2026-06-01 13:36:59.249', '2026-06-01 13:36:59.249');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-9', 'ContentType', 'cmpv9625t0002hf2wcgzesujw', 'labelSingular', 'en', 'Listing', 1, 'PUBLISHED', '2026-06-01 13:36:59.249', '2026-06-01 13:36:59.249');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-10', 'ContentType', 'cmpv9625t0002hf2wcgzesujw', 'labelSingular', 'ar', 'قائمة', 1, 'PUBLISHED', '2026-06-01 13:36:59.249', '2026-06-01 13:36:59.249');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-11', 'ContentType', 'cmpv9625t0002hf2wcgzesujw', 'labelPlural', 'en', 'Listings', 1, 'PUBLISHED', '2026-06-01 13:36:59.249', '2026-06-01 13:36:59.249');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-12', 'ContentType', 'cmpv9625t0002hf2wcgzesujw', 'labelPlural', 'ar', 'قوائم', 1, 'PUBLISHED', '2026-06-01 13:36:59.249', '2026-06-01 13:36:59.249');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-13', 'ContentType', 'cmpv9625u0003hf2w6pjnojic', 'name', 'en', 'Offerings', 1, 'PUBLISHED', '2026-06-01 13:36:59.251', '2026-06-01 13:36:59.251');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-14', 'ContentType', 'cmpv9625u0003hf2w6pjnojic', 'name', 'ar', 'عروض', 1, 'PUBLISHED', '2026-06-01 13:36:59.251', '2026-06-01 13:36:59.251');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-15', 'ContentType', 'cmpv9625u0003hf2w6pjnojic', 'labelSingular', 'en', 'Offering', 1, 'PUBLISHED', '2026-06-01 13:36:59.251', '2026-06-01 13:36:59.251');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-16', 'ContentType', 'cmpv9625u0003hf2w6pjnojic', 'labelSingular', 'ar', 'عرض', 1, 'PUBLISHED', '2026-06-01 13:36:59.251', '2026-06-01 13:36:59.251');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-17', 'ContentType', 'cmpv9625u0003hf2w6pjnojic', 'labelPlural', 'en', 'Offerings', 1, 'PUBLISHED', '2026-06-01 13:36:59.251', '2026-06-01 13:36:59.251');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-18', 'ContentType', 'cmpv9625u0003hf2w6pjnojic', 'labelPlural', 'ar', 'عروض', 1, 'PUBLISHED', '2026-06-01 13:36:59.251', '2026-06-01 13:36:59.251');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-19', 'ContentType', 'cmpwfc6xz0000hfl4uqgff75a', 'name', 'en', 'test content', 1, 'PUBLISHED', '2026-06-02 09:17:29.253', '2026-06-02 09:17:29.253');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-20', 'ContentType', 'cmpwfc6xz0000hfl4uqgff75a', 'name', 'ar', 'اختبار محتوى', 1, 'PUBLISHED', '2026-06-02 09:17:29.253', '2026-06-02 09:17:29.253');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-21', 'ContentType', 'cmpwfc6xz0000hfl4uqgff75a', 'labelSingular', 'en', 'Item', 1, 'PUBLISHED', '2026-06-02 09:17:29.253', '2026-06-02 09:17:29.253');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-22', 'ContentType', 'cmpwfc6xz0000hfl4uqgff75a', 'labelSingular', 'ar', 'عنصر', 1, 'PUBLISHED', '2026-06-02 09:17:29.253', '2026-06-02 09:17:29.253');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-23', 'ContentType', 'cmpwfc6xz0000hfl4uqgff75a', 'labelPlural', 'en', 'Items', 1, 'PUBLISHED', '2026-06-02 09:17:29.253', '2026-06-02 09:17:29.253');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-24', 'ContentType', 'cmpwfc6xz0000hfl4uqgff75a', 'labelPlural', 'ar', 'عناصر', 1, 'PUBLISHED', '2026-06-02 09:17:29.253', '2026-06-02 09:17:29.253');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-25', 'MediaAsset', 'cmq0kxvsj002qhfa44sjj6tkv', 'alt', 'en', 'Safar Al-Madina Travel Agency', 1, 'PUBLISHED', '2026-06-05 07:05:24.020', '2026-06-05 07:05:24.020');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-26', 'MediaAsset', 'cmq0kxvsj002qhfa44sjj6tkv', 'alt', 'ar', 'وكالة سفر الصفار المدينة', 1, 'PUBLISHED', '2026-06-05 07:05:24.020', '2026-06-05 07:05:24.020');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-27', 'MediaAsset', 'cmq0kxvsk002rhfa43c7i7xq7', 'alt', 'en', 'Makkah destination', 1, 'PUBLISHED', '2026-06-05 07:05:24.021', '2026-06-05 07:05:24.021');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-28', 'MediaAsset', 'cmq0kxvsk002rhfa43c7i7xq7', 'alt', 'ar', 'وجهة مكة', 1, 'PUBLISHED', '2026-06-05 07:05:24.021', '2026-06-05 07:05:24.021');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-29', 'MediaAsset', 'cmq0kxvsl002shfa4jiag8jwv', 'alt', 'en', 'Madinah destination', 1, 'PUBLISHED', '2026-06-05 07:05:24.022', '2026-06-05 07:05:24.022');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-30', 'MediaAsset', 'cmq0kxvsl002shfa4jiag8jwv', 'alt', 'ar', 'وجهة المدينة', 1, 'PUBLISHED', '2026-06-05 07:05:24.022', '2026-06-05 07:05:24.022');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-31', 'MediaAsset', 'cmq0kxvsm002thfa4y8kg2crl', 'alt', 'en', 'Dubai skyline', 1, 'PUBLISHED', '2026-06-05 07:05:24.022', '2026-06-05 07:05:24.022');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-32', 'MediaAsset', 'cmq0kxvsm002thfa4y8kg2crl', 'alt', 'ar', 'أفق دبي', 1, 'PUBLISHED', '2026-06-05 07:05:24.022', '2026-06-05 07:05:24.022');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-33', 'MediaAsset', 'cmq0kxvsn002uhfa427fsc1fk', 'alt', 'en', 'Turkey travel', 1, 'PUBLISHED', '2026-06-05 07:05:24.023', '2026-06-05 07:05:24.023');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-34', 'MediaAsset', 'cmq0kxvsn002uhfa427fsc1fk', 'alt', 'ar', 'سفر تركيا', 1, 'PUBLISHED', '2026-06-05 07:05:24.023', '2026-06-05 07:05:24.023');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-35', 'MediaAsset', 'cmq0kxvsn002vhfa4ociqgpjx', 'alt', 'en', 'Maldives resort', 1, 'PUBLISHED', '2026-06-05 07:05:24.024', '2026-06-05 07:05:24.024');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-36', 'MediaAsset', 'cmq0kxvsn002vhfa4ociqgpjx', 'alt', 'ar', 'منتجع المالديف', 1, 'PUBLISHED', '2026-06-05 07:05:24.024', '2026-06-05 07:05:24.024');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-37', 'MediaAsset', 'cmq0kxvso002whfa4cypvdapd', 'alt', 'en', 'European tour', 1, 'PUBLISHED', '2026-06-05 07:05:24.024', '2026-06-05 07:05:24.024');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-38', 'MediaAsset', 'cmq0kxvso002whfa4cypvdapd', 'alt', 'ar', 'جولة أوروبية', 1, 'PUBLISHED', '2026-06-05 07:05:24.024', '2026-06-05 07:05:24.024');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-39', 'MediaAsset', 'cmq0kxvsp002xhfa443xccluk', 'alt', 'en', 'Adventure travel', 1, 'PUBLISHED', '2026-06-05 07:05:24.025', '2026-06-05 07:05:24.025');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-40', 'MediaAsset', 'cmq0kxvsp002xhfa443xccluk', 'alt', 'ar', 'سفر مغامرات', 1, 'PUBLISHED', '2026-06-05 07:05:24.025', '2026-06-05 07:05:24.025');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-41', 'MediaAsset', 'cmq0kxvsp002yhfa4772va47w', 'alt', 'en', 'Cultural experience', 1, 'PUBLISHED', '2026-06-05 07:05:24.026', '2026-06-05 07:05:24.026');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-42', 'MediaAsset', 'cmq0kxvsp002yhfa4772va47w', 'alt', 'ar', 'تجربة ثقافية', 1, 'PUBLISHED', '2026-06-05 07:05:24.026', '2026-06-05 07:05:24.026');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-43', 'MediaAsset', 'cmq0kxvsq002zhfa4g7xcjv9y', 'alt', 'en', 'Luxury vacation', 1, 'PUBLISHED', '2026-06-05 07:05:24.026', '2026-06-05 07:05:24.026');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-44', 'MediaAsset', 'cmq0kxvsq002zhfa4g7xcjv9y', 'alt', 'ar', 'عطلة فاخرة', 1, 'PUBLISHED', '2026-06-05 07:05:24.026', '2026-06-05 07:05:24.026');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-45', 'MediaAsset', 'cmq0kxvsr0030hfa4h0gxjqxm', 'alt', 'en', 'Family holiday', 1, 'PUBLISHED', '2026-06-05 07:05:24.027', '2026-06-05 07:05:24.027');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-46', 'MediaAsset', 'cmq0kxvsr0030hfa4h0gxjqxm', 'alt', 'ar', 'عطلة عائلية', 1, 'PUBLISHED', '2026-06-05 07:05:24.027', '2026-06-05 07:05:24.027');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-47', 'MediaAsset', 'cmq0kxvss0031hfa40q9bo1zu', 'alt', 'en', 'Honeymoon package', 1, 'PUBLISHED', '2026-06-05 07:05:24.028', '2026-06-05 07:05:24.028');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-48', 'MediaAsset', 'cmq0kxvss0031hfa40q9bo1zu', 'alt', 'ar', 'باقة شهر العسل', 1, 'PUBLISHED', '2026-06-05 07:05:24.028', '2026-06-05 07:05:24.028');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-49', 'MediaAsset', 'cmq0kxvss0032hfa4phgj62ol', 'alt', 'en', 'Religious tourism', 1, 'PUBLISHED', '2026-06-05 07:05:24.029', '2026-06-05 07:05:24.029');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-50', 'MediaAsset', 'cmq0kxvss0032hfa4phgj62ol', 'alt', 'ar', 'سياحة دينية', 1, 'PUBLISHED', '2026-06-05 07:05:24.029', '2026-06-05 07:05:24.029');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-51', 'MediaAsset', 'cmq0kxvst0033hfa454knn6vk', 'alt', 'en', 'Family holiday package', 1, 'PUBLISHED', '2026-06-05 07:05:24.030', '2026-06-05 07:05:24.030');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-52', 'MediaAsset', 'cmq0kxvst0033hfa454knn6vk', 'alt', 'ar', 'باقة عطلة عائلية', 1, 'PUBLISHED', '2026-06-05 07:05:24.030', '2026-06-05 07:05:24.030');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-53', 'MediaAsset', 'cmq0kxvsu0034hfa4zi9v2jas', 'alt', 'en', 'Honeymoon package', 1, 'PUBLISHED', '2026-06-05 07:05:24.030', '2026-06-05 07:05:24.030');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-54', 'MediaAsset', 'cmq0kxvsu0034hfa4zi9v2jas', 'alt', 'ar', 'باقة شهر العسل', 1, 'PUBLISHED', '2026-06-05 07:05:24.030', '2026-06-05 07:05:24.030');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-55', 'MediaAsset', 'cmq0kxvsu0035hfa4kieesqy9', 'alt', 'en', 'Makkah hotel', 1, 'PUBLISHED', '2026-06-05 07:05:24.031', '2026-06-05 07:05:24.031');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-56', 'MediaAsset', 'cmq0kxvsu0035hfa4kieesqy9', 'alt', 'ar', 'فندق مكة', 1, 'PUBLISHED', '2026-06-05 07:05:24.031', '2026-06-05 07:05:24.031');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-57', 'MediaAsset', 'cmq0kxvsv0036hfa4mga63tt2', 'alt', 'en', 'Madinah hotel', 1, 'PUBLISHED', '2026-06-05 07:05:24.032', '2026-06-05 07:05:24.032');
INSERT INTO `EntityTranslation` (`id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `version`, `status`, `createdAt`, `updatedAt`) VALUES ('seed-et-58', 'MediaAsset', 'cmq0kxvsv0036hfa4mga63tt2', 'alt', 'ar', 'فندق المدينة', 1, 'PUBLISHED', '2026-06-05 07:05:24.032', '2026-06-05 07:05:24.032');

-- LocaleConfig (1 rows)
INSERT INTO `LocaleConfig` (`id`, `code`, `urlPrefix`, `label`, `htmlLang`, `dir`, `flag`, `dateLocale`, `currency`, `numberLocale`, `isEnabled`, `isDefault`, `sortOrder`, `createdAt`, `updatedAt`) VALUES ('cmpv9628u0023hf2whrsan6vt', 'en', 'en', 'English', 'en', 'ltr', '🇺🇸', 'en-US', 'USD', 'en-US', 1, 1, 0, '2026-06-01 13:36:59.358', '2026-06-04 21:15:29.596');

-- MediaAsset (17 rows)
INSERT INTO `MediaAsset` (`id`, `filename`, `url`, `mimeType`, `mediaType`, `sizeBytes`, `width`, `height`, `folderId`, `uploadedById`, `createdAt`, `updatedAt`) VALUES ('cmq0kxvsj002qhfa44sjj6tkv', 'hero.svg', '/demo/safar/hero.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, NULL, NULL, '2026-06-05 07:05:24.020', '2026-06-05 07:05:24.020');
INSERT INTO `MediaAsset` (`id`, `filename`, `url`, `mimeType`, `mediaType`, `sizeBytes`, `width`, `height`, `folderId`, `uploadedById`, `createdAt`, `updatedAt`) VALUES ('cmq0kxvsk002rhfa43c7i7xq7', 'dest-1.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, NULL, NULL, '2026-06-05 07:05:24.021', '2026-06-05 07:05:24.021');
INSERT INTO `MediaAsset` (`id`, `filename`, `url`, `mimeType`, `mediaType`, `sizeBytes`, `width`, `height`, `folderId`, `uploadedById`, `createdAt`, `updatedAt`) VALUES ('cmq0kxvsl002shfa4jiag8jwv', 'dest-2.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, NULL, NULL, '2026-06-05 07:05:24.022', '2026-06-05 07:05:24.022');
INSERT INTO `MediaAsset` (`id`, `filename`, `url`, `mimeType`, `mediaType`, `sizeBytes`, `width`, `height`, `folderId`, `uploadedById`, `createdAt`, `updatedAt`) VALUES ('cmq0kxvsm002thfa4y8kg2crl', 'dest-3.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, NULL, NULL, '2026-06-05 07:05:24.022', '2026-06-05 07:05:24.022');
INSERT INTO `MediaAsset` (`id`, `filename`, `url`, `mimeType`, `mediaType`, `sizeBytes`, `width`, `height`, `folderId`, `uploadedById`, `createdAt`, `updatedAt`) VALUES ('cmq0kxvsn002uhfa427fsc1fk', 'dest-4.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, NULL, NULL, '2026-06-05 07:05:24.023', '2026-06-05 07:05:24.023');
INSERT INTO `MediaAsset` (`id`, `filename`, `url`, `mimeType`, `mediaType`, `sizeBytes`, `width`, `height`, `folderId`, `uploadedById`, `createdAt`, `updatedAt`) VALUES ('cmq0kxvsn002vhfa4ociqgpjx', 'dest-5.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, NULL, NULL, '2026-06-05 07:05:24.024', '2026-06-05 07:05:24.024');
INSERT INTO `MediaAsset` (`id`, `filename`, `url`, `mimeType`, `mediaType`, `sizeBytes`, `width`, `height`, `folderId`, `uploadedById`, `createdAt`, `updatedAt`) VALUES ('cmq0kxvso002whfa4cypvdapd', 'dest-6.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, NULL, NULL, '2026-06-05 07:05:24.024', '2026-06-05 07:05:24.024');
INSERT INTO `MediaAsset` (`id`, `filename`, `url`, `mimeType`, `mediaType`, `sizeBytes`, `width`, `height`, `folderId`, `uploadedById`, `createdAt`, `updatedAt`) VALUES ('cmq0kxvsp002xhfa443xccluk', 'dest-7.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, NULL, NULL, '2026-06-05 07:05:24.025', '2026-06-05 07:05:24.025');
INSERT INTO `MediaAsset` (`id`, `filename`, `url`, `mimeType`, `mediaType`, `sizeBytes`, `width`, `height`, `folderId`, `uploadedById`, `createdAt`, `updatedAt`) VALUES ('cmq0kxvsp002yhfa4772va47w', 'dest-8.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, NULL, NULL, '2026-06-05 07:05:24.026', '2026-06-05 07:05:24.026');
INSERT INTO `MediaAsset` (`id`, `filename`, `url`, `mimeType`, `mediaType`, `sizeBytes`, `width`, `height`, `folderId`, `uploadedById`, `createdAt`, `updatedAt`) VALUES ('cmq0kxvsq002zhfa4g7xcjv9y', 'dest-9.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, NULL, NULL, '2026-06-05 07:05:24.026', '2026-06-05 07:05:24.026');
INSERT INTO `MediaAsset` (`id`, `filename`, `url`, `mimeType`, `mediaType`, `sizeBytes`, `width`, `height`, `folderId`, `uploadedById`, `createdAt`, `updatedAt`) VALUES ('cmq0kxvsr0030hfa4h0gxjqxm', 'dest-10.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, NULL, NULL, '2026-06-05 07:05:24.027', '2026-06-05 07:05:24.027');
INSERT INTO `MediaAsset` (`id`, `filename`, `url`, `mimeType`, `mediaType`, `sizeBytes`, `width`, `height`, `folderId`, `uploadedById`, `createdAt`, `updatedAt`) VALUES ('cmq0kxvss0031hfa40q9bo1zu', 'dest-11.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, NULL, NULL, '2026-06-05 07:05:24.028', '2026-06-05 07:05:24.028');
INSERT INTO `MediaAsset` (`id`, `filename`, `url`, `mimeType`, `mediaType`, `sizeBytes`, `width`, `height`, `folderId`, `uploadedById`, `createdAt`, `updatedAt`) VALUES ('cmq0kxvss0032hfa4phgj62ol', 'dest-12.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, NULL, NULL, '2026-06-05 07:05:24.029', '2026-06-05 07:05:24.029');
INSERT INTO `MediaAsset` (`id`, `filename`, `url`, `mimeType`, `mediaType`, `sizeBytes`, `width`, `height`, `folderId`, `uploadedById`, `createdAt`, `updatedAt`) VALUES ('cmq0kxvst0033hfa454knn6vk', 'pkg-family.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, NULL, NULL, '2026-06-05 07:05:24.030', '2026-06-05 07:05:24.030');
INSERT INTO `MediaAsset` (`id`, `filename`, `url`, `mimeType`, `mediaType`, `sizeBytes`, `width`, `height`, `folderId`, `uploadedById`, `createdAt`, `updatedAt`) VALUES ('cmq0kxvsu0034hfa4zi9v2jas', 'pkg-honeymoon.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, NULL, NULL, '2026-06-05 07:05:24.030', '2026-06-05 07:05:24.030');
INSERT INTO `MediaAsset` (`id`, `filename`, `url`, `mimeType`, `mediaType`, `sizeBytes`, `width`, `height`, `folderId`, `uploadedById`, `createdAt`, `updatedAt`) VALUES ('cmq0kxvsu0035hfa4kieesqy9', 'hotel-1.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, NULL, NULL, '2026-06-05 07:05:24.031', '2026-06-05 07:05:24.031');
INSERT INTO `MediaAsset` (`id`, `filename`, `url`, `mimeType`, `mediaType`, `sizeBytes`, `width`, `height`, `folderId`, `uploadedById`, `createdAt`, `updatedAt`) VALUES ('cmq0kxvsv0036hfa4mga63tt2', 'hotel-2.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, NULL, NULL, '2026-06-05 07:05:24.032', '2026-06-05 07:05:24.032');

-- SiteTheme (2 rows)
INSERT INTO `SiteTheme` (`id`, `preset`, `siteDefaultPresetId`, `primaryColor`, `secondaryColor`, `typography`, `faviconUrl`, `logoUrl`, `headerConfig`, `footerConfig`, `animationsEnabled`, `animationSpeed`, `lazyLoadEnabled`, `darkModeEnabled`, `spacingScale`, `customCss`, `updatedAt`, `activePresetId`, `cursorEffect`, `backgroundEffect`, `textEffect`, `brandConfig`, `backgroundEffectEnabled`, `borderStyle`, `cardStyle`, `cursorEffectEnabled`, `textEffectEnabled`, `themeProvenance`, `backgroundEffectSettings`) VALUES ('published', 'CUSTOM', 'travel', '#06b6d4', '#f97316', '{"bodyFont":"DM Sans","headingFont":"Syne","baseFontSize":"16px","headingScale":1.25}', NULL, NULL, '{"sticky":true,"ctaHref":"/contact","showCta":true,"showNav":true,"showLogo":true,"ctaLabelAr":"تواصل","ctaLabelEn":"Contact","showSearch":true}', '{"columns":3,"taglineAr":"","taglineEn":"","showSocial":true,"showContact":true,"showQuickLinks":true}', 1, 1, 1, 1, 1, NULL, '2026-06-05 11:01:39.410', 'travel', 'ring-trail', 'waves', 'typewriter', '{"tagline":"","logoMode":"text","logoText":"AZURA","brandName":"AZURA solution","showTagline":true}', 1, NULL, NULL, 1, 1, '{}', '{}');
INSERT INTO `SiteTheme` (`id`, `preset`, `siteDefaultPresetId`, `primaryColor`, `secondaryColor`, `typography`, `faviconUrl`, `logoUrl`, `headerConfig`, `footerConfig`, `animationsEnabled`, `animationSpeed`, `lazyLoadEnabled`, `darkModeEnabled`, `spacingScale`, `customCss`, `updatedAt`, `activePresetId`, `cursorEffect`, `backgroundEffect`, `textEffect`, `brandConfig`, `backgroundEffectEnabled`, `borderStyle`, `cardStyle`, `cursorEffectEnabled`, `textEffectEnabled`, `themeProvenance`, `backgroundEffectSettings`) VALUES ('draft', 'CUSTOM', 'travel', '#06b6d4', '#f97316', '{"bodyFont":"DM Sans","headingFont":"Syne","baseFontSize":"16px","headingScale":1.25}', NULL, NULL, '{"sticky":true,"ctaHref":"/contact","showCta":true,"showNav":true,"showLogo":true,"ctaLabelAr":"تواصل","ctaLabelEn":"Contact","showSearch":true}', '{"columns":3,"taglineAr":"","taglineEn":"","showSocial":true,"showContact":true,"showQuickLinks":true}', 1, 1, 1, 1, 1, NULL, '2026-06-05 11:01:39.410', 'travel', 'ring-trail', 'waves', 'typewriter', '{"tagline":"","logoMode":"text","logoText":"AZURA","brandName":"AZURA solution","showTagline":true}', 1, NULL, NULL, 1, 1, '{}', '{}');

-- TranslationJob (3 rows)
INSERT INTO `TranslationJob` (`id`, `entityType`, `localeCode`, `status`, `totalEntities`, `processedCount`, `errorMessage`, `createdAt`, `updatedAt`, `completedAt`) VALUES ('cmpziifc20001hfo8pl45d97s', NULL, 'ar', 'COMPLETED', 11, 2, NULL, '2026-06-04 13:09:37.442', '2026-06-04 13:09:37.540', '2026-06-04 13:09:37.537');
INSERT INTO `TranslationJob` (`id`, `entityType`, `localeCode`, `status`, `totalEntities`, `processedCount`, `errorMessage`, `createdAt`, `updatedAt`, `completedAt`) VALUES ('cmpzmx20q000dhfz0o2nlo9ko', NULL, 'ar', 'COMPLETED', 11, 0, NULL, '2026-06-04 15:12:58.491', '2026-06-04 15:12:58.522', '2026-06-04 15:12:58.519');
INSERT INTO `TranslationJob` (`id`, `entityType`, `localeCode`, `status`, `totalEntities`, `processedCount`, `errorMessage`, `createdAt`, `updatedAt`, `completedAt`) VALUES ('cmq046dp80001hf98b7c01qv8', NULL, 'ar', 'COMPLETED', 74, 63, NULL, '2026-06-04 23:16:07.003', '2026-06-04 23:16:07.675', '2026-06-04 23:16:07.673');

SET FOREIGN_KEY_CHECKS = 1;
