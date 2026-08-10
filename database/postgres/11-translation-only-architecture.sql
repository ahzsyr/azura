-- AZURA — Translation-only architecture (Supabase / PostgreSQL)
--
-- Equivalent of prisma/migrations/20260615120000_translation_only_architecture/migration.sql
--
-- PREREQUISITES (run BEFORE this script):
--   1. npx tsx scripts/i18n/backfill-translations.ts
--   2. npx tsx scripts/i18n/migrate-products-to-translations.ts --dry-run
--   3. npx tsx scripts/i18n/migrate-products-to-translations.ts
--   4. npx tsx scripts/i18n/verify-parity.ts
--
-- Run in Supabase → SQL Editor after 01-schema.sql … 10-catalog-collection-conditions.sql
-- Uses IF EXISTS / IF NOT EXISTS where practical for safer re-runs.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Extend TranslationStatus enum (add REVIEW)
-- ---------------------------------------------------------------------------
ALTER TYPE "TranslationStatus" ADD VALUE IF NOT EXISTS 'REVIEW';

-- ---------------------------------------------------------------------------
-- 2. LocaleConfig additions
-- ---------------------------------------------------------------------------
ALTER TABLE "LocaleConfig" ADD COLUMN IF NOT EXISTS "fallbackLocaleCode" VARCHAR(16);
ALTER TABLE "LocaleConfig" ADD COLUMN IF NOT EXISTS "completionPercent" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "LocaleConfig" ADD COLUMN IF NOT EXISTS "lastTranslationSyncAt" TIMESTAMP(3);

-- ---------------------------------------------------------------------------
-- 3. Rename languageCode → localeCode; add version on EntityTranslation
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'EntityTranslation' AND column_name = 'languageCode'
  ) THEN
    ALTER TABLE "EntityTranslation" RENAME COLUMN "languageCode" TO "localeCode";
  END IF;
END $$;

ALTER TABLE "EntityTranslation" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'LocalizedSlug' AND column_name = 'languageCode'
  ) THEN
    ALTER TABLE "LocalizedSlug" RENAME COLUMN "languageCode" TO "localeCode";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'UiMessage' AND column_name = 'languageCode'
  ) THEN
    ALTER TABLE "UiMessage" RENAME COLUMN "languageCode" TO "localeCode";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'TranslationJob' AND column_name = 'languageCode'
  ) THEN
    ALTER TABLE "TranslationJob" RENAME COLUMN "languageCode" TO "localeCode";
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Drop legacy En/Ar columns
-- ---------------------------------------------------------------------------
ALTER TABLE "Gallery"
  DROP COLUMN IF EXISTS "titleEn", DROP COLUMN IF EXISTS "titleAr",
  DROP COLUMN IF EXISTS "excerptEn", DROP COLUMN IF EXISTS "excerptAr",
  DROP COLUMN IF EXISTS "descriptionEn", DROP COLUMN IF EXISTS "descriptionAr",
  DROP COLUMN IF EXISTS "infoEn", DROP COLUMN IF EXISTS "infoAr";

ALTER TABLE "GalleryMedia"
  DROP COLUMN IF EXISTS "titleEn", DROP COLUMN IF EXISTS "titleAr",
  DROP COLUMN IF EXISTS "excerptEn", DROP COLUMN IF EXISTS "excerptAr",
  DROP COLUMN IF EXISTS "descriptionEn", DROP COLUMN IF EXISTS "descriptionAr",
  DROP COLUMN IF EXISTS "infoEn", DROP COLUMN IF EXISTS "infoAr";

ALTER TABLE "Testimonial"
  DROP COLUMN IF EXISTS "contentEn", DROP COLUMN IF EXISTS "contentAr";

ALTER TABLE "TestimonialCollection"
  DROP COLUMN IF EXISTS "titleEn", DROP COLUMN IF EXISTS "titleAr",
  DROP COLUMN IF EXISTS "excerptEn", DROP COLUMN IF EXISTS "excerptAr";

ALTER TABLE "FaqSet"
  DROP COLUMN IF EXISTS "titleEn", DROP COLUMN IF EXISTS "titleAr",
  DROP COLUMN IF EXISTS "excerptEn", DROP COLUMN IF EXISTS "excerptAr",
  DROP COLUMN IF EXISTS "descriptionEn", DROP COLUMN IF EXISTS "descriptionAr";

ALTER TABLE "FaqItem"
  DROP COLUMN IF EXISTS "questionEn", DROP COLUMN IF EXISTS "questionAr",
  DROP COLUMN IF EXISTS "answerEn", DROP COLUMN IF EXISTS "answerAr";

ALTER TABLE "CompanyInfo"
  DROP COLUMN IF EXISTS "taglineEn", DROP COLUMN IF EXISTS "taglineAr",
  DROP COLUMN IF EXISTS "storyEn", DROP COLUMN IF EXISTS "storyAr",
  DROP COLUMN IF EXISTS "missionEn", DROP COLUMN IF EXISTS "missionAr",
  DROP COLUMN IF EXISTS "visionEn", DROP COLUMN IF EXISTS "visionAr",
  DROP COLUMN IF EXISTS "valuesEn", DROP COLUMN IF EXISTS "valuesAr",
  DROP COLUMN IF EXISTS "addressEn", DROP COLUMN IF EXISTS "addressAr",
  DROP COLUMN IF EXISTS "officeHoursEn", DROP COLUMN IF EXISTS "officeHoursAr";

ALTER TABLE "SeoSettings"
  DROP COLUMN IF EXISTS "titleEn", DROP COLUMN IF EXISTS "titleAr",
  DROP COLUMN IF EXISTS "descriptionEn", DROP COLUMN IF EXISTS "descriptionAr";

ALTER TABLE "MediaAsset"
  DROP COLUMN IF EXISTS "altEn", DROP COLUMN IF EXISTS "altAr";

ALTER TABLE "CmsPage"
  DROP COLUMN IF EXISTS "titleEn", DROP COLUMN IF EXISTS "titleAr",
  DROP COLUMN IF EXISTS "excerptEn", DROP COLUMN IF EXISTS "excerptAr";

ALTER TABLE "PostCategory"
  DROP COLUMN IF EXISTS "nameEn", DROP COLUMN IF EXISTS "nameAr";

ALTER TABLE "PostTag"
  DROP COLUMN IF EXISTS "nameEn", DROP COLUMN IF EXISTS "nameAr";

ALTER TABLE "PostAuthor"
  DROP COLUMN IF EXISTS "bioEn", DROP COLUMN IF EXISTS "bioAr";

ALTER TABLE "Post"
  DROP COLUMN IF EXISTS "titleEn", DROP COLUMN IF EXISTS "titleAr",
  DROP COLUMN IF EXISTS "excerptEn", DROP COLUMN IF EXISTS "excerptAr",
  DROP COLUMN IF EXISTS "contentEn", DROP COLUMN IF EXISTS "contentAr";

ALTER TABLE "SeoMeta"
  DROP COLUMN IF EXISTS "titleEn", DROP COLUMN IF EXISTS "titleAr",
  DROP COLUMN IF EXISTS "descriptionEn", DROP COLUMN IF EXISTS "descriptionAr",
  DROP COLUMN IF EXISTS "ogTitleEn", DROP COLUMN IF EXISTS "ogTitleAr";

ALTER TABLE "Custom404"
  DROP COLUMN IF EXISTS "titleEn", DROP COLUMN IF EXISTS "titleAr",
  DROP COLUMN IF EXISTS "bodyEn", DROP COLUMN IF EXISTS "bodyAr";

ALTER TABLE "ContentType"
  DROP COLUMN IF EXISTS "nameEn", DROP COLUMN IF EXISTS "nameAr",
  DROP COLUMN IF EXISTS "labelSingularEn", DROP COLUMN IF EXISTS "labelSingularAr",
  DROP COLUMN IF EXISTS "labelPluralEn", DROP COLUMN IF EXISTS "labelPluralAr";

ALTER TABLE "ContentCollection"
  DROP COLUMN IF EXISTS "nameEn", DROP COLUMN IF EXISTS "nameAr",
  DROP COLUMN IF EXISTS "excerptEn", DROP COLUMN IF EXISTS "excerptAr";

ALTER TABLE "ContentItem"
  DROP COLUMN IF EXISTS "titleEn", DROP COLUMN IF EXISTS "titleAr",
  DROP COLUMN IF EXISTS "excerptEn", DROP COLUMN IF EXISTS "excerptAr",
  DROP COLUMN IF EXISTS "descriptionEn", DROP COLUMN IF EXISTS "descriptionAr";

ALTER TABLE "ContentItemMedia"
  DROP COLUMN IF EXISTS "altEn", DROP COLUMN IF EXISTS "altAr",
  DROP COLUMN IF EXISTS "captionEn", DROP COLUMN IF EXISTS "captionAr";

ALTER TABLE "PricingPlanSet"
  DROP COLUMN IF EXISTS "titleEn", DROP COLUMN IF EXISTS "titleAr",
  DROP COLUMN IF EXISTS "descriptionEn", DROP COLUMN IF EXISTS "descriptionAr";

ALTER TABLE "PricingPlan"
  DROP COLUMN IF EXISTS "nameEn", DROP COLUMN IF EXISTS "nameAr",
  DROP COLUMN IF EXISTS "descriptionEn", DROP COLUMN IF EXISTS "descriptionAr",
  DROP COLUMN IF EXISTS "badgeEn", DROP COLUMN IF EXISTS "badgeAr",
  DROP COLUMN IF EXISTS "ctaLabelEn", DROP COLUMN IF EXISTS "ctaLabelAr";

ALTER TABLE "PricingPlanFeature"
  DROP COLUMN IF EXISTS "labelEn", DROP COLUMN IF EXISTS "labelAr";

ALTER TABLE "ReleaseSet"
  DROP COLUMN IF EXISTS "titleEn", DROP COLUMN IF EXISTS "titleAr",
  DROP COLUMN IF EXISTS "descriptionEn", DROP COLUMN IF EXISTS "descriptionAr";

ALTER TABLE "ReleaseEntry"
  DROP COLUMN IF EXISTS "textEn", DROP COLUMN IF EXISTS "textAr";

ALTER TABLE "PricingCalculator"
  DROP COLUMN IF EXISTS "titleEn", DROP COLUMN IF EXISTS "titleAr",
  DROP COLUMN IF EXISTS "descriptionEn", DROP COLUMN IF EXISTS "descriptionAr";

ALTER TABLE "PricingCalculatorField"
  DROP COLUMN IF EXISTS "labelEn", DROP COLUMN IF EXISTS "labelAr";

ALTER TABLE "KnowledgeBase"
  DROP COLUMN IF EXISTS "titleEn", DROP COLUMN IF EXISTS "titleAr",
  DROP COLUMN IF EXISTS "descriptionEn", DROP COLUMN IF EXISTS "descriptionAr";

ALTER TABLE "KnowledgeCategory"
  DROP COLUMN IF EXISTS "titleEn", DROP COLUMN IF EXISTS "titleAr";

ALTER TABLE "KnowledgeArticle"
  DROP COLUMN IF EXISTS "titleEn", DROP COLUMN IF EXISTS "titleAr",
  DROP COLUMN IF EXISTS "excerptEn", DROP COLUMN IF EXISTS "excerptAr",
  DROP COLUMN IF EXISTS "bodyEn", DROP COLUMN IF EXISTS "bodyAr";

ALTER TABLE "DocPortal"
  DROP COLUMN IF EXISTS "titleEn", DROP COLUMN IF EXISTS "titleAr",
  DROP COLUMN IF EXISTS "descriptionEn", DROP COLUMN IF EXISTS "descriptionAr";

ALTER TABLE "DocVersion"
  DROP COLUMN IF EXISTS "labelEn", DROP COLUMN IF EXISTS "labelAr";

ALTER TABLE "DocSection"
  DROP COLUMN IF EXISTS "titleEn", DROP COLUMN IF EXISTS "titleAr",
  DROP COLUMN IF EXISTS "contentEn", DROP COLUMN IF EXISTS "contentAr";

ALTER TABLE "StatusBoard"
  DROP COLUMN IF EXISTS "titleEn", DROP COLUMN IF EXISTS "titleAr",
  DROP COLUMN IF EXISTS "descriptionEn", DROP COLUMN IF EXISTS "descriptionAr";

ALTER TABLE "StatusService"
  DROP COLUMN IF EXISTS "nameEn", DROP COLUMN IF EXISTS "nameAr",
  DROP COLUMN IF EXISTS "descriptionEn", DROP COLUMN IF EXISTS "descriptionAr";

ALTER TABLE "StatusIncident"
  DROP COLUMN IF EXISTS "titleEn", DROP COLUMN IF EXISTS "titleAr",
  DROP COLUMN IF EXISTS "messageEn", DROP COLUMN IF EXISTS "messageAr";

ALTER TABLE "StatusMaintenance"
  DROP COLUMN IF EXISTS "titleEn", DROP COLUMN IF EXISTS "titleAr",
  DROP COLUMN IF EXISTS "messageEn", DROP COLUMN IF EXISTS "messageAr";

ALTER TABLE "TeamDirectory"
  DROP COLUMN IF EXISTS "titleEn", DROP COLUMN IF EXISTS "titleAr",
  DROP COLUMN IF EXISTS "descriptionEn", DROP COLUMN IF EXISTS "descriptionAr";

ALTER TABLE "TeamDepartment"
  DROP COLUMN IF EXISTS "nameEn", DROP COLUMN IF EXISTS "nameAr";

ALTER TABLE "TeamMember"
  DROP COLUMN IF EXISTS "nameEn", DROP COLUMN IF EXISTS "nameAr",
  DROP COLUMN IF EXISTS "roleEn", DROP COLUMN IF EXISTS "roleAr",
  DROP COLUMN IF EXISTS "bioEn", DROP COLUMN IF EXISTS "bioAr",
  DROP COLUMN IF EXISTS "locationEn", DROP COLUMN IF EXISTS "locationAr";

ALTER TABLE "PartnerProgram"
  DROP COLUMN IF EXISTS "titleEn", DROP COLUMN IF EXISTS "titleAr",
  DROP COLUMN IF EXISTS "descriptionEn", DROP COLUMN IF EXISTS "descriptionAr";

ALTER TABLE "PartnerCategory"
  DROP COLUMN IF EXISTS "nameEn", DROP COLUMN IF EXISTS "nameAr";

ALTER TABLE "Partner"
  DROP COLUMN IF EXISTS "nameEn", DROP COLUMN IF EXISTS "nameAr",
  DROP COLUMN IF EXISTS "descriptionEn", DROP COLUMN IF EXISTS "descriptionAr",
  DROP COLUMN IF EXISTS "locationEn", DROP COLUMN IF EXISTS "locationAr";

-- ---------------------------------------------------------------------------
-- 5. CatalogCollection — drop name/description + locale overrides table
-- ---------------------------------------------------------------------------
ALTER TABLE "CatalogCollection"
  DROP COLUMN IF EXISTS "name",
  DROP COLUMN IF EXISTS "description";

DROP TABLE IF EXISTS "CatalogCollectionLocale";

-- ---------------------------------------------------------------------------
-- 6. Product consolidation (one row per product, canonicalSlug)
-- ---------------------------------------------------------------------------
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "canonicalSlug" VARCHAR(255);

UPDATE "Product"
SET "canonicalSlug" = "slug"
WHERE "canonicalSlug" IS NULL AND "slug" IS NOT NULL;

UPDATE "Product"
SET "canonicalSlug" = "id"
WHERE "canonicalSlug" IS NULL OR "canonicalSlug" = '';

ALTER TABLE "Product" ALTER COLUMN "canonicalSlug" SET NOT NULL;

DROP INDEX IF EXISTS "Product_locale_slug_key";
DROP INDEX IF EXISTS "Product_locale_idx";
DROP INDEX IF EXISTS "Product_locale_brand_idx";
DROP INDEX IF EXISTS "Product_locale_category_idx";
DROP INDEX IF EXISTS "Product_locale_status_idx";
DROP INDEX IF EXISTS "Product_locale_stockStatus_idx";
DROP INDEX IF EXISTS "Product_locale_priceValue_idx";

ALTER TABLE "Product" DROP COLUMN IF EXISTS "locale";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "slug";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "productTitle";

CREATE UNIQUE INDEX IF NOT EXISTS "Product_canonicalSlug_key"
  ON "Product" ("canonicalSlug");

CREATE UNIQUE INDEX IF NOT EXISTS "Product_sku_key"
  ON "Product" ("sku");

CREATE INDEX IF NOT EXISTS "Product_canonicalSlug_idx"
  ON "Product" ("canonicalSlug");

CREATE INDEX IF NOT EXISTS "Product_brand_idx"
  ON "Product" ("brand");

CREATE INDEX IF NOT EXISTS "Product_category_idx"
  ON "Product" ("category");

CREATE INDEX IF NOT EXISTS "Product_status_idx"
  ON "Product" ("status");

CREATE INDEX IF NOT EXISTS "Product_stockStatus_idx"
  ON "Product" ("stockStatus");

CREATE INDEX IF NOT EXISTS "Product_priceValue_idx"
  ON "Product" ("priceValue");

-- ---------------------------------------------------------------------------
-- 7. New tables: UiMessageVersion, TranslationMemory
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "UiMessageVersion" (
    "id"        TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "value"     TEXT NOT NULL,
    "status"    "TranslationStatus" NOT NULL,
    "changedBy" VARCHAR(36),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UiMessageVersion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UiMessageVersion_messageId_createdAt_idx"
  ON "UiMessageVersion" ("messageId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UiMessageVersion_messageId_fkey'
  ) THEN
    ALTER TABLE "UiMessageVersion"
      ADD CONSTRAINT "UiMessageVersion_messageId_fkey"
      FOREIGN KEY ("messageId") REFERENCES "UiMessage" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "TranslationMemory" (
    "id"           TEXT NOT NULL,
    "sourceLocale" VARCHAR(16) NOT NULL,
    "targetLocale" VARCHAR(16) NOT NULL,
    "sourceHash"   VARCHAR(64) NOT NULL,
    "sourceText"   TEXT NOT NULL,
    "targetText"   TEXT NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TranslationMemory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TranslationMemory_sourceHash_targetLocale_key"
  ON "TranslationMemory" ("sourceHash", "targetLocale");

CREATE INDEX IF NOT EXISTS "TranslationMemory_sourceLocale_targetLocale_idx"
  ON "TranslationMemory" ("sourceLocale", "targetLocale");

COMMIT;

-- ---------------------------------------------------------------------------
-- 8. Verify (optional)
-- ---------------------------------------------------------------------------
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('EntityTranslation', 'Product', 'LocaleConfig')
ORDER BY table_name, ordinal_position;
