#!/usr/bin/env node
/**
 * Generate database/mysql/update-existing-to-current.sql
 *
 * Idempotent ALTER/CREATE script for MySQL databases created from an older
 * import-blank / 01-schema baseline (legacy *En/*Ar columns, SeoSettings, UiMessage).
 *
 * Usage: node scripts/database/assemble-mysql-update-existing.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SCHEMA = join(ROOT, "database/mysql/01-schema.sql");
const OUT = join(ROOT, "database/mysql/update-existing-to-current.sql");

function extractCreateTable(schema, tableName) {
  const re = new RegExp(
    `-- CreateTable\\s+CREATE TABLE \`${tableName}\` \\([\\s\\S]*?\\) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
  );
  const m = schema.match(re);
  if (!m) throw new Error(`CREATE TABLE \`${tableName}\` not found in 01-schema.sql`);
  return m[0].replace(/^-- CreateTable\s+/, "");
}

function createIfNotExists(createSql) {
  return createSql.replace(/^CREATE TABLE `/, "CREATE TABLE IF NOT EXISTS `");
}

const schema = readFileSync(SCHEMA, "utf-8");

const newTables = [
  "Product",
  "CatalogCollection",
  "SiteSettings",
  "SearchAnalyticsSnapshot",
  "TranslationMemory",
  "SeoSubmissionJob",
  "SeoRunnerLock",
  "SeoProviderTelemetry",
  "SeoHealthSnapshot",
  "SeoCrawlIssue",
  "SeoSearchMetric",
  "SeoRichResultIssue",
];

const createBlocks = newTables
  .map((t) => `-- ${t}\n${createIfNotExists(extractCreateTable(schema, t))}`)
  .join("\n\n");

const legacyDropColumns = {
  Gallery: [
    "titleEn",
    "titleAr",
    "excerptEn",
    "excerptAr",
    "descriptionEn",
    "descriptionAr",
    "infoEn",
    "infoAr",
  ],
  GalleryMedia: [
    "titleEn",
    "titleAr",
    "excerptEn",
    "excerptAr",
    "descriptionEn",
    "descriptionAr",
    "infoEn",
    "infoAr",
  ],
  Testimonial: ["contentEn", "contentAr"],
  TestimonialCollection: ["titleEn", "titleAr", "excerptEn", "excerptAr"],
  FaqSet: [
    "titleEn",
    "titleAr",
    "excerptEn",
    "excerptAr",
    "descriptionEn",
    "descriptionAr",
  ],
  FaqItem: ["questionEn", "questionAr", "answerEn", "answerAr"],
  CompanyInfo: [
    "taglineEn",
    "taglineAr",
    "storyEn",
    "storyAr",
    "missionEn",
    "missionAr",
    "visionEn",
    "visionAr",
    "valuesEn",
    "valuesAr",
    "addressEn",
    "addressAr",
    "officeHoursEn",
    "officeHoursAr",
  ],
  SeoSettings: ["titleEn", "titleAr", "descriptionEn", "descriptionAr"],
  MediaAsset: ["altEn", "altAr"],
  CmsPage: ["titleEn", "titleAr", "excerptEn", "excerptAr"],
  PostCategory: ["nameEn", "nameAr"],
  PostTag: ["nameEn", "nameAr"],
  PostAuthor: ["bioEn", "bioAr"],
  Post: ["titleEn", "titleAr", "excerptEn", "excerptAr", "contentEn", "contentAr"],
  SeoMeta: [
    "titleEn",
    "titleAr",
    "descriptionEn",
    "descriptionAr",
    "ogTitleEn",
    "ogTitleAr",
  ],
  Custom404: ["titleEn", "titleAr", "bodyEn", "bodyAr"],
  ContentType: [
    "nameEn",
    "nameAr",
    "labelSingularEn",
    "labelSingularAr",
    "labelPluralEn",
    "labelPluralAr",
  ],
  ContentCollection: ["nameEn", "nameAr", "excerptEn", "excerptAr"],
  ContentItem: [
    "titleEn",
    "titleAr",
    "excerptEn",
    "excerptAr",
    "descriptionEn",
    "descriptionAr",
  ],
  ContentItemMedia: ["altEn", "altAr", "captionEn", "captionAr"],
  PricingPlanSet: ["titleEn", "titleAr", "descriptionEn", "descriptionAr"],
  PricingPlan: [
    "nameEn",
    "nameAr",
    "descriptionEn",
    "descriptionAr",
    "badgeEn",
    "badgeAr",
    "ctaLabelEn",
    "ctaLabelAr",
  ],
  PricingPlanFeature: ["labelEn", "labelAr"],
  ReleaseSet: ["titleEn", "titleAr", "descriptionEn", "descriptionAr"],
  ReleaseEntry: ["textEn", "textAr"],
  PricingCalculator: ["titleEn", "titleAr", "descriptionEn", "descriptionAr"],
  PricingCalculatorField: ["labelEn", "labelAr"],
  KnowledgeBase: ["titleEn", "titleAr", "descriptionEn", "descriptionAr"],
  KnowledgeCategory: ["titleEn", "titleAr"],
  KnowledgeArticle: [
    "titleEn",
    "titleAr",
    "excerptEn",
    "excerptAr",
    "bodyEn",
    "bodyAr",
  ],
  DocPortal: ["titleEn", "titleAr", "descriptionEn", "descriptionAr"],
  DocVersion: ["labelEn", "labelAr"],
  DocSection: ["titleEn", "titleAr", "contentEn", "contentAr"],
  StatusBoard: ["titleEn", "titleAr", "descriptionEn", "descriptionAr"],
  StatusService: ["nameEn", "nameAr", "descriptionEn", "descriptionAr"],
  StatusIncident: ["titleEn", "titleAr", "messageEn", "messageAr"],
  StatusMaintenance: ["titleEn", "titleAr", "messageEn", "messageAr"],
  TeamDirectory: ["titleEn", "titleAr", "descriptionEn", "descriptionAr"],
  TeamDepartment: ["nameEn", "nameAr"],
  TeamMember: [
    "nameEn",
    "nameAr",
    "roleEn",
    "roleAr",
    "bioEn",
    "bioAr",
    "locationEn",
    "locationAr",
  ],
  PartnerProgram: ["titleEn", "titleAr", "descriptionEn", "descriptionAr"],
  PartnerCategory: ["nameEn", "nameAr"],
  Partner: [
    "nameEn",
    "nameAr",
    "descriptionEn",
    "descriptionAr",
    "locationEn",
    "locationAr",
  ],
  CatalogCollection: ["name", "description"],
};

const dropColumnCalls = Object.entries(legacyDropColumns)
  .flatMap(([table, cols]) =>
    cols.map((col) => `CALL azura_drop_column('${table}', '${col}');`),
  )
  .join("\n");

const wiredSeoSlugs = [
  "home",
  "about",
  "contact",
  "packages",
  "gallery",
  "testimonials",
  "hotels-transport",
  "products",
  "collections",
  "services",
  "compare",
  "favorites",
  "account",
  "smart-home",
  "security-solutions",
  "enterprise-wireless",
];

const mergeSeoBlocks = wiredSeoSlugs
  .map(
    (slug) => `
-- slug: ${slug}
SET @slug = '${slug}';
SET @cms_page_id = (SELECT \`id\` FROM \`CmsPage\` WHERE \`slug\` = @slug LIMIT 1);
SET @cms_meta_id = (
  SELECT sm.\`id\` FROM \`SeoMeta\` sm
  WHERE sm.\`cmsPageId\` = @cms_page_id LIMIT 1
);
SET @page_key_meta_id = (SELECT \`id\` FROM \`SeoMeta\` WHERE \`pageKey\` = @slug LIMIT 1);

UPDATE \`SeoMeta\` pk
INNER JOIN \`SeoMeta\` cms ON cms.\`id\` = @cms_meta_id
SET
  pk.\`canonicalUrl\` = COALESCE(NULLIF(TRIM(pk.\`canonicalUrl\`), ''), NULLIF(TRIM(cms.\`canonicalUrl\`), '')),
  pk.\`robots\` = COALESCE(NULLIF(TRIM(pk.\`robots\`), ''), NULLIF(TRIM(cms.\`robots\`), '')),
  pk.\`focusKeywords\` = COALESCE(NULLIF(TRIM(pk.\`focusKeywords\`), ''), NULLIF(TRIM(cms.\`focusKeywords\`), '')),
  pk.\`ogImageUrl\` = COALESCE(NULLIF(TRIM(pk.\`ogImageUrl\`), ''), NULLIF(TRIM(cms.\`ogImageUrl\`), '')),
  pk.\`twitterCard\` = COALESCE(NULLIF(TRIM(pk.\`twitterCard\`), ''), NULLIF(TRIM(cms.\`twitterCard\`), '')),
  pk.\`jsonLd\` = COALESCE(pk.\`jsonLd\`, cms.\`jsonLd\`)
WHERE pk.\`id\` = @page_key_meta_id
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

UPDATE \`SeoMeta\`
SET \`pageKey\` = @slug, \`cmsPageId\` = NULL
WHERE \`id\` = @cms_meta_id
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id IS NULL;

INSERT INTO \`EntityTranslation\` (
  \`id\`, \`entityType\`, \`entityId\`, \`field\`, \`localeCode\`, \`value\`, \`status\`, \`version\`, \`createdAt\`, \`updatedAt\`
)
SELECT
  CONCAT('merge-seo-', REPLACE(UUID(), '-', '')),
  'SeoMeta',
  @page_key_meta_id,
  cms_t.\`field\`,
  cms_t.\`localeCode\`,
  cms_t.\`value\`,
  cms_t.\`status\`,
  1,
  NOW(3),
  NOW(3)
FROM \`EntityTranslation\` cms_t
WHERE cms_t.\`entityType\` = 'SeoMeta'
  AND cms_t.\`entityId\` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id
  AND NOT EXISTS (
    SELECT 1 FROM \`EntityTranslation\` pk_t
    WHERE pk_t.\`entityType\` = 'SeoMeta'
      AND pk_t.\`entityId\` = @page_key_meta_id
      AND pk_t.\`field\` = cms_t.\`field\`
      AND pk_t.\`localeCode\` = cms_t.\`localeCode\`
      AND NULLIF(TRIM(pk_t.\`value\`), '') IS NOT NULL
  );

DELETE FROM \`EntityTranslation\`
WHERE \`entityType\` = 'SeoMeta'
  AND \`entityId\` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;

DELETE FROM \`SeoMeta\`
WHERE \`id\` = @cms_meta_id
  AND @page_key_meta_id IS NOT NULL
  AND @cms_meta_id IS NOT NULL
  AND @page_key_meta_id <> @cms_meta_id;`,
  )
  .join("\n");

const sql = `-- AZURA — MySQL upgrade: existing database → current schema
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
    SET @sql = CONCAT('ALTER TABLE \`', p_table, '\` ADD COLUMN \`', p_column, '\` ', p_def);
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
    SET @sql = CONCAT('ALTER TABLE \`', p_table, '\` DROP COLUMN \`', p_column, '\`');
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
      'ALTER TABLE \`', p_table, '\` CHANGE COLUMN \`', p_old, '\` \`', p_new, '\` ', p_def
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
    SET @sql = CONCAT('ALTER TABLE \`', p_table, '\` DROP INDEX \`', p_index, '\`');
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
      'ALTER TABLE \`', p_table, '\` ADD ',
      IF(p_unique = 1, 'UNIQUE ', ''),
      'INDEX \`', p_index, '\`(', p_cols, ')'
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
      SET @sql = 'UPDATE \`Product\` SET \`canonicalSlug\` = \`slug\` WHERE \`canonicalSlug\` IS NULL AND \`slug\` IS NOT NULL';
      PREPARE stmt FROM @sql;
      EXECUTE stmt;
      DEALLOCATE PREPARE stmt;
      SET @sql = 'UPDATE \`Product\` SET \`canonicalSlug\` = \`id\` WHERE \`canonicalSlug\` IS NULL OR \`canonicalSlug\` = ''''';
      PREPARE stmt FROM @sql;
      EXECUTE stmt;
      DEALLOCATE PREPARE stmt;
      SET @sql = 'ALTER TABLE \`Product\` MODIFY \`canonicalSlug\` VARCHAR(255) NOT NULL';
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
      CALL azura_add_index('Product', 'Product_canonicalSlug_key', '\`canonicalSlug\`', 1);
      CALL azura_add_index('Product', 'Product_sku_key', '\`sku\`', 1);
      CALL azura_add_index('Product', 'Product_canonicalSlug_idx', '\`canonicalSlug\`', 0);
      CALL azura_add_index('Product', 'Product_brand_idx', '\`brand\`', 0);
      CALL azura_add_index('Product', 'Product_category_idx', '\`category\`', 0);
      CALL azura_add_index('Product', 'Product_status_idx', '\`status\`', 0);
      CALL azura_add_index('Product', 'Product_stockStatus_idx', '\`stockStatus\`', 0);
      CALL azura_add_index('Product', 'Product_priceValue_idx', '\`priceValue\`', 0);
    END IF;
  END IF;
END$$

DELIMITER ;

-- ========== 1. NEW TABLES (current shape) ==========
${createBlocks}

-- ========== 2. CatalogCollection rules → conditions ==========
CALL azura_rename_column('CatalogCollection', 'rules', 'conditions', 'JSON NOT NULL');
UPDATE \`CatalogCollection\` SET \`conditions\` = JSON_OBJECT() WHERE \`conditions\` IS NULL;

-- ========== 3. MediaAsset.assetScope ==========
CALL azura_add_column('MediaAsset', 'assetScope', "VARCHAR(16) NOT NULL DEFAULT 'CMS'");
CALL azura_add_index('MediaAsset', 'MediaAsset_assetScope_idx', '\`assetScope\`', 0);

-- ========== 4. SiteTheme preset / effects ==========
CALL azura_add_column('SiteTheme', 'backgroundEffectSettings', "JSON NOT NULL DEFAULT (JSON_OBJECT())");
CALL azura_add_column('SiteTheme', 'siteDefaultPresetId', 'VARCHAR(191) NULL');
CALL azura_add_column('SiteTheme', 'themeProvenance', "JSON NOT NULL DEFAULT (JSON_OBJECT())");

UPDATE \`SiteTheme\`
SET \`siteDefaultPresetId\` = \`activePresetId\`
WHERE \`siteDefaultPresetId\` IS NULL AND \`activePresetId\` IS NOT NULL;

UPDATE \`SiteTheme\`
SET \`activePresetId\` = \`siteDefaultPresetId\`
WHERE \`siteDefaultPresetId\` IS NOT NULL
  AND (\`activePresetId\` IS NULL OR \`activePresetId\` <> \`siteDefaultPresetId\`);

-- ========== 5. SiteSettings.publishedVersion ==========
CALL azura_add_column('SiteSettings', 'publishedVersion', 'INTEGER NOT NULL DEFAULT 0');

-- ========== 6. SearchDocument entity types + index ==========
UPDATE \`SearchDocument\` SET \`entityType\` = 'CONTENT_ITEM' WHERE \`entityType\` IN ('PACKAGE', 'HOTEL', 'SERVICE');

ALTER TABLE \`SearchDocument\` MODIFY COLUMN \`entityType\` ENUM(
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

CALL azura_add_index('SearchDocument', 'SearchDocument_locale_entityType_idx', '\`locale\`, \`entityType\`', 0);

-- ========== 7. Search FULLTEXT (mysql-schema-extras) ==========
SET @ft_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'SearchDocument'
    AND INDEX_NAME = 'SearchDocument_fulltext_idx'
);
SET @ft_sql = IF(
  @ft_exists = 0,
  'CREATE FULLTEXT INDEX \`SearchDocument_fulltext_idx\` ON \`SearchDocument\`(\`title\`, \`body\`)',
  'SELECT 1'
);
PREPARE ft_stmt FROM @ft_sql;
EXECUTE ft_stmt;
DEALLOCATE PREPARE ft_stmt;

-- ========== 8. LocaleConfig + translation columns ==========
CALL azura_add_column('LocaleConfig', 'fallbackLocaleCode', 'VARCHAR(16) NULL');
CALL azura_add_column('LocaleConfig', 'completionPercent', 'INT NOT NULL DEFAULT 0');
CALL azura_add_column('LocaleConfig', 'lastTranslationSyncAt', 'DATETIME(3) NULL');

ALTER TABLE \`EntityTranslation\` MODIFY \`status\` ENUM('DRAFT', 'REVIEW', 'PUBLISHED') NOT NULL DEFAULT 'PUBLISHED';
ALTER TABLE \`EntityTranslationVersion\` MODIFY \`status\` ENUM('DRAFT', 'REVIEW', 'PUBLISHED') NOT NULL;

CALL azura_rename_column('EntityTranslation', 'languageCode', 'localeCode', 'VARCHAR(16) NOT NULL');
CALL azura_add_column('EntityTranslation', 'version', 'INT NOT NULL DEFAULT 1');
CALL azura_rename_column('LocalizedSlug', 'languageCode', 'localeCode', 'VARCHAR(16) NOT NULL');
CALL azura_rename_column('TranslationJob', 'languageCode', 'localeCode', 'VARCHAR(16) NOT NULL');

-- UiMessage may exist on old DB; rename before drop in section 12
CALL azura_rename_column('UiMessage', 'languageCode', 'localeCode', 'VARCHAR(16) NOT NULL');

-- ========== 9. Product consolidation (locale/slug → canonicalSlug) ==========
CALL azura_consolidate_product();

-- ========== 10. Drop legacy bilingual columns ==========
${dropColumnCalls}

DROP TABLE IF EXISTS \`CatalogCollectionLocale\`;

-- ========== 11. Drop UiMessage (strings moved to messages/*.json) ==========
DROP TABLE IF EXISTS \`UiMessageVersion\`;
DROP TABLE IF EXISTS \`UiMessage\`;

-- ========== 12. Merge wired SeoMeta rows (pageKey vs cmsPageId) ==========
${mergeSeoBlocks}

-- ========== 13. Migrate SeoSettings.ogImageUrl → SeoMeta, drop SeoSettings ==========
SET @seo_settings_exists = (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SeoSettings'
);
SET @seo_merge_sql = IF(
  @seo_settings_exists > 0,
  'UPDATE \`SeoMeta\` sm INNER JOIN \`SeoSettings\` ss ON sm.\`pageKey\` = ss.\`pageKey\` SET sm.\`ogImageUrl\` = ss.\`ogImageUrl\` WHERE (sm.\`ogImageUrl\` IS NULL OR TRIM(sm.\`ogImageUrl\`) = \'\') AND ss.\`ogImageUrl\` IS NOT NULL AND TRIM(ss.\`ogImageUrl\`) <> \'\'',
  'SELECT 1'
);
PREPARE seo_merge_stmt FROM @seo_merge_sql;
EXECUTE seo_merge_stmt;
DEALLOCATE PREPARE seo_merge_stmt;

DROP TABLE IF EXISTS \`SeoSettings\`;

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
`;

writeFileSync(OUT, sql);
console.log(`Wrote ${OUT}`);
