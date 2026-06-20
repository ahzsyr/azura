-- Translation-only architecture migration
-- Run backfill scripts BEFORE applying this migration in production

-- Extend TranslationStatus enum
ALTER TABLE `EntityTranslation` MODIFY `status` ENUM('DRAFT', 'REVIEW', 'PUBLISHED') NOT NULL DEFAULT 'PUBLISHED';
ALTER TABLE `EntityTranslationVersion` MODIFY `status` ENUM('DRAFT', 'REVIEW', 'PUBLISHED') NOT NULL;
ALTER TABLE `UiMessage` MODIFY `status` ENUM('DRAFT', 'REVIEW', 'PUBLISHED') NOT NULL DEFAULT 'PUBLISHED';

-- LocaleConfig additions
ALTER TABLE `LocaleConfig` ADD COLUMN `fallbackLocaleCode` VARCHAR(16) NULL,
  ADD COLUMN `completionPercent` INT NOT NULL DEFAULT 0,
  ADD COLUMN `lastTranslationSyncAt` DATETIME(3) NULL;

-- EntityTranslation: rename languageCode → localeCode, add version
ALTER TABLE `EntityTranslation` CHANGE COLUMN `languageCode` `localeCode` VARCHAR(16) NOT NULL;
ALTER TABLE `EntityTranslation` ADD COLUMN `version` INT NOT NULL DEFAULT 1;

-- LocalizedSlug rename
ALTER TABLE `LocalizedSlug` CHANGE COLUMN `languageCode` `localeCode` VARCHAR(16) NOT NULL;

-- UiMessage rename
ALTER TABLE `UiMessage` CHANGE COLUMN `languageCode` `localeCode` VARCHAR(16) NOT NULL;

-- TranslationJob rename
ALTER TABLE `TranslationJob` CHANGE COLUMN `languageCode` `localeCode` VARCHAR(16) NOT NULL;

-- Drop En/Ar columns
ALTER TABLE `Gallery` DROP COLUMN `titleEn`;
ALTER TABLE `Gallery` DROP COLUMN `titleAr`;
ALTER TABLE `Gallery` DROP COLUMN `excerptEn`;
ALTER TABLE `Gallery` DROP COLUMN `excerptAr`;
ALTER TABLE `Gallery` DROP COLUMN `descriptionEn`;
ALTER TABLE `Gallery` DROP COLUMN `descriptionAr`;
ALTER TABLE `Gallery` DROP COLUMN `infoEn`;
ALTER TABLE `Gallery` DROP COLUMN `infoAr`;
ALTER TABLE `GalleryMedia` DROP COLUMN `titleEn`;
ALTER TABLE `GalleryMedia` DROP COLUMN `titleAr`;
ALTER TABLE `GalleryMedia` DROP COLUMN `excerptEn`;
ALTER TABLE `GalleryMedia` DROP COLUMN `excerptAr`;
ALTER TABLE `GalleryMedia` DROP COLUMN `descriptionEn`;
ALTER TABLE `GalleryMedia` DROP COLUMN `descriptionAr`;
ALTER TABLE `GalleryMedia` DROP COLUMN `infoEn`;
ALTER TABLE `GalleryMedia` DROP COLUMN `infoAr`;
ALTER TABLE `Testimonial` DROP COLUMN `contentEn`;
ALTER TABLE `Testimonial` DROP COLUMN `contentAr`;
ALTER TABLE `TestimonialCollection` DROP COLUMN `titleEn`;
ALTER TABLE `TestimonialCollection` DROP COLUMN `titleAr`;
ALTER TABLE `TestimonialCollection` DROP COLUMN `excerptEn`;
ALTER TABLE `TestimonialCollection` DROP COLUMN `excerptAr`;
ALTER TABLE `FaqSet` DROP COLUMN `titleEn`;
ALTER TABLE `FaqSet` DROP COLUMN `titleAr`;
ALTER TABLE `FaqSet` DROP COLUMN `excerptEn`;
ALTER TABLE `FaqSet` DROP COLUMN `excerptAr`;
ALTER TABLE `FaqSet` DROP COLUMN `descriptionEn`;
ALTER TABLE `FaqSet` DROP COLUMN `descriptionAr`;
ALTER TABLE `FaqItem` DROP COLUMN `questionEn`;
ALTER TABLE `FaqItem` DROP COLUMN `questionAr`;
ALTER TABLE `FaqItem` DROP COLUMN `answerEn`;
ALTER TABLE `FaqItem` DROP COLUMN `answerAr`;
ALTER TABLE `CompanyInfo` DROP COLUMN `taglineEn`;
ALTER TABLE `CompanyInfo` DROP COLUMN `taglineAr`;
ALTER TABLE `CompanyInfo` DROP COLUMN `storyEn`;
ALTER TABLE `CompanyInfo` DROP COLUMN `storyAr`;
ALTER TABLE `CompanyInfo` DROP COLUMN `missionEn`;
ALTER TABLE `CompanyInfo` DROP COLUMN `missionAr`;
ALTER TABLE `CompanyInfo` DROP COLUMN `visionEn`;
ALTER TABLE `CompanyInfo` DROP COLUMN `visionAr`;
ALTER TABLE `CompanyInfo` DROP COLUMN `valuesEn`;
ALTER TABLE `CompanyInfo` DROP COLUMN `valuesAr`;
ALTER TABLE `CompanyInfo` DROP COLUMN `addressEn`;
ALTER TABLE `CompanyInfo` DROP COLUMN `addressAr`;
ALTER TABLE `CompanyInfo` DROP COLUMN `officeHoursEn`;
ALTER TABLE `CompanyInfo` DROP COLUMN `officeHoursAr`;
ALTER TABLE `SeoSettings` DROP COLUMN `titleEn`;
ALTER TABLE `SeoSettings` DROP COLUMN `titleAr`;
ALTER TABLE `SeoSettings` DROP COLUMN `descriptionEn`;
ALTER TABLE `SeoSettings` DROP COLUMN `descriptionAr`;
ALTER TABLE `MediaAsset` DROP COLUMN `altEn`;
ALTER TABLE `MediaAsset` DROP COLUMN `altAr`;
ALTER TABLE `CmsPage` DROP COLUMN `titleEn`;
ALTER TABLE `CmsPage` DROP COLUMN `titleAr`;
ALTER TABLE `CmsPage` DROP COLUMN `excerptEn`;
ALTER TABLE `CmsPage` DROP COLUMN `excerptAr`;
ALTER TABLE `PostCategory` DROP COLUMN `nameEn`;
ALTER TABLE `PostCategory` DROP COLUMN `nameAr`;
ALTER TABLE `PostTag` DROP COLUMN `nameEn`;
ALTER TABLE `PostTag` DROP COLUMN `nameAr`;
ALTER TABLE `PostAuthor` DROP COLUMN `bioEn`;
ALTER TABLE `PostAuthor` DROP COLUMN `bioAr`;
ALTER TABLE `Post` DROP COLUMN `titleEn`;
ALTER TABLE `Post` DROP COLUMN `titleAr`;
ALTER TABLE `Post` DROP COLUMN `excerptEn`;
ALTER TABLE `Post` DROP COLUMN `excerptAr`;
ALTER TABLE `Post` DROP COLUMN `contentEn`;
ALTER TABLE `Post` DROP COLUMN `contentAr`;
ALTER TABLE `SeoMeta` DROP COLUMN `titleEn`;
ALTER TABLE `SeoMeta` DROP COLUMN `titleAr`;
ALTER TABLE `SeoMeta` DROP COLUMN `descriptionEn`;
ALTER TABLE `SeoMeta` DROP COLUMN `descriptionAr`;
ALTER TABLE `SeoMeta` DROP COLUMN `ogTitleEn`;
ALTER TABLE `SeoMeta` DROP COLUMN `ogTitleAr`;
ALTER TABLE `Custom404` DROP COLUMN `titleEn`;
ALTER TABLE `Custom404` DROP COLUMN `titleAr`;
ALTER TABLE `Custom404` DROP COLUMN `bodyEn`;
ALTER TABLE `Custom404` DROP COLUMN `bodyAr`;
ALTER TABLE `ContentType` DROP COLUMN `nameEn`;
ALTER TABLE `ContentType` DROP COLUMN `nameAr`;
ALTER TABLE `ContentType` DROP COLUMN `labelSingularEn`;
ALTER TABLE `ContentType` DROP COLUMN `labelSingularAr`;
ALTER TABLE `ContentType` DROP COLUMN `labelPluralEn`;
ALTER TABLE `ContentType` DROP COLUMN `labelPluralAr`;
ALTER TABLE `ContentCollection` DROP COLUMN `nameEn`;
ALTER TABLE `ContentCollection` DROP COLUMN `nameAr`;
ALTER TABLE `ContentCollection` DROP COLUMN `excerptEn`;
ALTER TABLE `ContentCollection` DROP COLUMN `excerptAr`;
ALTER TABLE `ContentItem` DROP COLUMN `titleEn`;
ALTER TABLE `ContentItem` DROP COLUMN `titleAr`;
ALTER TABLE `ContentItem` DROP COLUMN `excerptEn`;
ALTER TABLE `ContentItem` DROP COLUMN `excerptAr`;
ALTER TABLE `ContentItem` DROP COLUMN `descriptionEn`;
ALTER TABLE `ContentItem` DROP COLUMN `descriptionAr`;
ALTER TABLE `ContentItemMedia` DROP COLUMN `altEn`;
ALTER TABLE `ContentItemMedia` DROP COLUMN `altAr`;
ALTER TABLE `ContentItemMedia` DROP COLUMN `captionEn`;
ALTER TABLE `ContentItemMedia` DROP COLUMN `captionAr`;
ALTER TABLE `PricingPlanSet` DROP COLUMN `titleEn`;
ALTER TABLE `PricingPlanSet` DROP COLUMN `titleAr`;
ALTER TABLE `PricingPlanSet` DROP COLUMN `descriptionEn`;
ALTER TABLE `PricingPlanSet` DROP COLUMN `descriptionAr`;
ALTER TABLE `PricingPlan` DROP COLUMN `nameEn`;
ALTER TABLE `PricingPlan` DROP COLUMN `nameAr`;
ALTER TABLE `PricingPlan` DROP COLUMN `descriptionEn`;
ALTER TABLE `PricingPlan` DROP COLUMN `descriptionAr`;
ALTER TABLE `PricingPlan` DROP COLUMN `badgeEn`;
ALTER TABLE `PricingPlan` DROP COLUMN `badgeAr`;
ALTER TABLE `PricingPlan` DROP COLUMN `ctaLabelEn`;
ALTER TABLE `PricingPlan` DROP COLUMN `ctaLabelAr`;
ALTER TABLE `PricingPlanFeature` DROP COLUMN `labelEn`;
ALTER TABLE `PricingPlanFeature` DROP COLUMN `labelAr`;
ALTER TABLE `ReleaseSet` DROP COLUMN `titleEn`;
ALTER TABLE `ReleaseSet` DROP COLUMN `titleAr`;
ALTER TABLE `ReleaseSet` DROP COLUMN `descriptionEn`;
ALTER TABLE `ReleaseSet` DROP COLUMN `descriptionAr`;
ALTER TABLE `ReleaseEntry` DROP COLUMN `textEn`;
ALTER TABLE `ReleaseEntry` DROP COLUMN `textAr`;
ALTER TABLE `PricingCalculator` DROP COLUMN `titleEn`;
ALTER TABLE `PricingCalculator` DROP COLUMN `titleAr`;
ALTER TABLE `PricingCalculator` DROP COLUMN `descriptionEn`;
ALTER TABLE `PricingCalculator` DROP COLUMN `descriptionAr`;
ALTER TABLE `PricingCalculatorField` DROP COLUMN `labelEn`;
ALTER TABLE `PricingCalculatorField` DROP COLUMN `labelAr`;
ALTER TABLE `KnowledgeBase` DROP COLUMN `titleEn`;
ALTER TABLE `KnowledgeBase` DROP COLUMN `titleAr`;
ALTER TABLE `KnowledgeBase` DROP COLUMN `descriptionEn`;
ALTER TABLE `KnowledgeBase` DROP COLUMN `descriptionAr`;
ALTER TABLE `KnowledgeCategory` DROP COLUMN `titleEn`;
ALTER TABLE `KnowledgeCategory` DROP COLUMN `titleAr`;
ALTER TABLE `KnowledgeArticle` DROP COLUMN `titleEn`;
ALTER TABLE `KnowledgeArticle` DROP COLUMN `titleAr`;
ALTER TABLE `KnowledgeArticle` DROP COLUMN `excerptEn`;
ALTER TABLE `KnowledgeArticle` DROP COLUMN `excerptAr`;
ALTER TABLE `KnowledgeArticle` DROP COLUMN `bodyEn`;
ALTER TABLE `KnowledgeArticle` DROP COLUMN `bodyAr`;
ALTER TABLE `DocPortal` DROP COLUMN `titleEn`;
ALTER TABLE `DocPortal` DROP COLUMN `titleAr`;
ALTER TABLE `DocPortal` DROP COLUMN `descriptionEn`;
ALTER TABLE `DocPortal` DROP COLUMN `descriptionAr`;
ALTER TABLE `DocVersion` DROP COLUMN `labelEn`;
ALTER TABLE `DocVersion` DROP COLUMN `labelAr`;
ALTER TABLE `DocSection` DROP COLUMN `titleEn`;
ALTER TABLE `DocSection` DROP COLUMN `titleAr`;
ALTER TABLE `DocSection` DROP COLUMN `contentEn`;
ALTER TABLE `DocSection` DROP COLUMN `contentAr`;
ALTER TABLE `StatusBoard` DROP COLUMN `titleEn`;
ALTER TABLE `StatusBoard` DROP COLUMN `titleAr`;
ALTER TABLE `StatusBoard` DROP COLUMN `descriptionEn`;
ALTER TABLE `StatusBoard` DROP COLUMN `descriptionAr`;
ALTER TABLE `StatusService` DROP COLUMN `nameEn`;
ALTER TABLE `StatusService` DROP COLUMN `nameAr`;
ALTER TABLE `StatusService` DROP COLUMN `descriptionEn`;
ALTER TABLE `StatusService` DROP COLUMN `descriptionAr`;
ALTER TABLE `StatusIncident` DROP COLUMN `titleEn`;
ALTER TABLE `StatusIncident` DROP COLUMN `titleAr`;
ALTER TABLE `StatusIncident` DROP COLUMN `messageEn`;
ALTER TABLE `StatusIncident` DROP COLUMN `messageAr`;
ALTER TABLE `StatusMaintenance` DROP COLUMN `titleEn`;
ALTER TABLE `StatusMaintenance` DROP COLUMN `titleAr`;
ALTER TABLE `StatusMaintenance` DROP COLUMN `messageEn`;
ALTER TABLE `StatusMaintenance` DROP COLUMN `messageAr`;
ALTER TABLE `TeamDirectory` DROP COLUMN `titleEn`;
ALTER TABLE `TeamDirectory` DROP COLUMN `titleAr`;
ALTER TABLE `TeamDirectory` DROP COLUMN `descriptionEn`;
ALTER TABLE `TeamDirectory` DROP COLUMN `descriptionAr`;
ALTER TABLE `TeamDepartment` DROP COLUMN `nameEn`;
ALTER TABLE `TeamDepartment` DROP COLUMN `nameAr`;
ALTER TABLE `TeamMember` DROP COLUMN `nameEn`;
ALTER TABLE `TeamMember` DROP COLUMN `nameAr`;
ALTER TABLE `TeamMember` DROP COLUMN `roleEn`;
ALTER TABLE `TeamMember` DROP COLUMN `roleAr`;
ALTER TABLE `TeamMember` DROP COLUMN `bioEn`;
ALTER TABLE `TeamMember` DROP COLUMN `bioAr`;
ALTER TABLE `TeamMember` DROP COLUMN `locationEn`;
ALTER TABLE `TeamMember` DROP COLUMN `locationAr`;
ALTER TABLE `PartnerProgram` DROP COLUMN `titleEn`;
ALTER TABLE `PartnerProgram` DROP COLUMN `titleAr`;
ALTER TABLE `PartnerProgram` DROP COLUMN `descriptionEn`;
ALTER TABLE `PartnerProgram` DROP COLUMN `descriptionAr`;
ALTER TABLE `PartnerCategory` DROP COLUMN `nameEn`;
ALTER TABLE `PartnerCategory` DROP COLUMN `nameAr`;
ALTER TABLE `Partner` DROP COLUMN `nameEn`;
ALTER TABLE `Partner` DROP COLUMN `nameAr`;
ALTER TABLE `Partner` DROP COLUMN `descriptionEn`;
ALTER TABLE `Partner` DROP COLUMN `descriptionAr`;
ALTER TABLE `Partner` DROP COLUMN `locationEn`;
ALTER TABLE `Partner` DROP COLUMN `locationAr`;

-- CatalogCollection: drop name/description and locale overrides table
ALTER TABLE `CatalogCollection` DROP COLUMN `name`;
ALTER TABLE `CatalogCollection` DROP COLUMN `description`;
DROP TABLE IF EXISTS `CatalogCollectionLocale`;

-- Product consolidation
ALTER TABLE `Product` ADD COLUMN `canonicalSlug` VARCHAR(255) NULL;
UPDATE `Product` SET `canonicalSlug` = `slug` WHERE `canonicalSlug` IS NULL;
ALTER TABLE `Product` MODIFY `canonicalSlug` VARCHAR(255) NOT NULL;
ALTER TABLE `Product` DROP INDEX `Product_locale_slug_key`;
ALTER TABLE `Product` DROP COLUMN `locale`;
ALTER TABLE `Product` DROP COLUMN `slug`;
ALTER TABLE `Product` DROP COLUMN `productTitle`;
CREATE UNIQUE INDEX `Product_canonicalSlug_key` ON `Product`(`canonicalSlug`);
CREATE UNIQUE INDEX `Product_sku_key` ON `Product`(`sku`);
DROP INDEX `Product_locale_idx` ON `Product`;
DROP INDEX `Product_locale_brand_idx` ON `Product`;
DROP INDEX `Product_locale_category_idx` ON `Product`;
DROP INDEX `Product_locale_status_idx` ON `Product`;
DROP INDEX `Product_locale_stockStatus_idx` ON `Product`;
DROP INDEX `Product_locale_priceValue_idx` ON `Product`;
CREATE INDEX `Product_canonicalSlug_idx` ON `Product`(`canonicalSlug`);
CREATE INDEX `Product_brand_idx` ON `Product`(`brand`);
CREATE INDEX `Product_category_idx` ON `Product`(`category`);
CREATE INDEX `Product_status_idx` ON `Product`(`status`);
CREATE INDEX `Product_stockStatus_idx` ON `Product`(`stockStatus`);
CREATE INDEX `Product_priceValue_idx` ON `Product`(`priceValue`);

-- New tables
CREATE TABLE `UiMessageVersion` (
  `id` VARCHAR(191) NOT NULL,
  `messageId` VARCHAR(191) NOT NULL,
  `value` TEXT NOT NULL,
  `status` ENUM('DRAFT', 'REVIEW', 'PUBLISHED') NOT NULL,
  `changedBy` VARCHAR(36) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `UiMessageVersion_messageId_createdAt_idx`(`messageId`, `createdAt`),
  CONSTRAINT `UiMessageVersion_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `UiMessage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `TranslationMemory` (
  `id` VARCHAR(191) NOT NULL,
  `sourceLocale` VARCHAR(16) NOT NULL,
  `targetLocale` VARCHAR(16) NOT NULL,
  `sourceHash` VARCHAR(64) NOT NULL,
  `sourceText` TEXT NOT NULL,
  `targetText` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `TranslationMemory_sourceHash_targetLocale_key`(`sourceHash`, `targetLocale`),
  INDEX `TranslationMemory_sourceLocale_targetLocale_idx`(`sourceLocale`, `targetLocale`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;