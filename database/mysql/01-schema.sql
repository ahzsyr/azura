-- AZURA — MySQL 8.4 schema (generated from prisma/schema/mysql/)
-- Regenerate: node scripts/database/assemble-mysql-import-blank-full.mjs
-- Requires InnoDB (Prisma FKs + long unique indexes).

SET NAMES utf8mb4;
SET default_storage_engine = InnoDB;
SET FOREIGN_KEY_CHECKS = 0;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'CUSTOMER', 'SUPER_ADMIN') NOT NULL DEFAULT 'CUSTOMER',
    `sessionVersion` INTEGER NOT NULL DEFAULT 0,
    `disabledAt` DATETIME(3) NULL,
    `lockedUntil` DATETIME(3) NULL,
    `failedLoginCount` INTEGER NOT NULL DEFAULT 0,
    `emailVerifiedAt` DATETIME(3) NULL,
    `pendingEmail` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `dateOfBirth` DATE NULL,
    `addressLine1` VARCHAR(191) NULL,
    `addressLine2` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `postalCode` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `marketingOptIn` BOOLEAN NOT NULL DEFAULT false,
    `totpSecret` TEXT NULL,
    `totpEnabled` BOOLEAN NOT NULL DEFAULT false,
    `mustChangePassword` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MfaRecoveryCode` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `codeHash` VARCHAR(64) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MfaRecoveryCode_userId_idx`(`userId`),
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
CREATE TABLE `AdminInviteToken` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `invitedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AdminInviteToken_userId_idx`(`userId`),
    INDEX `AdminInviteToken_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmailVerificationToken` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `purpose` ENUM('SIGNUP_VERIFY', 'EMAIL_CHANGE') NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EmailVerificationToken_userId_purpose_idx`(`userId`, `purpose`),
    INDEX `EmailVerificationToken_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmailOtpToken` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `purpose` ENUM('SIGNUP_VERIFY', 'ADMIN_LOGIN') NOT NULL,
    `codeHash` VARCHAR(64) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EmailOtpToken_userId_purpose_idx`(`userId`, `purpose`),
    INDEX `EmailOtpToken_expiresAt_idx`(`expiresAt`),
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
    `marketingCampaignId` VARCHAR(64) NULL,
    `attributionTouchId` VARCHAR(64) NULL,
    `attributionSourceId` VARCHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Inquiry_status_idx`(`status`),
    INDEX `Inquiry_createdAt_idx`(`createdAt`),
    INDEX `Inquiry_contentItemId_idx`(`contentItemId`),
    INDEX `Inquiry_userId_idx`(`userId`),
    INDEX `Inquiry_marketingCampaignId_idx`(`marketingCampaignId`),
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
    `coverUrl` TEXT NULL,
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
    `composition` JSON NOT NULL,
    `displaySettings` JSON NOT NULL,
    `visualSettings` JSON NOT NULL,
    `metadata` JSON NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `isFeatured` BOOLEAN NOT NULL DEFAULT false,
    `isVisible` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `scheduledAt` DATETIME(3) NULL,
    `publishedAt` DATETIME(3) NULL,
    `archivedAt` DATETIME(3) NULL,
    `deletedAt` DATETIME(3) NULL,
    `featuredImageUrl` VARCHAR(191) NULL,
    `authorId` VARCHAR(36) NULL,
    `sources` JSON NOT NULL,
    `workingRevisionId` VARCHAR(191) NULL,
    `publishedRevisionId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ContentItem_contentTypeId_status_isFeatured_idx`(`contentTypeId`, `status`, `isFeatured`),
    INDEX `ContentItem_collectionId_idx`(`collectionId`),
    INDEX `ContentItem_deletedAt_idx`(`deletedAt`),
    INDEX `ContentItem_workingRevisionId_idx`(`workingRevisionId`),
    INDEX `ContentItem_publishedRevisionId_idx`(`publishedRevisionId`),
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
CREATE TABLE `ContentItemRevision` (
    `id` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(36) NOT NULL,
    `version` INTEGER NOT NULL,
    `blocks` JSON NOT NULL,
    `composition` JSON NOT NULL,
    `translations` JSON NOT NULL,
    `message` VARCHAR(255) NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ContentItemRevision_itemId_createdAt_idx`(`itemId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FormTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `category` ENUM('LEAD', 'CONTACT', 'MULTI_STEP', 'GENERAL', 'SURVEY') NOT NULL DEFAULT 'GENERAL',
    `description` TEXT NULL,
    `definition` JSON NOT NULL,
    `definitionRaw` JSON NULL,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `publishedVersion` INTEGER NULL,
    `allowedAdminIds` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `FormTemplate_slug_key`(`slug`),
    INDEX `FormTemplate_category_isPublished_idx`(`category`, `isPublished`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FormTemplateSnapshot` (
    `id` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL,
    `label` VARCHAR(128) NULL,
    `definition` JSON NOT NULL,
    `publishedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdById` VARCHAR(36) NULL,

    INDEX `FormTemplateSnapshot_templateId_publishedAt_idx`(`templateId`, `publishedAt`),
    UNIQUE INDEX `FormTemplateSnapshot_templateId_version_key`(`templateId`, `version`),
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
    `pipelineType` VARCHAR(64) NULL,
    `assigneeId` VARCHAR(36) NULL,
    `tags` JSON NOT NULL,
    `customerId` VARCHAR(36) NULL,
    `companyId` VARCHAR(36) NULL,
    `campaignId` VARCHAR(36) NULL,
    `metadata` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FormSubmission_templateId_createdAt_idx`(`templateId`, `createdAt`),
    INDEX `FormSubmission_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `FormSubmission_blockType_idx`(`blockType`),
    INDEX `FormSubmission_assigneeId_idx`(`assigneeId`),
    INDEX `FormSubmission_pipelineType_idx`(`pipelineType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InteractionEvent` (
    `id` VARCHAR(191) NOT NULL,
    `aggregateId` VARCHAR(36) NOT NULL,
    `type` VARCHAR(64) NOT NULL,
    `payload` JSON NOT NULL,
    `metadata` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `InteractionEvent_aggregateId_createdAt_idx`(`aggregateId`, `createdAt`),
    INDEX `InteractionEvent_type_createdAt_idx`(`type`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FormBehaviorEvent` (
    `id` VARCHAR(191) NOT NULL,
    `schemaId` VARCHAR(36) NOT NULL,
    `sessionId` VARCHAR(64) NULL,
    `bindingId` VARCHAR(64) NULL,
    `type` VARCHAR(64) NOT NULL,
    `payload` JSON NOT NULL,
    `metadata` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FormBehaviorEvent_schemaId_createdAt_idx`(`schemaId`, `createdAt`),
    INDEX `FormBehaviorEvent_type_createdAt_idx`(`type`, `createdAt`),
    INDEX `FormBehaviorEvent_sessionId_idx`(`sessionId`),
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
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `lockedUntil` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `completedAt` DATETIME(3) NULL,

    INDEX `TranslationJob_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `TranslationJob_status_lockedUntil_idx`(`status`, `lockedUntil`),
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
CREATE TABLE `MarketingProviderRuntime` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(64) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `installedVersion` VARCHAR(32) NOT NULL DEFAULT '1.0.0',
    `lifecycle` VARCHAR(32) NOT NULL DEFAULT 'discovered',
    `maintenanceMode` BOOLEAN NOT NULL DEFAULT false,
    `lastSyncAt` DATETIME(3) NULL,
    `healthSummary` TEXT NULL,
    `metadata` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MarketingProviderRuntime_providerId_key`(`providerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketingConnection` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(64) NOT NULL,
    `tenantId` VARCHAR(64) NOT NULL DEFAULT 'default',
    `status` VARCHAR(32) NOT NULL DEFAULT 'disconnected',
    `lifecycle` VARCHAR(32) NOT NULL DEFAULT 'configured',
    `oauthMetadata` JSON NOT NULL,
    `scopesGranted` JSON NOT NULL,
    `scopesRequired` JSON NOT NULL,
    `scopesMissing` JSON NOT NULL,
    `scopesExpired` JSON NOT NULL,
    `lastHealthAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MarketingConnection_status_idx`(`status`),
    INDEX `MarketingConnection_lifecycle_idx`(`lifecycle`),
    UNIQUE INDEX `MarketingConnection_providerId_tenantId_key`(`providerId`, `tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketingCredential` (
    `id` VARCHAR(191) NOT NULL,
    `connectionId` VARCHAR(191) NOT NULL,
    `accessToken` TEXT NOT NULL,
    `refreshToken` TEXT NULL,
    `tokenType` VARCHAR(32) NULL,
    `expiresAt` DATETIME(3) NULL,
    `refreshStatus` VARCHAR(32) NOT NULL DEFAULT 'ok',
    `sealedPayload` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MarketingCredential_connectionId_key`(`connectionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketingAccount` (
    `id` VARCHAR(191) NOT NULL,
    `connectionId` VARCHAR(191) NOT NULL,
    `externalAccountId` VARCHAR(128) NOT NULL,
    `accountType` VARCHAR(64) NOT NULL,
    `displayName` VARCHAR(256) NOT NULL,
    `metadata` JSON NOT NULL,
    `isSelected` BOOLEAN NOT NULL DEFAULT false,
    `healthSummary` TEXT NULL,
    `currency` VARCHAR(8) NULL,
    `spend` DOUBLE NOT NULL DEFAULT 0,
    `impressions` DOUBLE NOT NULL DEFAULT 0,
    `clicks` DOUBLE NOT NULL DEFAULT 0,
    `conversions` DOUBLE NOT NULL DEFAULT 0,
    `lastSyncAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MarketingAccount_accountType_idx`(`accountType`),
    UNIQUE INDEX `MarketingAccount_connectionId_externalAccountId_key`(`connectionId`, `externalAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketingAsset` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `canonicalAssetKind` VARCHAR(64) NOT NULL,
    `providerAssetType` VARCHAR(64) NOT NULL,
    `externalAssetId` VARCHAR(128) NOT NULL,
    `displayName` VARCHAR(256) NOT NULL,
    `metadata` JSON NOT NULL,
    `selectable` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MarketingAsset_canonicalAssetKind_idx`(`canonicalAssetKind`),
    UNIQUE INDEX `MarketingAsset_accountId_externalAssetId_key`(`accountId`, `externalAssetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketingPermissionState` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(64) NOT NULL,
    `connectionId` VARCHAR(64) NOT NULL,
    `entries` JSON NOT NULL,
    `lastCheckedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MarketingPermissionState_lastCheckedAt_idx`(`lastCheckedAt`),
    UNIQUE INDEX `MarketingPermissionState_providerId_connectionId_key`(`providerId`, `connectionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketingSyncState` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(64) NOT NULL,
    `entity` VARCHAR(64) NOT NULL,
    `entityId` VARCHAR(128) NULL,
    `lastSuccessfulSync` DATETIME(3) NULL,
    `lastAttempt` DATETIME(3) NULL,
    `nextScheduled` DATETIME(3) NULL,
    `status` ENUM('IDLE', 'RUNNING', 'SUCCESS', 'FAILED', 'SCHEDULED') NOT NULL DEFAULT 'IDLE',
    `failureReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MarketingSyncState_status_nextScheduled_idx`(`status`, `nextScheduled`),
    UNIQUE INDEX `MarketingSyncState_providerId_entity_entityId_key`(`providerId`, `entity`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketingJob` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(64) NULL,
    `connectionId` VARCHAR(191) NULL,
    `accountId` VARCHAR(191) NULL,
    `jobType` VARCHAR(64) NOT NULL,
    `workflowStage` VARCHAR(64) NOT NULL DEFAULT 'queued',
    `payload` JSON NOT NULL,
    `result` JSON NOT NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'EXHAUSTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `attemptCount` INTEGER NOT NULL DEFAULT 0,
    `maxAttempts` INTEGER NOT NULL DEFAULT 5,
    `lastError` TEXT NULL,
    `lockedUntil` DATETIME(3) NULL,
    `scheduledAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MarketingJob_idempotencyKey_key`(`idempotencyKey`),
    INDEX `MarketingJob_status_scheduledAt_idx`(`status`, `scheduledAt`),
    INDEX `MarketingJob_jobType_status_idx`(`jobType`, `status`),
    INDEX `MarketingJob_providerId_status_idx`(`providerId`, `status`),
    INDEX `MarketingJob_status_lockedUntil_idx`(`status`, `lockedUntil`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketingWebhookEvent` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(64) NOT NULL,
    `eventType` VARCHAR(128) NOT NULL,
    `externalEventId` VARCHAR(191) NULL,
    `signatureValid` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('RECEIVED', 'VERIFIED', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD_LETTER') NOT NULL DEFAULT 'RECEIVED',
    `rawPayload` JSON NOT NULL,
    `normalizedPayload` JSON NOT NULL,
    `processingError` TEXT NULL,
    `attemptCount` INTEGER NOT NULL DEFAULT 0,
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MarketingWebhookEvent_providerId_status_idx`(`providerId`, `status`),
    INDEX `MarketingWebhookEvent_externalEventId_idx`(`externalEventId`),
    UNIQUE INDEX `MarketingWebhookEvent_providerId_externalEventId_key`(`providerId`, `externalEventId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketingAnalyticsSnapshot` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(64) NOT NULL,
    `accountId` VARCHAR(128) NOT NULL,
    `metric` VARCHAR(64) NOT NULL,
    `value` DOUBLE NOT NULL DEFAULT 0,
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `dimensions` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MarketingAnalyticsSnapshot_providerId_periodStart_idx`(`providerId`, `periodStart`),
    INDEX `MarketingAnalyticsSnapshot_metric_periodStart_idx`(`metric`, `periodStart`),
    UNIQUE INDEX `MarketingAnalyticsSnapshot_providerId_accountId_metric_perio_key`(`providerId`, `accountId`, `metric`, `periodStart`, `periodEnd`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketingProviderAppConfig` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(64) NOT NULL,
    `clientId` VARCHAR(256) NULL,
    `clientSecret` TEXT NULL,
    `appSecret` TEXT NULL,
    `webhookVerifyToken` TEXT NULL,
    `pixelId` VARCHAR(128) NULL,
    `capiAccessToken` TEXT NULL,
    `metadata` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MarketingProviderAppConfig_providerId_key`(`providerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketingTrackingConfig` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(64) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `pixelId` VARCHAR(128) NULL,
    `capiEnabled` BOOLEAN NOT NULL DEFAULT false,
    `accessToken` TEXT NULL,
    `testEventCode` VARCHAR(128) NULL,
    `mappings` JSON NOT NULL,
    `metadata` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MarketingTrackingConfig_providerId_key`(`providerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketingLeadEvent` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(64) NOT NULL,
    `externalLeadId` VARCHAR(191) NOT NULL,
    `formId` VARCHAR(128) NULL,
    `payload` JSON NOT NULL,
    `canonical` JSON NOT NULL,
    `inquiryId` VARCHAR(64) NULL,
    `processingStatus` VARCHAR(32) NOT NULL DEFAULT 'pending',
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MarketingLeadEvent_idempotencyKey_key`(`idempotencyKey`),
    INDEX `MarketingLeadEvent_processingStatus_idx`(`processingStatus`),
    UNIQUE INDEX `MarketingLeadEvent_providerId_externalLeadId_key`(`providerId`, `externalLeadId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketingTelemetry` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(64) NOT NULL,
    `operation` VARCHAR(128) NOT NULL,
    `durationMs` INTEGER NOT NULL DEFAULT 0,
    `retryCount` INTEGER NOT NULL DEFAULT 0,
    `rateLimited` BOOLEAN NOT NULL DEFAULT false,
    `queueWaitMs` INTEGER NULL,
    `outcome` VARCHAR(16) NOT NULL,
    `errorCategory` VARCHAR(64) NULL,
    `metadata` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MarketingTelemetry_providerId_createdAt_idx`(`providerId`, `createdAt`),
    INDEX `MarketingTelemetry_outcome_createdAt_idx`(`outcome`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketingSource` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(64) NOT NULL,
    `label` VARCHAR(128) NOT NULL,
    `category` VARCHAR(32) NOT NULL DEFAULT 'other',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MarketingSource_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketingCampaign` (
    `id` VARCHAR(191) NOT NULL,
    `internalId` VARCHAR(64) NOT NULL,
    `name` VARCHAR(256) NOT NULL,
    `objective` VARCHAR(128) NULL,
    `channel` VARCHAR(64) NULL,
    `status` ENUM('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `budget` DOUBLE NULL,
    `budgetCurrency` VARCHAR(8) NULL,
    `targetAudience` TEXT NULL,
    `targetLocation` VARCHAR(256) NULL,
    `landingPagePath` VARCHAR(512) NULL,
    `conversionGoalId` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MarketingCampaign_internalId_key`(`internalId`),
    INDEX `MarketingCampaign_status_idx`(`status`),
    INDEX `MarketingCampaign_startDate_endDate_idx`(`startDate`, `endDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketingCampaignProviderBinding` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(64) NOT NULL,
    `adAccountId` VARCHAR(191) NULL,
    `externalCampaignId` VARCHAR(128) NULL,
    `externalCampaignName` VARCHAR(256) NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'linked',
    `syncStatus` VARCHAR(32) NOT NULL DEFAULT 'idle',
    `lastSyncAt` DATETIME(3) NULL,
    `lastMetricsSyncAt` DATETIME(3) NULL,
    `lastSyncError` TEXT NULL,
    `providerMetadata` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MarketingCampaignProviderBinding_providerId_idx`(`providerId`),
    INDEX `MarketingCampaignProviderBinding_adAccountId_idx`(`adAccountId`),
    UNIQUE INDEX `MarketingCampaignProviderBinding_campaignId_providerId_exter_key`(`campaignId`, `providerId`, `externalCampaignId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketingExternalCampaign` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(64) NOT NULL,
    `externalId` VARCHAR(128) NOT NULL,
    `providerEntityType` VARCHAR(64) NOT NULL DEFAULT 'campaign',
    `name` VARCHAR(256) NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'unknown',
    `adAccountId` VARCHAR(191) NULL,
    `providerBindingId` VARCHAR(191) NULL,
    `providerMetadata` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MarketingExternalCampaign_adAccountId_idx`(`adAccountId`),
    INDEX `MarketingExternalCampaign_providerBindingId_idx`(`providerBindingId`),
    UNIQUE INDEX `MarketingExternalCampaign_providerId_externalId_key`(`providerId`, `externalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketingAdGroup` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(64) NOT NULL,
    `externalId` VARCHAR(128) NOT NULL,
    `providerEntityType` VARCHAR(64) NOT NULL DEFAULT 'ad_group',
    `name` VARCHAR(256) NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'unknown',
    `externalCampaignId` VARCHAR(191) NOT NULL,
    `providerMetadata` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MarketingAdGroup_externalCampaignId_idx`(`externalCampaignId`),
    UNIQUE INDEX `MarketingAdGroup_providerId_externalId_key`(`providerId`, `externalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketingAd` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(64) NOT NULL,
    `externalId` VARCHAR(128) NOT NULL,
    `providerEntityType` VARCHAR(64) NOT NULL DEFAULT 'ad',
    `name` VARCHAR(256) NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'unknown',
    `adGroupId` VARCHAR(191) NOT NULL,
    `providerMetadata` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MarketingAd_adGroupId_idx`(`adGroupId`),
    UNIQUE INDEX `MarketingAd_providerId_externalId_key`(`providerId`, `externalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketingCreative` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(64) NOT NULL,
    `externalId` VARCHAR(128) NOT NULL,
    `providerEntityType` VARCHAR(64) NOT NULL DEFAULT 'creative',
    `name` VARCHAR(256) NULL,
    `creativeType` VARCHAR(64) NULL,
    `headline` VARCHAR(512) NULL,
    `body` TEXT NULL,
    `previewUrl` TEXT NULL,
    `adId` VARCHAR(191) NOT NULL,
    `providerMetadata` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MarketingCreative_adId_idx`(`adId`),
    UNIQUE INDEX `MarketingCreative_providerId_externalId_key`(`providerId`, `externalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketingTrackingUrl` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `providerBindingId` VARCHAR(191) NULL,
    `externalAdId` VARCHAR(191) NULL,
    `baseUrl` TEXT NOT NULL,
    `utmSource` VARCHAR(128) NULL,
    `utmMedium` VARCHAR(128) NULL,
    `utmCampaign` VARCHAR(256) NULL,
    `utmContent` VARCHAR(256) NULL,
    `utmTerm` VARCHAR(256) NULL,
    `fullUrl` TEXT NOT NULL,
    `qrAssetRef` TEXT NULL,
    `label` VARCHAR(256) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MarketingTrackingUrl_campaignId_idx`(`campaignId`),
    INDEX `MarketingTrackingUrl_utmCampaign_idx`(`utmCampaign`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketingVisitor` (
    `id` VARCHAR(191) NOT NULL,
    `visitorToken` VARCHAR(64) NOT NULL,
    `consentStatus` ENUM('UNKNOWN', 'GRANTED', 'DENIED', 'WITHDRAWN') NOT NULL DEFAULT 'UNKNOWN',
    `consentGrantedAt` DATETIME(3) NULL,
    `firstSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MarketingVisitor_visitorToken_key`(`visitorToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketingSession` (
    `id` VARCHAR(191) NOT NULL,
    `visitorId` VARCHAR(191) NOT NULL,
    `sessionToken` VARCHAR(64) NOT NULL,
    `entryUrl` TEXT NULL,
    `landingPagePath` VARCHAR(512) NULL,
    `referrer` TEXT NULL,
    `deviceType` VARCHAR(32) NULL,
    `browser` VARCHAR(64) NULL,
    `os` VARCHAR(64) NULL,
    `country` VARCHAR(64) NULL,
    `region` VARCHAR(64) NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MarketingSession_sessionToken_key`(`sessionToken`),
    INDEX `MarketingSession_visitorId_startedAt_idx`(`visitorId`, `startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketingTouch` (
    `id` VARCHAR(191) NOT NULL,
    `visitorId` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `sourceId` VARCHAR(191) NULL,
    `medium` VARCHAR(64) NULL,
    `internalCampaignId` VARCHAR(191) NULL,
    `providerBindingId` VARCHAR(191) NULL,
    `externalAdId` VARCHAR(191) NULL,
    `landingPagePath` VARCHAR(512) NULL,
    `referrer` TEXT NULL,
    `utmSource` VARCHAR(128) NULL,
    `utmMedium` VARCHAR(128) NULL,
    `utmCampaign` VARCHAR(256) NULL,
    `utmContent` VARCHAR(256) NULL,
    `utmTerm` VARCHAR(256) NULL,
    `touchType` ENUM('FIRST_TOUCH', 'SESSION_START', 'PAID_CLICK', 'ORGANIC_SEARCH', 'REFERRAL', 'EMAIL', 'SOCIAL_ORGANIC', 'DIRECT', 'CAMPAIGN_URL', 'CONVERSION_TOUCH') NOT NULL DEFAULT 'DIRECT',
    `clickIdType` ENUM('GCLID', 'FBCLID', 'MSCLKID', 'LI_FAT_ID', 'OTHER') NULL,
    `clickId` VARCHAR(256) NULL,
    `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `providerMetadata` JSON NOT NULL,
    `rawPayload` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MarketingTouch_visitorId_occurredAt_idx`(`visitorId`, `occurredAt`),
    INDEX `MarketingTouch_sessionId_occurredAt_idx`(`sessionId`, `occurredAt`),
    INDEX `MarketingTouch_sourceId_idx`(`sourceId`),
    INDEX `MarketingTouch_internalCampaignId_idx`(`internalCampaignId`),
    INDEX `MarketingTouch_providerBindingId_idx`(`providerBindingId`),
    INDEX `MarketingTouch_touchType_idx`(`touchType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketingEvent` (
    `id` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(128) NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `visitorId` VARCHAR(191) NULL,
    `sessionId` VARCHAR(191) NULL,
    `touchId` VARCHAR(191) NULL,
    `name` VARCHAR(128) NOT NULL,
    `properties` JSON NOT NULL,
    `internalCampaignId` VARCHAR(191) NULL,
    `landingPagePath` VARCHAR(512) NULL,
    `sourceId` VARCHAR(191) NULL,
    `medium` VARCHAR(64) NULL,
    `clientOccurredAt` DATETIME(3) NOT NULL,
    `serverReceivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `MarketingEvent_idempotencyKey_key`(`idempotencyKey`),
    INDEX `MarketingEvent_name_clientOccurredAt_idx`(`name`, `clientOccurredAt`),
    INDEX `MarketingEvent_visitorId_clientOccurredAt_idx`(`visitorId`, `clientOccurredAt`),
    INDEX `MarketingEvent_internalCampaignId_idx`(`internalCampaignId`),
    INDEX `MarketingEvent_sourceId_idx`(`sourceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketingConversionDefinition` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(64) NOT NULL,
    `name` VARCHAR(128) NOT NULL,
    `description` TEXT NULL,
    `triggerType` VARCHAR(64) NOT NULL,
    `triggerConfig` JSON NOT NULL,
    `value` DOUBLE NULL,
    `currency` VARCHAR(8) NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MarketingConversionDefinition_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketingConversion` (
    `id` VARCHAR(191) NOT NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `visitorId` VARCHAR(191) NULL,
    `sessionId` VARCHAR(191) NULL,
    `touchId` VARCHAR(191) NULL,
    `internalCampaignId` VARCHAR(191) NULL,
    `externalAdId` VARCHAR(191) NULL,
    `landingPagePath` VARCHAR(512) NULL,
    `sourceId` VARCHAR(191) NULL,
    `leadId` VARCHAR(64) NULL,
    `submissionId` VARCHAR(64) NULL,
    `conversionDefinitionId` VARCHAR(191) NOT NULL,
    `clientOccurredAt` DATETIME(3) NOT NULL,
    `serverReceivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `metadata` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `MarketingConversion_idempotencyKey_key`(`idempotencyKey`),
    INDEX `MarketingConversion_conversionDefinitionId_clientOccurredAt_idx`(`conversionDefinitionId`, `clientOccurredAt`),
    INDEX `MarketingConversion_internalCampaignId_idx`(`internalCampaignId`),
    INDEX `MarketingConversion_sourceId_idx`(`sourceId`),
    INDEX `MarketingConversion_leadId_idx`(`leadId`),
    INDEX `MarketingConversion_submissionId_idx`(`submissionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketingLeadAttribution` (
    `id` VARCHAR(191) NOT NULL,
    `submissionId` VARCHAR(64) NULL,
    `inquiryId` VARCHAR(64) NULL,
    `leadEventId` VARCHAR(191) NULL,
    `visitorId` VARCHAR(64) NULL,
    `sessionId` VARCHAR(64) NULL,
    `firstTouchId` VARCHAR(191) NULL,
    `lastTouchId` VARCHAR(191) NULL,
    `sourceId` VARCHAR(191) NULL,
    `internalCampaignId` VARCHAR(191) NULL,
    `providerBindingId` VARCHAR(191) NULL,
    `externalAdId` VARCHAR(64) NULL,
    `landingPagePath` VARCHAR(512) NULL,
    `utmSource` VARCHAR(128) NULL,
    `utmMedium` VARCHAR(128) NULL,
    `utmCampaign` VARCHAR(256) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MarketingLeadAttribution_submissionId_idx`(`submissionId`),
    INDEX `MarketingLeadAttribution_inquiryId_idx`(`inquiryId`),
    INDEX `MarketingLeadAttribution_internalCampaignId_idx`(`internalCampaignId`),
    INDEX `MarketingLeadAttribution_providerBindingId_idx`(`providerBindingId`),
    INDEX `MarketingLeadAttribution_sourceId_idx`(`sourceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketingMetricRollup` (
    `id` VARCHAR(191) NOT NULL,
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `granularity` VARCHAR(16) NOT NULL DEFAULT 'day',
    `internalCampaignId` VARCHAR(64) NULL,
    `providerBindingId` VARCHAR(64) NULL,
    `sourceId` VARCHAR(64) NULL,
    `providerId` VARCHAR(64) NULL,
    `landingPagePath` VARCHAR(191) NULL,
    `conversionType` VARCHAR(64) NULL,
    `trafficType` VARCHAR(32) NULL,
    `visitors` INTEGER NOT NULL DEFAULT 0,
    `sessions` INTEGER NOT NULL DEFAULT 0,
    `pageViews` INTEGER NOT NULL DEFAULT 0,
    `leads` INTEGER NOT NULL DEFAULT 0,
    `conversions` INTEGER NOT NULL DEFAULT 0,
    `spend` DOUBLE NOT NULL DEFAULT 0,
    `impressions` DOUBLE NOT NULL DEFAULT 0,
    `clicks` DOUBLE NOT NULL DEFAULT 0,
    `metadata` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MarketingMetricRollup_periodStart_granularity_idx`(`periodStart`, `granularity`),
    INDEX `MarketingMetricRollup_internalCampaignId_periodStart_idx`(`internalCampaignId`, `periodStart`),
    INDEX `MarketingMetricRollup_providerBindingId_periodStart_idx`(`providerBindingId`, `periodStart`),
    UNIQUE INDEX `MarketingMetricRollup_periodStart_periodEnd_granularity_inte_key`(`periodStart`, `periodEnd`, `granularity`, `internalCampaignId`, `sourceId`, `providerId`, `providerBindingId`, `landingPagePath`, `conversionType`, `trafficType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketingAutomationRule` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(256) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `triggerType` VARCHAR(64) NOT NULL,
    `conditions` JSON NOT NULL,
    `actions` JSON NOT NULL,
    `lastRunAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MarketingAutomationRule_enabled_triggerType_idx`(`enabled`, `triggerType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketingAutomationExecution` (
    `id` VARCHAR(191) NOT NULL,
    `ruleId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(32) NOT NULL,
    `payload` JSON NOT NULL,
    `result` JSON NOT NULL,
    `error` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MarketingAutomationExecution_ruleId_createdAt_idx`(`ruleId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketingRetentionPolicy` (
    `id` VARCHAR(191) NOT NULL,
    `visitorDays` INTEGER NOT NULL DEFAULT 365,
    `sessionDays` INTEGER NOT NULL DEFAULT 180,
    `touchDays` INTEGER NOT NULL DEFAULT 365,
    `eventDays` INTEGER NOT NULL DEFAULT 365,
    `leadDays` INTEGER NOT NULL DEFAULT 730,
    `providerPayloadDays` INTEGER NOT NULL DEFAULT 90,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

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
    `glassEffectEnabled` BOOLEAN NOT NULL DEFAULT false,
    `backgroundEffectSettings` JSON NOT NULL,
    `cursorEffectSettings` JSON NOT NULL,
    `textEffectSettings` JSON NOT NULL,
    `glassEffectSettings` JSON NOT NULL,
    `motionSettings` JSON NOT NULL,
    `cardStyle` VARCHAR(191) NULL,
    `borderStyle` VARCHAR(191) NULL,
    `themeProvenance` JSON NOT NULL,
    `mobileBrowserConfig` JSON NOT NULL,
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
    `url` TEXT NOT NULL,
    `storageBackend` VARCHAR(16) NOT NULL DEFAULT 'local',
    `bucket` VARCHAR(128) NOT NULL DEFAULT 'local',
    `objectKey` VARCHAR(512) NOT NULL DEFAULT '',
    `mimeType` VARCHAR(191) NOT NULL,
    `mediaType` ENUM('IMAGE', 'VIDEO', 'DOCUMENT', 'SVG') NOT NULL,
    `assetScope` VARCHAR(16) NOT NULL DEFAULT 'CMS',
    `visibility` ENUM('PUBLIC', 'GATED', 'PRIVATE') NOT NULL DEFAULT 'PUBLIC',
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
    UNIQUE INDEX `MediaAsset_storageBackend_bucket_objectKey_key`(`storageBackend`, `bucket`, `objectKey`),
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
CREATE TABLE `IconLibrary` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
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

-- CreateTable
CREATE TABLE `IconAsset` (
    `id` VARCHAR(191) NOT NULL,
    `libraryId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
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

    INDEX `IconAsset_name_idx`(`name`),
    INDEX `IconAsset_slug_idx`(`slug`),
    INDEX `IconAsset_source_idx`(`source`),
    INDEX `IconAsset_type_idx`(`type`),
    INDEX `IconAsset_category_idx`(`category`),
    INDEX `IconAsset_enabled_idx`(`enabled`),
    UNIQUE INDEX `IconAsset_libraryId_slug_key`(`libraryId`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
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

-- CreateTable
CREATE TABLE `CmsPage` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `templateKey` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `blocks` JSON NOT NULL,
    `composition` JSON NOT NULL,
    `visualSettings` JSON NOT NULL,
    `workingRevisionId` VARCHAR(191) NULL,
    `publishedRevisionId` VARCHAR(191) NULL,
    `publishedAt` DATETIME(3) NULL,
    `scheduledAt` DATETIME(3) NULL,
    `authorId` VARCHAR(191) NULL,
    `sources` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CmsPage_slug_key`(`slug`),
    INDEX `CmsPage_status_idx`(`status`),
    INDEX `CmsPage_slug_status_idx`(`slug`, `status`),
    INDEX `CmsPage_workingRevisionId_idx`(`workingRevisionId`),
    INDEX `CmsPage_publishedRevisionId_idx`(`publishedRevisionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CmsPageRevision` (
    `id` VARCHAR(191) NOT NULL,
    `pageId` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL,
    `blocks` JSON NOT NULL,
    `composition` JSON NOT NULL,
    `translations` JSON NOT NULL,
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
    `composition` JSON NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `workingRevisionId` VARCHAR(191) NULL,
    `publishedRevisionId` VARCHAR(191) NULL,
    `featuredImageId` VARCHAR(191) NULL,
    `featuredImageSettings` JSON NOT NULL,
    `authorId` VARCHAR(191) NULL,
    `publishedAt` DATETIME(3) NULL,
    `scheduledAt` DATETIME(3) NULL,
    `sources` JSON NOT NULL,
    `relatedPostIds` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Post_slug_key`(`slug`),
    INDEX `Post_status_idx`(`status`),
    INDEX `Post_slug_status_idx`(`slug`, `status`),
    INDEX `Post_workingRevisionId_idx`(`workingRevisionId`),
    INDEX `Post_publishedRevisionId_idx`(`publishedRevisionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PostRevision` (
    `id` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL,
    `blocks` JSON NOT NULL,
    `composition` JSON NOT NULL,
    `translations` JSON NOT NULL,
    `message` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PostRevision_postId_idx`(`postId`),
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
CREATE TABLE `Category` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(128) NOT NULL,
    `scope` ENUM('PRODUCT', 'CONTENT', 'POST', 'KNOWLEDGE', 'PARTNER', 'TESTIMONIAL') NOT NULL,
    `scopeOwnerId` VARCHAR(64) NOT NULL DEFAULT '',
    `parentId` VARCHAR(36) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `visible` BOOLEAN NOT NULL DEFAULT true,
    `showInNav` BOOLEAN NOT NULL DEFAULT true,
    `featured` BOOLEAN NOT NULL DEFAULT false,
    `membershipMode` ENUM('MANUAL', 'RULES', 'HYBRID') NOT NULL DEFAULT 'HYBRID',
    `conditions` JSON NOT NULL,
    `metadata` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Category_scope_parentId_idx`(`scope`, `parentId`),
    INDEX `Category_scope_visible_idx`(`scope`, `visible`),
    INDEX `Category_parentId_idx`(`parentId`),
    UNIQUE INDEX `Category_scope_scopeOwnerId_slug_key`(`scope`, `scopeOwnerId`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CategoryMembership` (
    `id` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(36) NOT NULL,
    `entityId` VARCHAR(64) NOT NULL,
    `entityKind` VARCHAR(32) NOT NULL,
    `source` ENUM('MANUAL', 'RULE') NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CategoryMembership_entityKind_entityId_idx`(`entityKind`, `entityId`),
    INDEX `CategoryMembership_categoryId_source_idx`(`categoryId`, `source`),
    UNIQUE INDEX `CategoryMembership_categoryId_entityId_entityKind_key`(`categoryId`, `entityId`, `entityKind`),
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
    `entityType` ENUM('CONTENT_ITEM', 'CONTENT_COLLECTION', 'CONTENT_TYPE', 'CATALOG_PRODUCT', 'CATALOG_COLLECTION', 'CATALOG_CATEGORY', 'POST', 'CMS_PAGE', 'FAQ', 'MEDIA', 'ICON', 'TESTIMONIAL', 'TEAM_MEMBER', 'PARTNER') NOT NULL,
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
CREATE TABLE `SearchIndexJob` (
    `id` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(32) NOT NULL,
    `entityId` VARCHAR(64) NOT NULL,
    `status` VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `lastError` TEXT NULL,
    `lockedUntil` DATETIME(3) NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SearchIndexJob_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `SearchIndexJob_entityType_entityId_status_idx`(`entityType`, `entityId`, `status`),
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
CREATE TABLE `SeoChangeLog` (
    `id` VARCHAR(191) NOT NULL,
    `correlationId` VARCHAR(64) NOT NULL,
    `origin` VARCHAR(32) NOT NULL,
    `entityKind` VARCHAR(32) NOT NULL,
    `entityId` VARCHAR(128) NOT NULL,
    `pageKey` VARCHAR(128) NULL,
    `localeCode` VARCHAR(8) NOT NULL,
    `profileId` VARCHAR(64) NULL,
    `applyMode` VARCHAR(32) NULL,
    `userId` VARCHAR(64) NULL,
    `field` VARCHAR(64) NOT NULL,
    `previousValue` TEXT NULL,
    `newValue` TEXT NULL,
    `action` VARCHAR(16) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SeoChangeLog_correlationId_idx`(`correlationId`),
    INDEX `SeoChangeLog_origin_idx`(`origin`),
    INDEX `SeoChangeLog_entityKind_entityId_idx`(`entityKind`, `entityId`),
    INDEX `SeoChangeLog_createdAt_idx`(`createdAt`),
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
    INDEX `SeoSearchMetric_url_date_idx`(`url`(191), `date`),
    INDEX `SeoSearchMetric_query_date_idx`(`query`(191), `date`),
    UNIQUE INDEX `SeoSearchMetric_source_date_url_query_country_device_key`(`source`, `date`, `url`(191), `query`(191), `country`, `device`),
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
CREATE TABLE `RateLimitBucket` (
    `id` VARCHAR(191) NOT NULL,
    `bucketKey` VARCHAR(191) NOT NULL,
    `windowStart` DATETIME(3) NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `RateLimitBucket_bucketKey_key`(`bucketKey`),
    INDEX `RateLimitBucket_windowStart_idx`(`windowStart`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SecurityAuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `action` VARCHAR(64) NOT NULL,
    `actorId` VARCHAR(36) NULL,
    `actorRole` VARCHAR(32) NULL,
    `ip` VARCHAR(64) NULL,
    `meta` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SecurityAuditLog_action_createdAt_idx`(`action`, `createdAt`),
    INDEX `SecurityAuditLog_actorId_createdAt_idx`(`actorId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Video` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `locale` VARCHAR(191) NOT NULL DEFAULT 'en',
    `status` ENUM('DRAFT', 'PUBLISHED') NOT NULL DEFAULT 'DRAFT',
    `contentMediaId` VARCHAR(191) NOT NULL,
    `thumbnailMediaId` VARCHAR(191) NOT NULL,
    `uploadDate` DATETIME(3) NOT NULL,
    `duration` VARCHAR(191) NULL,
    `embedUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Video_slug_key`(`slug`),
    INDEX `Video_status_locale_idx`(`status`, `locale`),
    INDEX `Video_contentMediaId_idx`(`contentMediaId`),
    INDEX `Video_thumbnailMediaId_idx`(`thumbnailMediaId`),
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
ALTER TABLE `MfaRecoveryCode` ADD CONSTRAINT `MfaRecoveryCode_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PasswordResetToken` ADD CONSTRAINT `PasswordResetToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdminInviteToken` ADD CONSTRAINT `AdminInviteToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmailVerificationToken` ADD CONSTRAINT `EmailVerificationToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmailOtpToken` ADD CONSTRAINT `EmailOtpToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE `ContentItem` ADD CONSTRAINT `ContentItem_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `PostAuthor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContentCollectionItem` ADD CONSTRAINT `ContentCollectionItem_collectionId_fkey` FOREIGN KEY (`collectionId`) REFERENCES `ContentCollection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContentCollectionItem` ADD CONSTRAINT `ContentCollectionItem_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `ContentItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContentItemMedia` ADD CONSTRAINT `ContentItemMedia_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `ContentItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContentItemRevision` ADD CONSTRAINT `ContentItemRevision_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `ContentItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FormTemplateSnapshot` ADD CONSTRAINT `FormTemplateSnapshot_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `FormTemplate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FormSubmission` ADD CONSTRAINT `FormSubmission_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `FormTemplate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InteractionEvent` ADD CONSTRAINT `InteractionEvent_aggregateId_fkey` FOREIGN KEY (`aggregateId`) REFERENCES `FormSubmission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FormDraft` ADD CONSTRAINT `FormDraft_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `FormTemplate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DownloadGateUnlock` ADD CONSTRAINT `DownloadGateUnlock_mediaAssetId_fkey` FOREIGN KEY (`mediaAssetId`) REFERENCES `MediaAsset`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FormWebhookDelivery` ADD CONSTRAINT `FormWebhookDelivery_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `FormSubmission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EntityTranslationVersion` ADD CONSTRAINT `EntityTranslationVersion_translationId_fkey` FOREIGN KEY (`translationId`) REFERENCES `EntityTranslation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingConnection` ADD CONSTRAINT `MarketingConnection_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `MarketingProviderRuntime`(`providerId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingCredential` ADD CONSTRAINT `MarketingCredential_connectionId_fkey` FOREIGN KEY (`connectionId`) REFERENCES `MarketingConnection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingAccount` ADD CONSTRAINT `MarketingAccount_connectionId_fkey` FOREIGN KEY (`connectionId`) REFERENCES `MarketingConnection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingAsset` ADD CONSTRAINT `MarketingAsset_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `MarketingAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingSyncState` ADD CONSTRAINT `MarketingSyncState_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `MarketingProviderRuntime`(`providerId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingJob` ADD CONSTRAINT `MarketingJob_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `MarketingProviderRuntime`(`providerId`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingJob` ADD CONSTRAINT `MarketingJob_connectionId_fkey` FOREIGN KEY (`connectionId`) REFERENCES `MarketingConnection`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingJob` ADD CONSTRAINT `MarketingJob_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `MarketingAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingTelemetry` ADD CONSTRAINT `MarketingTelemetry_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `MarketingProviderRuntime`(`providerId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingCampaign` ADD CONSTRAINT `MarketingCampaign_conversionGoalId_fkey` FOREIGN KEY (`conversionGoalId`) REFERENCES `MarketingConversionDefinition`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingCampaignProviderBinding` ADD CONSTRAINT `MarketingCampaignProviderBinding_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `MarketingCampaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingCampaignProviderBinding` ADD CONSTRAINT `MarketingCampaignProviderBinding_adAccountId_fkey` FOREIGN KEY (`adAccountId`) REFERENCES `MarketingAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingExternalCampaign` ADD CONSTRAINT `MarketingExternalCampaign_adAccountId_fkey` FOREIGN KEY (`adAccountId`) REFERENCES `MarketingAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingExternalCampaign` ADD CONSTRAINT `MarketingExternalCampaign_providerBindingId_fkey` FOREIGN KEY (`providerBindingId`) REFERENCES `MarketingCampaignProviderBinding`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingAdGroup` ADD CONSTRAINT `MarketingAdGroup_externalCampaignId_fkey` FOREIGN KEY (`externalCampaignId`) REFERENCES `MarketingExternalCampaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingAd` ADD CONSTRAINT `MarketingAd_adGroupId_fkey` FOREIGN KEY (`adGroupId`) REFERENCES `MarketingAdGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingCreative` ADD CONSTRAINT `MarketingCreative_adId_fkey` FOREIGN KEY (`adId`) REFERENCES `MarketingAd`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingTrackingUrl` ADD CONSTRAINT `MarketingTrackingUrl_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `MarketingCampaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingTrackingUrl` ADD CONSTRAINT `MarketingTrackingUrl_providerBindingId_fkey` FOREIGN KEY (`providerBindingId`) REFERENCES `MarketingCampaignProviderBinding`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingTrackingUrl` ADD CONSTRAINT `MarketingTrackingUrl_externalAdId_fkey` FOREIGN KEY (`externalAdId`) REFERENCES `MarketingAd`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingSession` ADD CONSTRAINT `MarketingSession_visitorId_fkey` FOREIGN KEY (`visitorId`) REFERENCES `MarketingVisitor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingTouch` ADD CONSTRAINT `MarketingTouch_visitorId_fkey` FOREIGN KEY (`visitorId`) REFERENCES `MarketingVisitor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingTouch` ADD CONSTRAINT `MarketingTouch_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `MarketingSession`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingTouch` ADD CONSTRAINT `MarketingTouch_sourceId_fkey` FOREIGN KEY (`sourceId`) REFERENCES `MarketingSource`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingTouch` ADD CONSTRAINT `MarketingTouch_internalCampaignId_fkey` FOREIGN KEY (`internalCampaignId`) REFERENCES `MarketingCampaign`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingTouch` ADD CONSTRAINT `MarketingTouch_providerBindingId_fkey` FOREIGN KEY (`providerBindingId`) REFERENCES `MarketingCampaignProviderBinding`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingTouch` ADD CONSTRAINT `MarketingTouch_externalAdId_fkey` FOREIGN KEY (`externalAdId`) REFERENCES `MarketingAd`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingEvent` ADD CONSTRAINT `MarketingEvent_visitorId_fkey` FOREIGN KEY (`visitorId`) REFERENCES `MarketingVisitor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingEvent` ADD CONSTRAINT `MarketingEvent_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `MarketingSession`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingEvent` ADD CONSTRAINT `MarketingEvent_touchId_fkey` FOREIGN KEY (`touchId`) REFERENCES `MarketingTouch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingEvent` ADD CONSTRAINT `MarketingEvent_internalCampaignId_fkey` FOREIGN KEY (`internalCampaignId`) REFERENCES `MarketingCampaign`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingEvent` ADD CONSTRAINT `MarketingEvent_sourceId_fkey` FOREIGN KEY (`sourceId`) REFERENCES `MarketingSource`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingConversion` ADD CONSTRAINT `MarketingConversion_visitorId_fkey` FOREIGN KEY (`visitorId`) REFERENCES `MarketingVisitor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingConversion` ADD CONSTRAINT `MarketingConversion_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `MarketingSession`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingConversion` ADD CONSTRAINT `MarketingConversion_touchId_fkey` FOREIGN KEY (`touchId`) REFERENCES `MarketingTouch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingConversion` ADD CONSTRAINT `MarketingConversion_internalCampaignId_fkey` FOREIGN KEY (`internalCampaignId`) REFERENCES `MarketingCampaign`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingConversion` ADD CONSTRAINT `MarketingConversion_externalAdId_fkey` FOREIGN KEY (`externalAdId`) REFERENCES `MarketingAd`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingConversion` ADD CONSTRAINT `MarketingConversion_sourceId_fkey` FOREIGN KEY (`sourceId`) REFERENCES `MarketingSource`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingConversion` ADD CONSTRAINT `MarketingConversion_conversionDefinitionId_fkey` FOREIGN KEY (`conversionDefinitionId`) REFERENCES `MarketingConversionDefinition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingLeadAttribution` ADD CONSTRAINT `MarketingLeadAttribution_firstTouchId_fkey` FOREIGN KEY (`firstTouchId`) REFERENCES `MarketingTouch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingLeadAttribution` ADD CONSTRAINT `MarketingLeadAttribution_lastTouchId_fkey` FOREIGN KEY (`lastTouchId`) REFERENCES `MarketingTouch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingLeadAttribution` ADD CONSTRAINT `MarketingLeadAttribution_sourceId_fkey` FOREIGN KEY (`sourceId`) REFERENCES `MarketingSource`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingLeadAttribution` ADD CONSTRAINT `MarketingLeadAttribution_internalCampaignId_fkey` FOREIGN KEY (`internalCampaignId`) REFERENCES `MarketingCampaign`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingLeadAttribution` ADD CONSTRAINT `MarketingLeadAttribution_providerBindingId_fkey` FOREIGN KEY (`providerBindingId`) REFERENCES `MarketingCampaignProviderBinding`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingMetricRollup` ADD CONSTRAINT `MarketingMetricRollup_internalCampaignId_fkey` FOREIGN KEY (`internalCampaignId`) REFERENCES `MarketingCampaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingMetricRollup` ADD CONSTRAINT `MarketingMetricRollup_providerBindingId_fkey` FOREIGN KEY (`providerBindingId`) REFERENCES `MarketingCampaignProviderBinding`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingAutomationExecution` ADD CONSTRAINT `MarketingAutomationExecution_ruleId_fkey` FOREIGN KEY (`ruleId`) REFERENCES `MarketingAutomationRule`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MediaFolder` ADD CONSTRAINT `MediaFolder_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `MediaFolder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MediaAsset` ADD CONSTRAINT `MediaAsset_folderId_fkey` FOREIGN KEY (`folderId`) REFERENCES `MediaFolder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MediaAsset` ADD CONSTRAINT `MediaAsset_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MediaUsage` ADD CONSTRAINT `MediaUsage_mediaId_fkey` FOREIGN KEY (`mediaId`) REFERENCES `MediaAsset`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IconAsset` ADD CONSTRAINT `IconAsset_libraryId_fkey` FOREIGN KEY (`libraryId`) REFERENCES `IconLibrary`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IconAsset` ADD CONSTRAINT `IconAsset_mediaId_fkey` FOREIGN KEY (`mediaId`) REFERENCES `MediaAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IconUsage` ADD CONSTRAINT `IconUsage_iconId_fkey` FOREIGN KEY (`iconId`) REFERENCES `IconAsset`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CmsPage` ADD CONSTRAINT `CmsPage_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `PostAuthor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE `PostRevision` ADD CONSTRAINT `PostRevision_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostRevision` ADD CONSTRAINT `PostRevision_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostCategoryOnPost` ADD CONSTRAINT `PostCategoryOnPost_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostCategoryOnPost` ADD CONSTRAINT `PostCategoryOnPost_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `PostCategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostTagOnPost` ADD CONSTRAINT `PostTagOnPost_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostTagOnPost` ADD CONSTRAINT `PostTagOnPost_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `PostTag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Category` ADD CONSTRAINT `Category_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CategoryMembership` ADD CONSTRAINT `CategoryMembership_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SeoMeta` ADD CONSTRAINT `SeoMeta_cmsPageId_fkey` FOREIGN KEY (`cmsPageId`) REFERENCES `CmsPage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SeoMeta` ADD CONSTRAINT `SeoMeta_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Video` ADD CONSTRAINT `Video_contentMediaId_fkey` FOREIGN KEY (`contentMediaId`) REFERENCES `MediaAsset`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Video` ADD CONSTRAINT `Video_thumbnailMediaId_fkey` FOREIGN KEY (`thumbnailMediaId`) REFERENCES `MediaAsset`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

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
