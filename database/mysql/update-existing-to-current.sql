-- AZURA — MySQL upgrade: existing database → current schema
-- phpMyAdmin / Hostinger: select your database → Import this file
--
-- For databases created from an OLD import-blank / 01-schema (legacy *En/*Ar columns,
-- SeoSettings, UiMessage, Product.locale, etc.). Safe to re-run (idempotent helpers).
--
-- BEFORE section 10 (legacy column drops), backfill bilingual data into EntityTranslation:
--   npx tsx scripts/i18n/backfill-translations.ts
--   npx tsx scripts/i18n/migrate-products-to-translations.ts
--   npx tsx scripts/i18n/verify-parity.ts
--
-- Regenerate: node scripts/database/assemble-mysql-update-existing.mjs
-- Target schema: database/mysql/01-schema.sql (prisma/schema/mysql)

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ========== HELPERS (dropped at end) ==========
DROP PROCEDURE IF EXISTS azura_table_exists;
DROP PROCEDURE IF EXISTS azura_column_exists;
DROP PROCEDURE IF EXISTS azura_index_exists;
DROP PROCEDURE IF EXISTS azura_add_column;
DROP PROCEDURE IF EXISTS azura_drop_column;
DROP PROCEDURE IF EXISTS azura_rename_column;
DROP PROCEDURE IF EXISTS azura_drop_index;
DROP PROCEDURE IF EXISTS azura_add_index;

DELIMITER $$

CREATE PROCEDURE azura_table_exists(IN p_table VARCHAR(64), OUT p_exists TINYINT)
BEGIN
  SELECT COUNT(*) > 0 INTO p_exists
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table;
END$$

CREATE PROCEDURE azura_column_exists(
  IN p_table VARCHAR(64), IN p_column VARCHAR(64), OUT p_exists TINYINT
)
BEGIN
  SELECT COUNT(*) > 0 INTO p_exists
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = p_table
    AND COLUMN_NAME = p_column;
END$$

CREATE PROCEDURE azura_index_exists(
  IN p_table VARCHAR(64), IN p_index VARCHAR(64), OUT p_exists TINYINT
)
BEGIN
  SELECT COUNT(*) > 0 INTO p_exists
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = p_table
    AND INDEX_NAME = p_index;
END$$

CREATE PROCEDURE azura_add_column(
  IN p_table VARCHAR(64), IN p_column VARCHAR(64), IN p_def TEXT
)
BEGIN
  DECLARE v_exists TINYINT DEFAULT 0;
  CALL azura_column_exists(p_table, p_column, v_exists);
  IF v_exists = 0 THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_column, '` ', p_def);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$

CREATE PROCEDURE azura_drop_column(IN p_table VARCHAR(64), IN p_column VARCHAR(64))
BEGIN
  DECLARE v_exists TINYINT DEFAULT 0;
  CALL azura_column_exists(p_table, p_column, v_exists);
  IF v_exists = 1 THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table, '` DROP COLUMN `', p_column, '`');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$

CREATE PROCEDURE azura_rename_column(
  IN p_table VARCHAR(64), IN p_old VARCHAR(64), IN p_new VARCHAR(64), IN p_def TEXT
)
BEGIN
  DECLARE v_old TINYINT DEFAULT 0;
  DECLARE v_new TINYINT DEFAULT 0;
  CALL azura_column_exists(p_table, p_old, v_old);
  CALL azura_column_exists(p_table, p_new, v_new);
  IF v_old = 1 AND v_new = 0 THEN
    SET @sql = CONCAT(
      'ALTER TABLE `', p_table, '` CHANGE COLUMN `', p_old, '` `', p_new, '` ', p_def
    );
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$

CREATE PROCEDURE azura_drop_index(IN p_table VARCHAR(64), IN p_index VARCHAR(64))
BEGIN
  DECLARE v_exists TINYINT DEFAULT 0;
  CALL azura_index_exists(p_table, p_index, v_exists);
  IF v_exists = 1 THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table, '` DROP INDEX `', p_index, '`');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$

CREATE PROCEDURE azura_add_index(
  IN p_table VARCHAR(64), IN p_index VARCHAR(64), IN p_cols TEXT, IN p_unique TINYINT
)
BEGIN
  DECLARE v_exists TINYINT DEFAULT 0;
  CALL azura_index_exists(p_table, p_index, v_exists);
  IF v_exists = 0 THEN
    SET @sql = CONCAT(
      'ALTER TABLE `', p_table, '` ADD ',
      IF(p_unique = 1, 'UNIQUE ', ''),
      'INDEX `', p_index, '`(', p_cols, ')'
    );
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$

CREATE PROCEDURE azura_consolidate_product()
BEGIN
  DECLARE v_table TINYINT DEFAULT 0;
  DECLARE v_locale TINYINT DEFAULT 0;
  DECLARE v_canonical TINYINT DEFAULT 0;
  CALL azura_table_exists('Product', v_table);
  IF v_table = 1 THEN
    CALL azura_column_exists('Product', 'locale', v_locale);
    CALL azura_column_exists('Product', 'canonicalSlug', v_canonical);
    IF NOT (v_locale = 0 AND v_canonical = 1) THEN
      IF v_canonical = 0 THEN
        CALL azura_add_column('Product', 'canonicalSlug', 'VARCHAR(255) NULL');
      END IF;
      SET @sql = 'UPDATE `Product` SET `canonicalSlug` = `slug` WHERE `canonicalSlug` IS NULL AND `slug` IS NOT NULL';
      PREPARE stmt FROM @sql;
      EXECUTE stmt;
      DEALLOCATE PREPARE stmt;
      SET @sql = 'UPDATE `Product` SET `canonicalSlug` = `id` WHERE `canonicalSlug` IS NULL OR `canonicalSlug` = ''''';
      PREPARE stmt FROM @sql;
      EXECUTE stmt;
      DEALLOCATE PREPARE stmt;
      SET @sql = 'ALTER TABLE `Product` MODIFY `canonicalSlug` VARCHAR(255) NOT NULL';
      PREPARE stmt FROM @sql;
      EXECUTE stmt;
      DEALLOCATE PREPARE stmt;
      CALL azura_drop_index('Product', 'Product_locale_slug_key');
      CALL azura_drop_index('Product', 'Product_slug_idx');
      CALL azura_drop_index('Product', 'Product_locale_idx');
      CALL azura_drop_index('Product', 'Product_locale_brand_idx');
      CALL azura_drop_index('Product', 'Product_locale_category_idx');
      CALL azura_drop_index('Product', 'Product_locale_status_idx');
      CALL azura_drop_index('Product', 'Product_locale_stockStatus_idx');
      CALL azura_drop_index('Product', 'Product_locale_priceValue_idx');
      CALL azura_drop_column('Product', 'locale');
      CALL azura_drop_column('Product', 'slug');
      CALL azura_drop_column('Product', 'productTitle');
      CALL azura_add_index('Product', 'Product_canonicalSlug_key', '`canonicalSlug`', 1);
      CALL azura_add_index('Product', 'Product_sku_key', '`sku`', 1);
      CALL azura_add_index('Product', 'Product_canonicalSlug_idx', '`canonicalSlug`', 0);
      CALL azura_add_index('Product', 'Product_brand_idx', '`brand`', 0);
      CALL azura_add_index('Product', 'Product_category_idx', '`category`', 0);
      CALL azura_add_index('Product', 'Product_status_idx', '`status`', 0);
      CALL azura_add_index('Product', 'Product_stockStatus_idx', '`stockStatus`', 0);
      CALL azura_add_index('Product', 'Product_priceValue_idx', '`priceValue`', 0);
    END IF;
  END IF;
END$$

DELIMITER ;

-- ========== 1. NEW TABLES (current shape) ==========
-- Product
CREATE TABLE IF NOT EXISTS `Product` (
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

-- CatalogCollection
CREATE TABLE IF NOT EXISTS `CatalogCollection` (
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

-- SiteSettings
CREATE TABLE IF NOT EXISTS `SiteSettings` (
    `locale` VARCHAR(10) NOT NULL,
    `payload` JSON NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `publishedVersion` INTEGER NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`locale`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- SearchAnalyticsSnapshot
CREATE TABLE IF NOT EXISTS `SearchAnalyticsSnapshot` (
    `locale` VARCHAR(10) NOT NULL,
    `data` JSON NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`locale`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- TranslationMemory
CREATE TABLE IF NOT EXISTS `TranslationMemory` (
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

-- SeoSubmissionJob
CREATE TABLE IF NOT EXISTS `SeoSubmissionJob` (
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

-- SeoRunnerLock
CREATE TABLE IF NOT EXISTS `SeoRunnerLock` (
    `key` VARCHAR(64) NOT NULL,
    `lockedUntil` DATETIME(3) NOT NULL,
    `owner` VARCHAR(128) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- SeoProviderTelemetry
CREATE TABLE IF NOT EXISTS `SeoProviderTelemetry` (
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

-- SeoHealthSnapshot
CREATE TABLE IF NOT EXISTS `SeoHealthSnapshot` (
    `id` VARCHAR(191) NOT NULL,
    `score` INTEGER NOT NULL,
    `componentBreakdown` JSON NOT NULL,
    `generatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SeoHealthSnapshot_generatedAt_idx`(`generatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- SeoCrawlIssue
CREATE TABLE IF NOT EXISTS `SeoCrawlIssue` (
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

-- SeoSearchMetric
CREATE TABLE IF NOT EXISTS `SeoSearchMetric` (
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

-- SeoRichResultIssue
CREATE TABLE IF NOT EXISTS `SeoRichResultIssue` (
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

-- ========== 2. CatalogCollection rules → conditions ==========
CALL azura_rename_column('CatalogCollection', 'rules', 'conditions', 'JSON NOT NULL');
UPDATE `CatalogCollection` SET `conditions` = JSON_OBJECT() WHERE `conditions` IS NULL;

-- ========== 3. MediaAsset.assetScope ==========
CALL azura_add_column('MediaAsset', 'assetScope', "VARCHAR(16) NOT NULL DEFAULT 'CMS'");
CALL azura_add_index('MediaAsset', 'MediaAsset_assetScope_idx', '`assetScope`', 0);

-- ========== 4. SiteTheme preset / effects ==========
CALL azura_add_column('SiteTheme', 'backgroundEffectSettings', "JSON NOT NULL DEFAULT (JSON_OBJECT())");
CALL azura_add_column('SiteTheme', 'cursorEffectSettings', "JSON NOT NULL DEFAULT (JSON_OBJECT())");
CALL azura_add_column('SiteTheme', 'textEffectSettings', "JSON NOT NULL DEFAULT (JSON_OBJECT())");
CALL azura_add_column('SiteTheme', 'motionSettings', "JSON NOT NULL DEFAULT (JSON_OBJECT())");
CALL azura_add_column('SiteTheme', 'siteDefaultPresetId', 'VARCHAR(191) NULL');
CALL azura_add_column('SiteTheme', 'themeProvenance', "JSON NOT NULL DEFAULT (JSON_OBJECT())");

UPDATE `SiteTheme`
SET `siteDefaultPresetId` = `activePresetId`
WHERE `siteDefaultPresetId` IS NULL AND `activePresetId` IS NOT NULL;

UPDATE `SiteTheme`
SET `activePresetId` = `siteDefaultPresetId`
WHERE `siteDefaultPresetId` IS NOT NULL
  AND (`activePresetId` IS NULL OR `activePresetId` <> `siteDefaultPresetId`);

-- ========== 5. SiteSettings.publishedVersion ==========
CALL azura_add_column('SiteSettings', 'publishedVersion', 'INTEGER NOT NULL DEFAULT 0');

-- ========== 6. SearchDocument entity types + index ==========
UPDATE `SearchDocument` SET `entityType` = 'CONTENT_ITEM' WHERE `entityType` IN ('PACKAGE', 'HOTEL', 'SERVICE');

ALTER TABLE `SearchDocument` MODIFY COLUMN `entityType` ENUM(
  'CONTENT_ITEM',
  'CONTENT_COLLECTION',
  'CONTENT_TYPE',
  'CATALOG_PRODUCT',
  'CATALOG_COLLECTION',
  'CATALOG_CATEGORY',
  'POST',
  'CMS_PAGE',
  'FAQ',
  'MEDIA',
  'TESTIMONIAL',
  'TEAM_MEMBER',
  'PARTNER'
) NOT NULL;

CALL azura_add_index('SearchDocument', 'SearchDocument_locale_entityType_idx', '`locale`, `entityType`', 0);

-- ========== 7. Search FULLTEXT (mysql-schema-extras) ==========
SET @ft_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'SearchDocument'
    AND INDEX_NAME = 'SearchDocument_fulltext_idx'
);
SET @ft_sql = IF(
  @ft_exists = 0,
  'CREATE FULLTEXT INDEX `SearchDocument_fulltext_idx` ON `SearchDocument`(`title`, `body`)',
  'SELECT 1'
);
PREPARE ft_stmt FROM @ft_sql;
EXECUTE ft_stmt;
DEALLOCATE PREPARE ft_stmt;

-- ========== 8. LocaleConfig + translation columns ==========
CALL azura_add_column('LocaleConfig', 'fallbackLocaleCode', 'VARCHAR(16) NULL');
CALL azura_add_column('LocaleConfig', 'completionPercent', 'INT NOT NULL DEFAULT 0');
CALL azura_add_column('LocaleConfig', 'lastTranslationSyncAt', 'DATETIME(3) NULL');

ALTER TABLE `EntityTranslation` MODIFY `status` ENUM('DRAFT', 'REVIEW', 'PUBLISHED') NOT NULL DEFAULT 'PUBLISHED';
ALTER TABLE `EntityTranslationVersion` MODIFY `status` ENUM('DRAFT', 'REVIEW', 'PUBLISHED') NOT NULL;

CALL azura_rename_column('EntityTranslation', 'languageCode', 'localeCode', 'VARCHAR(16) NOT NULL');
CALL azura_add_column('EntityTranslation', 'version', 'INT NOT NULL DEFAULT 1');
CALL azura_rename_column('LocalizedSlug', 'languageCode', 'localeCode', 'VARCHAR(16) NOT NULL');
CALL azura_rename_column('TranslationJob', 'languageCode', 'localeCode', 'VARCHAR(16) NOT NULL');

-- UiMessage may exist on old DB; rename before drop in section 12
CALL azura_rename_column('UiMessage', 'languageCode', 'localeCode', 'VARCHAR(16) NOT NULL');

-- ========== 9. Product consolidation (locale/slug → canonicalSlug) ==========
CALL azura_consolidate_product();

-- ========== 10. Drop legacy bilingual columns ==========
CALL azura_drop_column('Gallery', 'titleEn');
CALL azura_drop_column('Gallery', 'titleAr');
CALL azura_drop_column('Gallery', 'excerptEn');
CALL azura_drop_column('Gallery', 'excerptAr');
CALL azura_drop_column('Gallery', 'descriptionEn');
CALL azura_drop_column('Gallery', 'descriptionAr');
CALL azura_drop_column('Gallery', 'infoEn');
CALL azura_drop_column('Gallery', 'infoAr');
CALL azura_drop_column('GalleryMedia', 'titleEn');
CALL azura_drop_column('GalleryMedia', 'titleAr');
CALL azura_drop_column('GalleryMedia', 'excerptEn');
CALL azura_drop_column('GalleryMedia', 'excerptAr');
CALL azura_drop_column('GalleryMedia', 'descriptionEn');
CALL azura_drop_column('GalleryMedia', 'descriptionAr');
CALL azura_drop_column('GalleryMedia', 'infoEn');
CALL azura_drop_column('GalleryMedia', 'infoAr');
CALL azura_drop_column('Testimonial', 'contentEn');
CALL azura_drop_column('Testimonial', 'contentAr');
CALL azura_drop_column('TestimonialCollection', 'titleEn');
CALL azura_drop_column('TestimonialCollection', 'titleAr');
CALL azura_drop_column('TestimonialCollection', 'excerptEn');
CALL azura_drop_column('TestimonialCollection', 'excerptAr');
CALL azura_drop_column('FaqSet', 'titleEn');
CALL azura_drop_column('FaqSet', 'titleAr');
CALL azura_drop_column('FaqSet', 'excerptEn');
CALL azura_drop_column('FaqSet', 'excerptAr');
CALL azura_drop_column('FaqSet', 'descriptionEn');
CALL azura_drop_column('FaqSet', 'descriptionAr');
CALL azura_drop_column('FaqItem', 'questionEn');
CALL azura_drop_column('FaqItem', 'questionAr');
CALL azura_drop_column('FaqItem', 'answerEn');
CALL azura_drop_column('FaqItem', 'answerAr');
CALL azura_drop_column('CompanyInfo', 'taglineEn');
CALL azura_drop_column('CompanyInfo', 'taglineAr');
CALL azura_drop_column('CompanyInfo', 'storyEn');
CALL azura_drop_column('CompanyInfo', 'storyAr');
CALL azura_drop_column('CompanyInfo', 'missionEn');
CALL azura_drop_column('CompanyInfo', 'missionAr');
CALL azura_drop_column('CompanyInfo', 'visionEn');
CALL azura_drop_column('CompanyInfo', 'visionAr');
CALL azura_drop_column('CompanyInfo', 'valuesEn');
CALL azura_drop_column('CompanyInfo', 'valuesAr');
CALL azura_drop_column('CompanyInfo', 'addressEn');
CALL azura_drop_column('CompanyInfo', 'addressAr');
CALL azura_drop_column('CompanyInfo', 'officeHoursEn');
CALL azura_drop_column('CompanyInfo', 'officeHoursAr');
CALL azura_drop_column('SeoSettings', 'titleEn');
CALL azura_drop_column('SeoSettings', 'titleAr');
CALL azura_drop_column('SeoSettings', 'descriptionEn');
CALL azura_drop_column('SeoSettings', 'descriptionAr');
CALL azura_drop_column('MediaAsset', 'altEn');
CALL azura_drop_column('MediaAsset', 'altAr');
CALL azura_drop_column('CmsPage', 'titleEn');
CALL azura_drop_column('CmsPage', 'titleAr');
CALL azura_drop_column('CmsPage', 'excerptEn');
CALL azura_drop_column('CmsPage', 'excerptAr');
CALL azura_drop_column('PostCategory', 'nameEn');
CALL azura_drop_column('PostCategory', 'nameAr');
CALL azura_drop_column('PostTag', 'nameEn');
CALL azura_drop_column('PostTag', 'nameAr');
CALL azura_drop_column('PostAuthor', 'bioEn');
CALL azura_drop_column('PostAuthor', 'bioAr');
CALL azura_drop_column('Post', 'titleEn');
CALL azura_drop_column('Post', 'titleAr');
CALL azura_drop_column('Post', 'excerptEn');
CALL azura_drop_column('Post', 'excerptAr');
CALL azura_drop_column('Post', 'contentEn');
CALL azura_drop_column('Post', 'contentAr');
CALL azura_drop_column('SeoMeta', 'titleEn');
CALL azura_drop_column('SeoMeta', 'titleAr');
CALL azura_drop_column('SeoMeta', 'descriptionEn');
CALL azura_drop_column('SeoMeta', 'descriptionAr');
CALL azura_drop_column('SeoMeta', 'ogTitleEn');
CALL azura_drop_column('SeoMeta', 'ogTitleAr');
CALL azura_drop_column('Custom404', 'titleEn');
CALL azura_drop_column('Custom404', 'titleAr');
CALL azura_drop_column('Custom404', 'bodyEn');
CALL azura_drop_column('Custom404', 'bodyAr');
CALL azura_drop_column('ContentType', 'nameEn');
CALL azura_drop_column('ContentType', 'nameAr');
CALL azura_drop_column('ContentType', 'labelSingularEn');
CALL azura_drop_column('ContentType', 'labelSingularAr');
CALL azura_drop_column('ContentType', 'labelPluralEn');
CALL azura_drop_column('ContentType', 'labelPluralAr');
CALL azura_drop_column('ContentCollection', 'nameEn');
CALL azura_drop_column('ContentCollection', 'nameAr');
CALL azura_drop_column('ContentCollection', 'excerptEn');
CALL azura_drop_column('ContentCollection', 'excerptAr');
CALL azura_drop_column('ContentItem', 'titleEn');
CALL azura_drop_column('ContentItem', 'titleAr');
CALL azura_drop_column('ContentItem', 'excerptEn');
CALL azura_drop_column('ContentItem', 'excerptAr');
CALL azura_drop_column('ContentItem', 'descriptionEn');
CALL azura_drop_column('ContentItem', 'descriptionAr');
CALL azura_drop_column('ContentItemMedia', 'altEn');
CALL azura_drop_column('ContentItemMedia', 'altAr');
CALL azura_drop_column('ContentItemMedia', 'captionEn');
CALL azura_drop_column('ContentItemMedia', 'captionAr');
CALL azura_drop_column('PricingPlanSet', 'titleEn');
CALL azura_drop_column('PricingPlanSet', 'titleAr');
CALL azura_drop_column('PricingPlanSet', 'descriptionEn');
CALL azura_drop_column('PricingPlanSet', 'descriptionAr');
CALL azura_drop_column('PricingPlan', 'nameEn');
CALL azura_drop_column('PricingPlan', 'nameAr');
CALL azura_drop_column('PricingPlan', 'descriptionEn');
CALL azura_drop_column('PricingPlan', 'descriptionAr');
CALL azura_drop_column('PricingPlan', 'badgeEn');
CALL azura_drop_column('PricingPlan', 'badgeAr');
CALL azura_drop_column('PricingPlan', 'ctaLabelEn');
CALL azura_drop_column('PricingPlan', 'ctaLabelAr');
CALL azura_drop_column('PricingPlanFeature', 'labelEn');
CALL azura_drop_column('PricingPlanFeature', 'labelAr');
CALL azura_drop_column('ReleaseSet', 'titleEn');
CALL azura_drop_column('ReleaseSet', 'titleAr');
CALL azura_drop_column('ReleaseSet', 'descriptionEn');
CALL azura_drop_column('ReleaseSet', 'descriptionAr');
CALL azura_drop_column('ReleaseEntry', 'textEn');
CALL azura_drop_column('ReleaseEntry', 'textAr');
CALL azura_drop_column('PricingCalculator', 'titleEn');
CALL azura_drop_column('PricingCalculator', 'titleAr');
CALL azura_drop_column('PricingCalculator', 'descriptionEn');
CALL azura_drop_column('PricingCalculator', 'descriptionAr');
CALL azura_drop_column('PricingCalculatorField', 'labelEn');
CALL azura_drop_column('PricingCalculatorField', 'labelAr');
CALL azura_drop_column('KnowledgeBase', 'titleEn');
CALL azura_drop_column('KnowledgeBase', 'titleAr');
CALL azura_drop_column('KnowledgeBase', 'descriptionEn');
CALL azura_drop_column('KnowledgeBase', 'descriptionAr');
CALL azura_drop_column('KnowledgeCategory', 'titleEn');
CALL azura_drop_column('KnowledgeCategory', 'titleAr');
CALL azura_drop_column('KnowledgeArticle', 'titleEn');
CALL azura_drop_column('KnowledgeArticle', 'titleAr');
CALL azura_drop_column('KnowledgeArticle', 'excerptEn');
CALL azura_drop_column('KnowledgeArticle', 'excerptAr');
CALL azura_drop_column('KnowledgeArticle', 'bodyEn');
CALL azura_drop_column('KnowledgeArticle', 'bodyAr');
CALL azura_drop_column('DocPortal', 'titleEn');
CALL azura_drop_column('DocPortal', 'titleAr');
CALL azura_drop_column('DocPortal', 'descriptionEn');
CALL azura_drop_column('DocPortal', 'descriptionAr');
CALL azura_drop_column('DocVersion', 'labelEn');
CALL azura_drop_column('DocVersion', 'labelAr');
CALL azura_drop_column('DocSection', 'titleEn');
CALL azura_drop_column('DocSection', 'titleAr');
CALL azura_drop_column('DocSection', 'contentEn');
CALL azura_drop_column('DocSection', 'contentAr');
CALL azura_drop_column('StatusBoard', 'titleEn');
CALL azura_drop_column('StatusBoard', 'titleAr');
CALL azura_drop_column('StatusBoard', 'descriptionEn');
CALL azura_drop_column('StatusBoard', 'descriptionAr');
CALL azura_drop_column('StatusService', 'nameEn');
CALL azura_drop_column('StatusService', 'nameAr');
CALL azura_drop_column('StatusService', 'descriptionEn');
CALL azura_drop_column('StatusService', 'descriptionAr');
CALL azura_drop_column('StatusIncident', 'titleEn');
CALL azura_drop_column('StatusIncident', 'titleAr');
CALL azura_drop_column('StatusIncident', 'messageEn');
CALL azura_drop_column('StatusIncident', 'messageAr');
CALL azura_drop_column('StatusMaintenance', 'titleEn');
CALL azura_drop_column('StatusMaintenance', 'titleAr');
CALL azura_drop_column('StatusMaintenance', 'messageEn');
CALL azura_drop_column('StatusMaintenance', 'messageAr');
CALL azura_drop_column('TeamDirectory', 'titleEn');
CALL azura_drop_column('TeamDirectory', 'titleAr');
CALL azura_drop_column('TeamDirectory', 'descriptionEn');
CALL azura_drop_column('TeamDirectory', 'descriptionAr');
CALL azura_drop_column('TeamDepartment', 'nameEn');
CALL azura_drop_column('TeamDepartment', 'nameAr');
CALL azura_drop_column('TeamMember', 'nameEn');
CALL azura_drop_column('TeamMember', 'nameAr');
CALL azura_drop_column('TeamMember', 'roleEn');
CALL azura_drop_column('TeamMember', 'roleAr');
CALL azura_drop_column('TeamMember', 'bioEn');
CALL azura_drop_column('TeamMember', 'bioAr');
CALL azura_drop_column('TeamMember', 'locationEn');
CALL azura_drop_column('TeamMember', 'locationAr');
CALL azura_drop_column('PartnerProgram', 'titleEn');
CALL azura_drop_column('PartnerProgram', 'titleAr');
CALL azura_drop_column('PartnerProgram', 'descriptionEn');
CALL azura_drop_column('PartnerProgram', 'descriptionAr');
CALL azura_drop_column('PartnerCategory', 'nameEn');
CALL azura_drop_column('PartnerCategory', 'nameAr');
CALL azura_drop_column('Partner', 'nameEn');
CALL azura_drop_column('Partner', 'nameAr');
CALL azura_drop_column('Partner', 'descriptionEn');
CALL azura_drop_column('Partner', 'descriptionAr');
CALL azura_drop_column('Partner', 'locationEn');
CALL azura_drop_column('Partner', 'locationAr');
CALL azura_drop_column('CatalogCollection', 'name');
CALL azura_drop_column('CatalogCollection', 'description');

DROP TABLE IF EXISTS `CatalogCollectionLocale`;

-- ========== 11. Drop UiMessage (strings moved to messages/*.json) ==========
DROP TABLE IF EXISTS `UiMessageVersion`;
DROP TABLE IF EXISTS `UiMessage`;

-- ========== 12. Merge wired SeoMeta rows (pageKey vs cmsPageId) ==========

-- slug: home
SET @slug = 'home';
SET @cms_page_id = (SELECT `id` FROM `CmsPage` WHERE `slug` = @slug LIMIT 1);
SET @cms_meta_id = (
  SELECT sm.`id` FROM `SeoMeta` sm
  WHERE sm.`cmsPageId` = @cms_page_id LIMIT 1
);
SET @page_key_meta_id = (SELECT `id` FROM `SeoMeta` WHERE `pageKey` = @slug LIMIT 1);

UPDATE `SeoMeta` pk
INNER JOIN `SeoMeta` cms ON cms.`id` = @cms_meta_id
SET
  pk.`canonicalUrl` = COALESCE(NULLIF(TRIM(pk.`canonicalUrl`), ''), NULLIF(TRIM(cms.`canonicalUrl`), '')),
  pk.`robots` = COALESCE(NULLIF(TRIM(pk.`robots`), ''), NULLIF(TRIM(cms.`robots`), '')),
  pk.`focusKeywords` = COALESCE(NULLIF(TRIM(pk.`focusKeywords`), ''), NULLIF(TRIM(cms.`focusKeywords`), '')),
  pk.`ogImageUrl` = COALESCE(NULLIF(TRIM(pk.`ogImageUrl`), ''), NULLIF(TRIM(cms.`ogImageUrl`), '')),
  pk.`twitterCard` = COALESCE(NULLIF(TRIM(pk.`twitterCard`), ''), NULLIF(TRIM(cms.`twitterCard`), '')),
  pk.`jsonLd` = COALESCE(pk.`jsonLd`, cms.`jsonLd`)
WHERE pk.`id` = @page_key_meta_id
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

UPDATE `SeoMeta`
SET `pageKey` = @slug, `cmsPageId` = NULL
WHERE `id` = @cms_meta_id
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id IS NULL;

INSERT INTO `EntityTranslation` (
  `id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `status`, `version`, `createdAt`, `updatedAt`
)
SELECT
  CONCAT('merge-seo-', REPLACE(UUID(), '-', '')),
  'SeoMeta',
  @page_key_meta_id,
  cms_t.`field`,
  cms_t.`localeCode`,
  cms_t.`value`,
  cms_t.`status`,
  1,
  NOW(3),
  NOW(3)
FROM `EntityTranslation` cms_t
WHERE cms_t.`entityType` = 'SeoMeta'
  AND cms_t.`entityId` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id
  AND NOT EXISTS (
    SELECT 1 FROM `EntityTranslation` pk_t
    WHERE pk_t.`entityType` = 'SeoMeta'
      AND pk_t.`entityId` = @page_key_meta_id
      AND pk_t.`field` = cms_t.`field`
      AND pk_t.`localeCode` = cms_t.`localeCode`
      AND NULLIF(TRIM(pk_t.`value`), '') IS NOT NULL
  );

DELETE FROM `EntityTranslation`
WHERE `entityType` = 'SeoMeta'
  AND `entityId` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

DELETE FROM `SeoMeta`
WHERE `id` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

-- slug: about
SET @slug = 'about';
SET @cms_page_id = (SELECT `id` FROM `CmsPage` WHERE `slug` = @slug LIMIT 1);
SET @cms_meta_id = (
  SELECT sm.`id` FROM `SeoMeta` sm
  WHERE sm.`cmsPageId` = @cms_page_id LIMIT 1
);
SET @page_key_meta_id = (SELECT `id` FROM `SeoMeta` WHERE `pageKey` = @slug LIMIT 1);

UPDATE `SeoMeta` pk
INNER JOIN `SeoMeta` cms ON cms.`id` = @cms_meta_id
SET
  pk.`canonicalUrl` = COALESCE(NULLIF(TRIM(pk.`canonicalUrl`), ''), NULLIF(TRIM(cms.`canonicalUrl`), '')),
  pk.`robots` = COALESCE(NULLIF(TRIM(pk.`robots`), ''), NULLIF(TRIM(cms.`robots`), '')),
  pk.`focusKeywords` = COALESCE(NULLIF(TRIM(pk.`focusKeywords`), ''), NULLIF(TRIM(cms.`focusKeywords`), '')),
  pk.`ogImageUrl` = COALESCE(NULLIF(TRIM(pk.`ogImageUrl`), ''), NULLIF(TRIM(cms.`ogImageUrl`), '')),
  pk.`twitterCard` = COALESCE(NULLIF(TRIM(pk.`twitterCard`), ''), NULLIF(TRIM(cms.`twitterCard`), '')),
  pk.`jsonLd` = COALESCE(pk.`jsonLd`, cms.`jsonLd`)
WHERE pk.`id` = @page_key_meta_id
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

UPDATE `SeoMeta`
SET `pageKey` = @slug, `cmsPageId` = NULL
WHERE `id` = @cms_meta_id
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id IS NULL;

INSERT INTO `EntityTranslation` (
  `id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `status`, `version`, `createdAt`, `updatedAt`
)
SELECT
  CONCAT('merge-seo-', REPLACE(UUID(), '-', '')),
  'SeoMeta',
  @page_key_meta_id,
  cms_t.`field`,
  cms_t.`localeCode`,
  cms_t.`value`,
  cms_t.`status`,
  1,
  NOW(3),
  NOW(3)
FROM `EntityTranslation` cms_t
WHERE cms_t.`entityType` = 'SeoMeta'
  AND cms_t.`entityId` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id
  AND NOT EXISTS (
    SELECT 1 FROM `EntityTranslation` pk_t
    WHERE pk_t.`entityType` = 'SeoMeta'
      AND pk_t.`entityId` = @page_key_meta_id
      AND pk_t.`field` = cms_t.`field`
      AND pk_t.`localeCode` = cms_t.`localeCode`
      AND NULLIF(TRIM(pk_t.`value`), '') IS NOT NULL
  );

DELETE FROM `EntityTranslation`
WHERE `entityType` = 'SeoMeta'
  AND `entityId` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

DELETE FROM `SeoMeta`
WHERE `id` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

-- slug: contact
SET @slug = 'contact';
SET @cms_page_id = (SELECT `id` FROM `CmsPage` WHERE `slug` = @slug LIMIT 1);
SET @cms_meta_id = (
  SELECT sm.`id` FROM `SeoMeta` sm
  WHERE sm.`cmsPageId` = @cms_page_id LIMIT 1
);
SET @page_key_meta_id = (SELECT `id` FROM `SeoMeta` WHERE `pageKey` = @slug LIMIT 1);

UPDATE `SeoMeta` pk
INNER JOIN `SeoMeta` cms ON cms.`id` = @cms_meta_id
SET
  pk.`canonicalUrl` = COALESCE(NULLIF(TRIM(pk.`canonicalUrl`), ''), NULLIF(TRIM(cms.`canonicalUrl`), '')),
  pk.`robots` = COALESCE(NULLIF(TRIM(pk.`robots`), ''), NULLIF(TRIM(cms.`robots`), '')),
  pk.`focusKeywords` = COALESCE(NULLIF(TRIM(pk.`focusKeywords`), ''), NULLIF(TRIM(cms.`focusKeywords`), '')),
  pk.`ogImageUrl` = COALESCE(NULLIF(TRIM(pk.`ogImageUrl`), ''), NULLIF(TRIM(cms.`ogImageUrl`), '')),
  pk.`twitterCard` = COALESCE(NULLIF(TRIM(pk.`twitterCard`), ''), NULLIF(TRIM(cms.`twitterCard`), '')),
  pk.`jsonLd` = COALESCE(pk.`jsonLd`, cms.`jsonLd`)
WHERE pk.`id` = @page_key_meta_id
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

UPDATE `SeoMeta`
SET `pageKey` = @slug, `cmsPageId` = NULL
WHERE `id` = @cms_meta_id
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id IS NULL;

INSERT INTO `EntityTranslation` (
  `id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `status`, `version`, `createdAt`, `updatedAt`
)
SELECT
  CONCAT('merge-seo-', REPLACE(UUID(), '-', '')),
  'SeoMeta',
  @page_key_meta_id,
  cms_t.`field`,
  cms_t.`localeCode`,
  cms_t.`value`,
  cms_t.`status`,
  1,
  NOW(3),
  NOW(3)
FROM `EntityTranslation` cms_t
WHERE cms_t.`entityType` = 'SeoMeta'
  AND cms_t.`entityId` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id
  AND NOT EXISTS (
    SELECT 1 FROM `EntityTranslation` pk_t
    WHERE pk_t.`entityType` = 'SeoMeta'
      AND pk_t.`entityId` = @page_key_meta_id
      AND pk_t.`field` = cms_t.`field`
      AND pk_t.`localeCode` = cms_t.`localeCode`
      AND NULLIF(TRIM(pk_t.`value`), '') IS NOT NULL
  );

DELETE FROM `EntityTranslation`
WHERE `entityType` = 'SeoMeta'
  AND `entityId` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

DELETE FROM `SeoMeta`
WHERE `id` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

-- slug: packages
SET @slug = 'packages';
SET @cms_page_id = (SELECT `id` FROM `CmsPage` WHERE `slug` = @slug LIMIT 1);
SET @cms_meta_id = (
  SELECT sm.`id` FROM `SeoMeta` sm
  WHERE sm.`cmsPageId` = @cms_page_id LIMIT 1
);
SET @page_key_meta_id = (SELECT `id` FROM `SeoMeta` WHERE `pageKey` = @slug LIMIT 1);

UPDATE `SeoMeta` pk
INNER JOIN `SeoMeta` cms ON cms.`id` = @cms_meta_id
SET
  pk.`canonicalUrl` = COALESCE(NULLIF(TRIM(pk.`canonicalUrl`), ''), NULLIF(TRIM(cms.`canonicalUrl`), '')),
  pk.`robots` = COALESCE(NULLIF(TRIM(pk.`robots`), ''), NULLIF(TRIM(cms.`robots`), '')),
  pk.`focusKeywords` = COALESCE(NULLIF(TRIM(pk.`focusKeywords`), ''), NULLIF(TRIM(cms.`focusKeywords`), '')),
  pk.`ogImageUrl` = COALESCE(NULLIF(TRIM(pk.`ogImageUrl`), ''), NULLIF(TRIM(cms.`ogImageUrl`), '')),
  pk.`twitterCard` = COALESCE(NULLIF(TRIM(pk.`twitterCard`), ''), NULLIF(TRIM(cms.`twitterCard`), '')),
  pk.`jsonLd` = COALESCE(pk.`jsonLd`, cms.`jsonLd`)
WHERE pk.`id` = @page_key_meta_id
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

UPDATE `SeoMeta`
SET `pageKey` = @slug, `cmsPageId` = NULL
WHERE `id` = @cms_meta_id
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id IS NULL;

INSERT INTO `EntityTranslation` (
  `id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `status`, `version`, `createdAt`, `updatedAt`
)
SELECT
  CONCAT('merge-seo-', REPLACE(UUID(), '-', '')),
  'SeoMeta',
  @page_key_meta_id,
  cms_t.`field`,
  cms_t.`localeCode`,
  cms_t.`value`,
  cms_t.`status`,
  1,
  NOW(3),
  NOW(3)
FROM `EntityTranslation` cms_t
WHERE cms_t.`entityType` = 'SeoMeta'
  AND cms_t.`entityId` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id
  AND NOT EXISTS (
    SELECT 1 FROM `EntityTranslation` pk_t
    WHERE pk_t.`entityType` = 'SeoMeta'
      AND pk_t.`entityId` = @page_key_meta_id
      AND pk_t.`field` = cms_t.`field`
      AND pk_t.`localeCode` = cms_t.`localeCode`
      AND NULLIF(TRIM(pk_t.`value`), '') IS NOT NULL
  );

DELETE FROM `EntityTranslation`
WHERE `entityType` = 'SeoMeta'
  AND `entityId` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

DELETE FROM `SeoMeta`
WHERE `id` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

-- slug: gallery
SET @slug = 'gallery';
SET @cms_page_id = (SELECT `id` FROM `CmsPage` WHERE `slug` = @slug LIMIT 1);
SET @cms_meta_id = (
  SELECT sm.`id` FROM `SeoMeta` sm
  WHERE sm.`cmsPageId` = @cms_page_id LIMIT 1
);
SET @page_key_meta_id = (SELECT `id` FROM `SeoMeta` WHERE `pageKey` = @slug LIMIT 1);

UPDATE `SeoMeta` pk
INNER JOIN `SeoMeta` cms ON cms.`id` = @cms_meta_id
SET
  pk.`canonicalUrl` = COALESCE(NULLIF(TRIM(pk.`canonicalUrl`), ''), NULLIF(TRIM(cms.`canonicalUrl`), '')),
  pk.`robots` = COALESCE(NULLIF(TRIM(pk.`robots`), ''), NULLIF(TRIM(cms.`robots`), '')),
  pk.`focusKeywords` = COALESCE(NULLIF(TRIM(pk.`focusKeywords`), ''), NULLIF(TRIM(cms.`focusKeywords`), '')),
  pk.`ogImageUrl` = COALESCE(NULLIF(TRIM(pk.`ogImageUrl`), ''), NULLIF(TRIM(cms.`ogImageUrl`), '')),
  pk.`twitterCard` = COALESCE(NULLIF(TRIM(pk.`twitterCard`), ''), NULLIF(TRIM(cms.`twitterCard`), '')),
  pk.`jsonLd` = COALESCE(pk.`jsonLd`, cms.`jsonLd`)
WHERE pk.`id` = @page_key_meta_id
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

UPDATE `SeoMeta`
SET `pageKey` = @slug, `cmsPageId` = NULL
WHERE `id` = @cms_meta_id
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id IS NULL;

INSERT INTO `EntityTranslation` (
  `id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `status`, `version`, `createdAt`, `updatedAt`
)
SELECT
  CONCAT('merge-seo-', REPLACE(UUID(), '-', '')),
  'SeoMeta',
  @page_key_meta_id,
  cms_t.`field`,
  cms_t.`localeCode`,
  cms_t.`value`,
  cms_t.`status`,
  1,
  NOW(3),
  NOW(3)
FROM `EntityTranslation` cms_t
WHERE cms_t.`entityType` = 'SeoMeta'
  AND cms_t.`entityId` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id
  AND NOT EXISTS (
    SELECT 1 FROM `EntityTranslation` pk_t
    WHERE pk_t.`entityType` = 'SeoMeta'
      AND pk_t.`entityId` = @page_key_meta_id
      AND pk_t.`field` = cms_t.`field`
      AND pk_t.`localeCode` = cms_t.`localeCode`
      AND NULLIF(TRIM(pk_t.`value`), '') IS NOT NULL
  );

DELETE FROM `EntityTranslation`
WHERE `entityType` = 'SeoMeta'
  AND `entityId` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

DELETE FROM `SeoMeta`
WHERE `id` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

-- slug: testimonials
SET @slug = 'testimonials';
SET @cms_page_id = (SELECT `id` FROM `CmsPage` WHERE `slug` = @slug LIMIT 1);
SET @cms_meta_id = (
  SELECT sm.`id` FROM `SeoMeta` sm
  WHERE sm.`cmsPageId` = @cms_page_id LIMIT 1
);
SET @page_key_meta_id = (SELECT `id` FROM `SeoMeta` WHERE `pageKey` = @slug LIMIT 1);

UPDATE `SeoMeta` pk
INNER JOIN `SeoMeta` cms ON cms.`id` = @cms_meta_id
SET
  pk.`canonicalUrl` = COALESCE(NULLIF(TRIM(pk.`canonicalUrl`), ''), NULLIF(TRIM(cms.`canonicalUrl`), '')),
  pk.`robots` = COALESCE(NULLIF(TRIM(pk.`robots`), ''), NULLIF(TRIM(cms.`robots`), '')),
  pk.`focusKeywords` = COALESCE(NULLIF(TRIM(pk.`focusKeywords`), ''), NULLIF(TRIM(cms.`focusKeywords`), '')),
  pk.`ogImageUrl` = COALESCE(NULLIF(TRIM(pk.`ogImageUrl`), ''), NULLIF(TRIM(cms.`ogImageUrl`), '')),
  pk.`twitterCard` = COALESCE(NULLIF(TRIM(pk.`twitterCard`), ''), NULLIF(TRIM(cms.`twitterCard`), '')),
  pk.`jsonLd` = COALESCE(pk.`jsonLd`, cms.`jsonLd`)
WHERE pk.`id` = @page_key_meta_id
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

UPDATE `SeoMeta`
SET `pageKey` = @slug, `cmsPageId` = NULL
WHERE `id` = @cms_meta_id
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id IS NULL;

INSERT INTO `EntityTranslation` (
  `id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `status`, `version`, `createdAt`, `updatedAt`
)
SELECT
  CONCAT('merge-seo-', REPLACE(UUID(), '-', '')),
  'SeoMeta',
  @page_key_meta_id,
  cms_t.`field`,
  cms_t.`localeCode`,
  cms_t.`value`,
  cms_t.`status`,
  1,
  NOW(3),
  NOW(3)
FROM `EntityTranslation` cms_t
WHERE cms_t.`entityType` = 'SeoMeta'
  AND cms_t.`entityId` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id
  AND NOT EXISTS (
    SELECT 1 FROM `EntityTranslation` pk_t
    WHERE pk_t.`entityType` = 'SeoMeta'
      AND pk_t.`entityId` = @page_key_meta_id
      AND pk_t.`field` = cms_t.`field`
      AND pk_t.`localeCode` = cms_t.`localeCode`
      AND NULLIF(TRIM(pk_t.`value`), '') IS NOT NULL
  );

DELETE FROM `EntityTranslation`
WHERE `entityType` = 'SeoMeta'
  AND `entityId` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

DELETE FROM `SeoMeta`
WHERE `id` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

-- slug: hotels-transport
SET @slug = 'hotels-transport';
SET @cms_page_id = (SELECT `id` FROM `CmsPage` WHERE `slug` = @slug LIMIT 1);
SET @cms_meta_id = (
  SELECT sm.`id` FROM `SeoMeta` sm
  WHERE sm.`cmsPageId` = @cms_page_id LIMIT 1
);
SET @page_key_meta_id = (SELECT `id` FROM `SeoMeta` WHERE `pageKey` = @slug LIMIT 1);

UPDATE `SeoMeta` pk
INNER JOIN `SeoMeta` cms ON cms.`id` = @cms_meta_id
SET
  pk.`canonicalUrl` = COALESCE(NULLIF(TRIM(pk.`canonicalUrl`), ''), NULLIF(TRIM(cms.`canonicalUrl`), '')),
  pk.`robots` = COALESCE(NULLIF(TRIM(pk.`robots`), ''), NULLIF(TRIM(cms.`robots`), '')),
  pk.`focusKeywords` = COALESCE(NULLIF(TRIM(pk.`focusKeywords`), ''), NULLIF(TRIM(cms.`focusKeywords`), '')),
  pk.`ogImageUrl` = COALESCE(NULLIF(TRIM(pk.`ogImageUrl`), ''), NULLIF(TRIM(cms.`ogImageUrl`), '')),
  pk.`twitterCard` = COALESCE(NULLIF(TRIM(pk.`twitterCard`), ''), NULLIF(TRIM(cms.`twitterCard`), '')),
  pk.`jsonLd` = COALESCE(pk.`jsonLd`, cms.`jsonLd`)
WHERE pk.`id` = @page_key_meta_id
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

UPDATE `SeoMeta`
SET `pageKey` = @slug, `cmsPageId` = NULL
WHERE `id` = @cms_meta_id
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id IS NULL;

INSERT INTO `EntityTranslation` (
  `id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `status`, `version`, `createdAt`, `updatedAt`
)
SELECT
  CONCAT('merge-seo-', REPLACE(UUID(), '-', '')),
  'SeoMeta',
  @page_key_meta_id,
  cms_t.`field`,
  cms_t.`localeCode`,
  cms_t.`value`,
  cms_t.`status`,
  1,
  NOW(3),
  NOW(3)
FROM `EntityTranslation` cms_t
WHERE cms_t.`entityType` = 'SeoMeta'
  AND cms_t.`entityId` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id
  AND NOT EXISTS (
    SELECT 1 FROM `EntityTranslation` pk_t
    WHERE pk_t.`entityType` = 'SeoMeta'
      AND pk_t.`entityId` = @page_key_meta_id
      AND pk_t.`field` = cms_t.`field`
      AND pk_t.`localeCode` = cms_t.`localeCode`
      AND NULLIF(TRIM(pk_t.`value`), '') IS NOT NULL
  );

DELETE FROM `EntityTranslation`
WHERE `entityType` = 'SeoMeta'
  AND `entityId` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

DELETE FROM `SeoMeta`
WHERE `id` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

-- slug: products
SET @slug = 'products';
SET @cms_page_id = (SELECT `id` FROM `CmsPage` WHERE `slug` = @slug LIMIT 1);
SET @cms_meta_id = (
  SELECT sm.`id` FROM `SeoMeta` sm
  WHERE sm.`cmsPageId` = @cms_page_id LIMIT 1
);
SET @page_key_meta_id = (SELECT `id` FROM `SeoMeta` WHERE `pageKey` = @slug LIMIT 1);

UPDATE `SeoMeta` pk
INNER JOIN `SeoMeta` cms ON cms.`id` = @cms_meta_id
SET
  pk.`canonicalUrl` = COALESCE(NULLIF(TRIM(pk.`canonicalUrl`), ''), NULLIF(TRIM(cms.`canonicalUrl`), '')),
  pk.`robots` = COALESCE(NULLIF(TRIM(pk.`robots`), ''), NULLIF(TRIM(cms.`robots`), '')),
  pk.`focusKeywords` = COALESCE(NULLIF(TRIM(pk.`focusKeywords`), ''), NULLIF(TRIM(cms.`focusKeywords`), '')),
  pk.`ogImageUrl` = COALESCE(NULLIF(TRIM(pk.`ogImageUrl`), ''), NULLIF(TRIM(cms.`ogImageUrl`), '')),
  pk.`twitterCard` = COALESCE(NULLIF(TRIM(pk.`twitterCard`), ''), NULLIF(TRIM(cms.`twitterCard`), '')),
  pk.`jsonLd` = COALESCE(pk.`jsonLd`, cms.`jsonLd`)
WHERE pk.`id` = @page_key_meta_id
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

UPDATE `SeoMeta`
SET `pageKey` = @slug, `cmsPageId` = NULL
WHERE `id` = @cms_meta_id
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id IS NULL;

INSERT INTO `EntityTranslation` (
  `id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `status`, `version`, `createdAt`, `updatedAt`
)
SELECT
  CONCAT('merge-seo-', REPLACE(UUID(), '-', '')),
  'SeoMeta',
  @page_key_meta_id,
  cms_t.`field`,
  cms_t.`localeCode`,
  cms_t.`value`,
  cms_t.`status`,
  1,
  NOW(3),
  NOW(3)
FROM `EntityTranslation` cms_t
WHERE cms_t.`entityType` = 'SeoMeta'
  AND cms_t.`entityId` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id
  AND NOT EXISTS (
    SELECT 1 FROM `EntityTranslation` pk_t
    WHERE pk_t.`entityType` = 'SeoMeta'
      AND pk_t.`entityId` = @page_key_meta_id
      AND pk_t.`field` = cms_t.`field`
      AND pk_t.`localeCode` = cms_t.`localeCode`
      AND NULLIF(TRIM(pk_t.`value`), '') IS NOT NULL
  );

DELETE FROM `EntityTranslation`
WHERE `entityType` = 'SeoMeta'
  AND `entityId` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

DELETE FROM `SeoMeta`
WHERE `id` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

-- slug: collections
SET @slug = 'collections';
SET @cms_page_id = (SELECT `id` FROM `CmsPage` WHERE `slug` = @slug LIMIT 1);
SET @cms_meta_id = (
  SELECT sm.`id` FROM `SeoMeta` sm
  WHERE sm.`cmsPageId` = @cms_page_id LIMIT 1
);
SET @page_key_meta_id = (SELECT `id` FROM `SeoMeta` WHERE `pageKey` = @slug LIMIT 1);

UPDATE `SeoMeta` pk
INNER JOIN `SeoMeta` cms ON cms.`id` = @cms_meta_id
SET
  pk.`canonicalUrl` = COALESCE(NULLIF(TRIM(pk.`canonicalUrl`), ''), NULLIF(TRIM(cms.`canonicalUrl`), '')),
  pk.`robots` = COALESCE(NULLIF(TRIM(pk.`robots`), ''), NULLIF(TRIM(cms.`robots`), '')),
  pk.`focusKeywords` = COALESCE(NULLIF(TRIM(pk.`focusKeywords`), ''), NULLIF(TRIM(cms.`focusKeywords`), '')),
  pk.`ogImageUrl` = COALESCE(NULLIF(TRIM(pk.`ogImageUrl`), ''), NULLIF(TRIM(cms.`ogImageUrl`), '')),
  pk.`twitterCard` = COALESCE(NULLIF(TRIM(pk.`twitterCard`), ''), NULLIF(TRIM(cms.`twitterCard`), '')),
  pk.`jsonLd` = COALESCE(pk.`jsonLd`, cms.`jsonLd`)
WHERE pk.`id` = @page_key_meta_id
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

UPDATE `SeoMeta`
SET `pageKey` = @slug, `cmsPageId` = NULL
WHERE `id` = @cms_meta_id
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id IS NULL;

INSERT INTO `EntityTranslation` (
  `id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `status`, `version`, `createdAt`, `updatedAt`
)
SELECT
  CONCAT('merge-seo-', REPLACE(UUID(), '-', '')),
  'SeoMeta',
  @page_key_meta_id,
  cms_t.`field`,
  cms_t.`localeCode`,
  cms_t.`value`,
  cms_t.`status`,
  1,
  NOW(3),
  NOW(3)
FROM `EntityTranslation` cms_t
WHERE cms_t.`entityType` = 'SeoMeta'
  AND cms_t.`entityId` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id
  AND NOT EXISTS (
    SELECT 1 FROM `EntityTranslation` pk_t
    WHERE pk_t.`entityType` = 'SeoMeta'
      AND pk_t.`entityId` = @page_key_meta_id
      AND pk_t.`field` = cms_t.`field`
      AND pk_t.`localeCode` = cms_t.`localeCode`
      AND NULLIF(TRIM(pk_t.`value`), '') IS NOT NULL
  );

DELETE FROM `EntityTranslation`
WHERE `entityType` = 'SeoMeta'
  AND `entityId` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

DELETE FROM `SeoMeta`
WHERE `id` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

-- slug: services
SET @slug = 'services';
SET @cms_page_id = (SELECT `id` FROM `CmsPage` WHERE `slug` = @slug LIMIT 1);
SET @cms_meta_id = (
  SELECT sm.`id` FROM `SeoMeta` sm
  WHERE sm.`cmsPageId` = @cms_page_id LIMIT 1
);
SET @page_key_meta_id = (SELECT `id` FROM `SeoMeta` WHERE `pageKey` = @slug LIMIT 1);

UPDATE `SeoMeta` pk
INNER JOIN `SeoMeta` cms ON cms.`id` = @cms_meta_id
SET
  pk.`canonicalUrl` = COALESCE(NULLIF(TRIM(pk.`canonicalUrl`), ''), NULLIF(TRIM(cms.`canonicalUrl`), '')),
  pk.`robots` = COALESCE(NULLIF(TRIM(pk.`robots`), ''), NULLIF(TRIM(cms.`robots`), '')),
  pk.`focusKeywords` = COALESCE(NULLIF(TRIM(pk.`focusKeywords`), ''), NULLIF(TRIM(cms.`focusKeywords`), '')),
  pk.`ogImageUrl` = COALESCE(NULLIF(TRIM(pk.`ogImageUrl`), ''), NULLIF(TRIM(cms.`ogImageUrl`), '')),
  pk.`twitterCard` = COALESCE(NULLIF(TRIM(pk.`twitterCard`), ''), NULLIF(TRIM(cms.`twitterCard`), '')),
  pk.`jsonLd` = COALESCE(pk.`jsonLd`, cms.`jsonLd`)
WHERE pk.`id` = @page_key_meta_id
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

UPDATE `SeoMeta`
SET `pageKey` = @slug, `cmsPageId` = NULL
WHERE `id` = @cms_meta_id
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id IS NULL;

INSERT INTO `EntityTranslation` (
  `id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `status`, `version`, `createdAt`, `updatedAt`
)
SELECT
  CONCAT('merge-seo-', REPLACE(UUID(), '-', '')),
  'SeoMeta',
  @page_key_meta_id,
  cms_t.`field`,
  cms_t.`localeCode`,
  cms_t.`value`,
  cms_t.`status`,
  1,
  NOW(3),
  NOW(3)
FROM `EntityTranslation` cms_t
WHERE cms_t.`entityType` = 'SeoMeta'
  AND cms_t.`entityId` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id
  AND NOT EXISTS (
    SELECT 1 FROM `EntityTranslation` pk_t
    WHERE pk_t.`entityType` = 'SeoMeta'
      AND pk_t.`entityId` = @page_key_meta_id
      AND pk_t.`field` = cms_t.`field`
      AND pk_t.`localeCode` = cms_t.`localeCode`
      AND NULLIF(TRIM(pk_t.`value`), '') IS NOT NULL
  );

DELETE FROM `EntityTranslation`
WHERE `entityType` = 'SeoMeta'
  AND `entityId` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

DELETE FROM `SeoMeta`
WHERE `id` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

-- slug: compare
SET @slug = 'compare';
SET @cms_page_id = (SELECT `id` FROM `CmsPage` WHERE `slug` = @slug LIMIT 1);
SET @cms_meta_id = (
  SELECT sm.`id` FROM `SeoMeta` sm
  WHERE sm.`cmsPageId` = @cms_page_id LIMIT 1
);
SET @page_key_meta_id = (SELECT `id` FROM `SeoMeta` WHERE `pageKey` = @slug LIMIT 1);

UPDATE `SeoMeta` pk
INNER JOIN `SeoMeta` cms ON cms.`id` = @cms_meta_id
SET
  pk.`canonicalUrl` = COALESCE(NULLIF(TRIM(pk.`canonicalUrl`), ''), NULLIF(TRIM(cms.`canonicalUrl`), '')),
  pk.`robots` = COALESCE(NULLIF(TRIM(pk.`robots`), ''), NULLIF(TRIM(cms.`robots`), '')),
  pk.`focusKeywords` = COALESCE(NULLIF(TRIM(pk.`focusKeywords`), ''), NULLIF(TRIM(cms.`focusKeywords`), '')),
  pk.`ogImageUrl` = COALESCE(NULLIF(TRIM(pk.`ogImageUrl`), ''), NULLIF(TRIM(cms.`ogImageUrl`), '')),
  pk.`twitterCard` = COALESCE(NULLIF(TRIM(pk.`twitterCard`), ''), NULLIF(TRIM(cms.`twitterCard`), '')),
  pk.`jsonLd` = COALESCE(pk.`jsonLd`, cms.`jsonLd`)
WHERE pk.`id` = @page_key_meta_id
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

UPDATE `SeoMeta`
SET `pageKey` = @slug, `cmsPageId` = NULL
WHERE `id` = @cms_meta_id
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id IS NULL;

INSERT INTO `EntityTranslation` (
  `id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `status`, `version`, `createdAt`, `updatedAt`
)
SELECT
  CONCAT('merge-seo-', REPLACE(UUID(), '-', '')),
  'SeoMeta',
  @page_key_meta_id,
  cms_t.`field`,
  cms_t.`localeCode`,
  cms_t.`value`,
  cms_t.`status`,
  1,
  NOW(3),
  NOW(3)
FROM `EntityTranslation` cms_t
WHERE cms_t.`entityType` = 'SeoMeta'
  AND cms_t.`entityId` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id
  AND NOT EXISTS (
    SELECT 1 FROM `EntityTranslation` pk_t
    WHERE pk_t.`entityType` = 'SeoMeta'
      AND pk_t.`entityId` = @page_key_meta_id
      AND pk_t.`field` = cms_t.`field`
      AND pk_t.`localeCode` = cms_t.`localeCode`
      AND NULLIF(TRIM(pk_t.`value`), '') IS NOT NULL
  );

DELETE FROM `EntityTranslation`
WHERE `entityType` = 'SeoMeta'
  AND `entityId` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

DELETE FROM `SeoMeta`
WHERE `id` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

-- slug: favorites
SET @slug = 'favorites';
SET @cms_page_id = (SELECT `id` FROM `CmsPage` WHERE `slug` = @slug LIMIT 1);
SET @cms_meta_id = (
  SELECT sm.`id` FROM `SeoMeta` sm
  WHERE sm.`cmsPageId` = @cms_page_id LIMIT 1
);
SET @page_key_meta_id = (SELECT `id` FROM `SeoMeta` WHERE `pageKey` = @slug LIMIT 1);

UPDATE `SeoMeta` pk
INNER JOIN `SeoMeta` cms ON cms.`id` = @cms_meta_id
SET
  pk.`canonicalUrl` = COALESCE(NULLIF(TRIM(pk.`canonicalUrl`), ''), NULLIF(TRIM(cms.`canonicalUrl`), '')),
  pk.`robots` = COALESCE(NULLIF(TRIM(pk.`robots`), ''), NULLIF(TRIM(cms.`robots`), '')),
  pk.`focusKeywords` = COALESCE(NULLIF(TRIM(pk.`focusKeywords`), ''), NULLIF(TRIM(cms.`focusKeywords`), '')),
  pk.`ogImageUrl` = COALESCE(NULLIF(TRIM(pk.`ogImageUrl`), ''), NULLIF(TRIM(cms.`ogImageUrl`), '')),
  pk.`twitterCard` = COALESCE(NULLIF(TRIM(pk.`twitterCard`), ''), NULLIF(TRIM(cms.`twitterCard`), '')),
  pk.`jsonLd` = COALESCE(pk.`jsonLd`, cms.`jsonLd`)
WHERE pk.`id` = @page_key_meta_id
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

UPDATE `SeoMeta`
SET `pageKey` = @slug, `cmsPageId` = NULL
WHERE `id` = @cms_meta_id
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id IS NULL;

INSERT INTO `EntityTranslation` (
  `id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `status`, `version`, `createdAt`, `updatedAt`
)
SELECT
  CONCAT('merge-seo-', REPLACE(UUID(), '-', '')),
  'SeoMeta',
  @page_key_meta_id,
  cms_t.`field`,
  cms_t.`localeCode`,
  cms_t.`value`,
  cms_t.`status`,
  1,
  NOW(3),
  NOW(3)
FROM `EntityTranslation` cms_t
WHERE cms_t.`entityType` = 'SeoMeta'
  AND cms_t.`entityId` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id
  AND NOT EXISTS (
    SELECT 1 FROM `EntityTranslation` pk_t
    WHERE pk_t.`entityType` = 'SeoMeta'
      AND pk_t.`entityId` = @page_key_meta_id
      AND pk_t.`field` = cms_t.`field`
      AND pk_t.`localeCode` = cms_t.`localeCode`
      AND NULLIF(TRIM(pk_t.`value`), '') IS NOT NULL
  );

DELETE FROM `EntityTranslation`
WHERE `entityType` = 'SeoMeta'
  AND `entityId` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

DELETE FROM `SeoMeta`
WHERE `id` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

-- slug: account
SET @slug = 'account';
SET @cms_page_id = (SELECT `id` FROM `CmsPage` WHERE `slug` = @slug LIMIT 1);
SET @cms_meta_id = (
  SELECT sm.`id` FROM `SeoMeta` sm
  WHERE sm.`cmsPageId` = @cms_page_id LIMIT 1
);
SET @page_key_meta_id = (SELECT `id` FROM `SeoMeta` WHERE `pageKey` = @slug LIMIT 1);

UPDATE `SeoMeta` pk
INNER JOIN `SeoMeta` cms ON cms.`id` = @cms_meta_id
SET
  pk.`canonicalUrl` = COALESCE(NULLIF(TRIM(pk.`canonicalUrl`), ''), NULLIF(TRIM(cms.`canonicalUrl`), '')),
  pk.`robots` = COALESCE(NULLIF(TRIM(pk.`robots`), ''), NULLIF(TRIM(cms.`robots`), '')),
  pk.`focusKeywords` = COALESCE(NULLIF(TRIM(pk.`focusKeywords`), ''), NULLIF(TRIM(cms.`focusKeywords`), '')),
  pk.`ogImageUrl` = COALESCE(NULLIF(TRIM(pk.`ogImageUrl`), ''), NULLIF(TRIM(cms.`ogImageUrl`), '')),
  pk.`twitterCard` = COALESCE(NULLIF(TRIM(pk.`twitterCard`), ''), NULLIF(TRIM(cms.`twitterCard`), '')),
  pk.`jsonLd` = COALESCE(pk.`jsonLd`, cms.`jsonLd`)
WHERE pk.`id` = @page_key_meta_id
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

UPDATE `SeoMeta`
SET `pageKey` = @slug, `cmsPageId` = NULL
WHERE `id` = @cms_meta_id
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id IS NULL;

INSERT INTO `EntityTranslation` (
  `id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `status`, `version`, `createdAt`, `updatedAt`
)
SELECT
  CONCAT('merge-seo-', REPLACE(UUID(), '-', '')),
  'SeoMeta',
  @page_key_meta_id,
  cms_t.`field`,
  cms_t.`localeCode`,
  cms_t.`value`,
  cms_t.`status`,
  1,
  NOW(3),
  NOW(3)
FROM `EntityTranslation` cms_t
WHERE cms_t.`entityType` = 'SeoMeta'
  AND cms_t.`entityId` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id
  AND NOT EXISTS (
    SELECT 1 FROM `EntityTranslation` pk_t
    WHERE pk_t.`entityType` = 'SeoMeta'
      AND pk_t.`entityId` = @page_key_meta_id
      AND pk_t.`field` = cms_t.`field`
      AND pk_t.`localeCode` = cms_t.`localeCode`
      AND NULLIF(TRIM(pk_t.`value`), '') IS NOT NULL
  );

DELETE FROM `EntityTranslation`
WHERE `entityType` = 'SeoMeta'
  AND `entityId` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

DELETE FROM `SeoMeta`
WHERE `id` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

-- slug: smart-home
SET @slug = 'smart-home';
SET @cms_page_id = (SELECT `id` FROM `CmsPage` WHERE `slug` = @slug LIMIT 1);
SET @cms_meta_id = (
  SELECT sm.`id` FROM `SeoMeta` sm
  WHERE sm.`cmsPageId` = @cms_page_id LIMIT 1
);
SET @page_key_meta_id = (SELECT `id` FROM `SeoMeta` WHERE `pageKey` = @slug LIMIT 1);

UPDATE `SeoMeta` pk
INNER JOIN `SeoMeta` cms ON cms.`id` = @cms_meta_id
SET
  pk.`canonicalUrl` = COALESCE(NULLIF(TRIM(pk.`canonicalUrl`), ''), NULLIF(TRIM(cms.`canonicalUrl`), '')),
  pk.`robots` = COALESCE(NULLIF(TRIM(pk.`robots`), ''), NULLIF(TRIM(cms.`robots`), '')),
  pk.`focusKeywords` = COALESCE(NULLIF(TRIM(pk.`focusKeywords`), ''), NULLIF(TRIM(cms.`focusKeywords`), '')),
  pk.`ogImageUrl` = COALESCE(NULLIF(TRIM(pk.`ogImageUrl`), ''), NULLIF(TRIM(cms.`ogImageUrl`), '')),
  pk.`twitterCard` = COALESCE(NULLIF(TRIM(pk.`twitterCard`), ''), NULLIF(TRIM(cms.`twitterCard`), '')),
  pk.`jsonLd` = COALESCE(pk.`jsonLd`, cms.`jsonLd`)
WHERE pk.`id` = @page_key_meta_id
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

UPDATE `SeoMeta`
SET `pageKey` = @slug, `cmsPageId` = NULL
WHERE `id` = @cms_meta_id
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id IS NULL;

INSERT INTO `EntityTranslation` (
  `id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `status`, `version`, `createdAt`, `updatedAt`
)
SELECT
  CONCAT('merge-seo-', REPLACE(UUID(), '-', '')),
  'SeoMeta',
  @page_key_meta_id,
  cms_t.`field`,
  cms_t.`localeCode`,
  cms_t.`value`,
  cms_t.`status`,
  1,
  NOW(3),
  NOW(3)
FROM `EntityTranslation` cms_t
WHERE cms_t.`entityType` = 'SeoMeta'
  AND cms_t.`entityId` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id
  AND NOT EXISTS (
    SELECT 1 FROM `EntityTranslation` pk_t
    WHERE pk_t.`entityType` = 'SeoMeta'
      AND pk_t.`entityId` = @page_key_meta_id
      AND pk_t.`field` = cms_t.`field`
      AND pk_t.`localeCode` = cms_t.`localeCode`
      AND NULLIF(TRIM(pk_t.`value`), '') IS NOT NULL
  );

DELETE FROM `EntityTranslation`
WHERE `entityType` = 'SeoMeta'
  AND `entityId` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

DELETE FROM `SeoMeta`
WHERE `id` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

-- slug: security-solutions
SET @slug = 'security-solutions';
SET @cms_page_id = (SELECT `id` FROM `CmsPage` WHERE `slug` = @slug LIMIT 1);
SET @cms_meta_id = (
  SELECT sm.`id` FROM `SeoMeta` sm
  WHERE sm.`cmsPageId` = @cms_page_id LIMIT 1
);
SET @page_key_meta_id = (SELECT `id` FROM `SeoMeta` WHERE `pageKey` = @slug LIMIT 1);

UPDATE `SeoMeta` pk
INNER JOIN `SeoMeta` cms ON cms.`id` = @cms_meta_id
SET
  pk.`canonicalUrl` = COALESCE(NULLIF(TRIM(pk.`canonicalUrl`), ''), NULLIF(TRIM(cms.`canonicalUrl`), '')),
  pk.`robots` = COALESCE(NULLIF(TRIM(pk.`robots`), ''), NULLIF(TRIM(cms.`robots`), '')),
  pk.`focusKeywords` = COALESCE(NULLIF(TRIM(pk.`focusKeywords`), ''), NULLIF(TRIM(cms.`focusKeywords`), '')),
  pk.`ogImageUrl` = COALESCE(NULLIF(TRIM(pk.`ogImageUrl`), ''), NULLIF(TRIM(cms.`ogImageUrl`), '')),
  pk.`twitterCard` = COALESCE(NULLIF(TRIM(pk.`twitterCard`), ''), NULLIF(TRIM(cms.`twitterCard`), '')),
  pk.`jsonLd` = COALESCE(pk.`jsonLd`, cms.`jsonLd`)
WHERE pk.`id` = @page_key_meta_id
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

UPDATE `SeoMeta`
SET `pageKey` = @slug, `cmsPageId` = NULL
WHERE `id` = @cms_meta_id
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id IS NULL;

INSERT INTO `EntityTranslation` (
  `id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `status`, `version`, `createdAt`, `updatedAt`
)
SELECT
  CONCAT('merge-seo-', REPLACE(UUID(), '-', '')),
  'SeoMeta',
  @page_key_meta_id,
  cms_t.`field`,
  cms_t.`localeCode`,
  cms_t.`value`,
  cms_t.`status`,
  1,
  NOW(3),
  NOW(3)
FROM `EntityTranslation` cms_t
WHERE cms_t.`entityType` = 'SeoMeta'
  AND cms_t.`entityId` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id
  AND NOT EXISTS (
    SELECT 1 FROM `EntityTranslation` pk_t
    WHERE pk_t.`entityType` = 'SeoMeta'
      AND pk_t.`entityId` = @page_key_meta_id
      AND pk_t.`field` = cms_t.`field`
      AND pk_t.`localeCode` = cms_t.`localeCode`
      AND NULLIF(TRIM(pk_t.`value`), '') IS NOT NULL
  );

DELETE FROM `EntityTranslation`
WHERE `entityType` = 'SeoMeta'
  AND `entityId` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

DELETE FROM `SeoMeta`
WHERE `id` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

-- slug: enterprise-wireless
SET @slug = 'enterprise-wireless';
SET @cms_page_id = (SELECT `id` FROM `CmsPage` WHERE `slug` = @slug LIMIT 1);
SET @cms_meta_id = (
  SELECT sm.`id` FROM `SeoMeta` sm
  WHERE sm.`cmsPageId` = @cms_page_id LIMIT 1
);
SET @page_key_meta_id = (SELECT `id` FROM `SeoMeta` WHERE `pageKey` = @slug LIMIT 1);

UPDATE `SeoMeta` pk
INNER JOIN `SeoMeta` cms ON cms.`id` = @cms_meta_id
SET
  pk.`canonicalUrl` = COALESCE(NULLIF(TRIM(pk.`canonicalUrl`), ''), NULLIF(TRIM(cms.`canonicalUrl`), '')),
  pk.`robots` = COALESCE(NULLIF(TRIM(pk.`robots`), ''), NULLIF(TRIM(cms.`robots`), '')),
  pk.`focusKeywords` = COALESCE(NULLIF(TRIM(pk.`focusKeywords`), ''), NULLIF(TRIM(cms.`focusKeywords`), '')),
  pk.`ogImageUrl` = COALESCE(NULLIF(TRIM(pk.`ogImageUrl`), ''), NULLIF(TRIM(cms.`ogImageUrl`), '')),
  pk.`twitterCard` = COALESCE(NULLIF(TRIM(pk.`twitterCard`), ''), NULLIF(TRIM(cms.`twitterCard`), '')),
  pk.`jsonLd` = COALESCE(pk.`jsonLd`, cms.`jsonLd`)
WHERE pk.`id` = @page_key_meta_id
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

UPDATE `SeoMeta`
SET `pageKey` = @slug, `cmsPageId` = NULL
WHERE `id` = @cms_meta_id
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id IS NULL;

INSERT INTO `EntityTranslation` (
  `id`, `entityType`, `entityId`, `field`, `localeCode`, `value`, `status`, `version`, `createdAt`, `updatedAt`
)
SELECT
  CONCAT('merge-seo-', REPLACE(UUID(), '-', '')),
  'SeoMeta',
  @page_key_meta_id,
  cms_t.`field`,
  cms_t.`localeCode`,
  cms_t.`value`,
  cms_t.`status`,
  1,
  NOW(3),
  NOW(3)
FROM `EntityTranslation` cms_t
WHERE cms_t.`entityType` = 'SeoMeta'
  AND cms_t.`entityId` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id
  AND NOT EXISTS (
    SELECT 1 FROM `EntityTranslation` pk_t
    WHERE pk_t.`entityType` = 'SeoMeta'
      AND pk_t.`entityId` = @page_key_meta_id
      AND pk_t.`field` = cms_t.`field`
      AND pk_t.`localeCode` = cms_t.`localeCode`
      AND NULLIF(TRIM(pk_t.`value`), '') IS NOT NULL
  );

DELETE FROM `EntityTranslation`
WHERE `entityType` = 'SeoMeta'
  AND `entityId` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

DELETE FROM `SeoMeta`
WHERE `id` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

-- ========== 13. Migrate SeoSettings.ogImageUrl → SeoMeta, drop SeoSettings ==========
SET @seo_settings_exists = (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SeoSettings'
);
SET @seo_merge_sql = IF(
  @seo_settings_exists > 0,
  'UPDATE `SeoMeta` sm INNER JOIN `SeoSettings` ss ON sm.`pageKey` = ss.`pageKey` SET sm.`ogImageUrl` = ss.`ogImageUrl` WHERE (sm.`ogImageUrl` IS NULL OR TRIM(sm.`ogImageUrl`) = '') AND ss.`ogImageUrl` IS NOT NULL AND TRIM(ss.`ogImageUrl`) <> ''',
  'SELECT 1'
);
PREPARE seo_merge_stmt FROM @seo_merge_sql;
EXECUTE seo_merge_stmt;
DEALLOCATE PREPARE seo_merge_stmt;

DROP TABLE IF EXISTS `SeoSettings`;

-- ========== CLEANUP ==========
DROP PROCEDURE IF EXISTS azura_consolidate_product;
DROP PROCEDURE IF EXISTS azura_add_index;
DROP PROCEDURE IF EXISTS azura_drop_index;
DROP PROCEDURE IF EXISTS azura_rename_column;
DROP PROCEDURE IF EXISTS azura_drop_column;
DROP PROCEDURE IF EXISTS azura_add_column;
DROP PROCEDURE IF EXISTS azura_index_exists;
DROP PROCEDURE IF EXISTS azura_column_exists;
DROP PROCEDURE IF EXISTS azura_table_exists;

SET FOREIGN_KEY_CHECKS = 1;
