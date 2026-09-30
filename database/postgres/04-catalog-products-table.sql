-- AZURA — Catalog Product table for Supabase (PostgreSQL)
--
-- Hybrid storage:
--   • SQL columns — listing filters, sort, search
--   • payload JSONB — full converter/import product document
--
-- Run in Supabase → SQL Editor after 01-schema.sql (or on an existing project).
-- Safe to re-run: uses IF NOT EXISTS for table, columns, and indexes.
--
-- Prisma model: prisma/schema.prisma → model Product
-- App flag: CATALOG_PRODUCTS_SOURCE=db

-- ---------------------------------------------------------------------------
-- 1. Create table (no-op if already present)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Product" (
    "id"              TEXT         NOT NULL,
    "locale"          VARCHAR(10)  NOT NULL DEFAULT 'en-us',
    "slug"            VARCHAR(255) NOT NULL,

    "productTitle"    TEXT         NOT NULL,
    "sku"             VARCHAR(64),

    "priceValue"      DECIMAL(12, 2),
    "priceCurrency"   VARCHAR(3),

    "availability"    VARCHAR(32),
    "stockStatus"     VARCHAR(32),

    "brand"           VARCHAR(128),
    "category"        VARCHAR(128),
    "categories"      JSONB,
    "tags"            JSONB,

    "collectionSlugs" JSONB,

    "status"          VARCHAR(32)  NOT NULL DEFAULT 'published',
    "sourceType"      VARCHAR(16),
    "sourceFile"      VARCHAR(512),

    "payload"         JSONB        NOT NULL,

    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- 2. Add any missing columns (for partial / older tables)
-- ---------------------------------------------------------------------------
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "locale"          VARCHAR(10)  NOT NULL DEFAULT 'en-us';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "slug"            VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "productTitle"    TEXT         NOT NULL DEFAULT '';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sku"             VARCHAR(64);
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "priceValue"      DECIMAL(12, 2);
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "priceCurrency"   VARCHAR(3);
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "availability"    VARCHAR(32);
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "stockStatus"     VARCHAR(32);
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "brand"           VARCHAR(128);
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "category"        VARCHAR(128);
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "categories"      JSONB;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "tags"            JSONB;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "collectionSlugs" JSONB;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "status"          VARCHAR(32)  NOT NULL DEFAULT 'published';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sourceType"      VARCHAR(16);
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sourceFile"      VARCHAR(512);
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "payload"         JSONB        NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ---------------------------------------------------------------------------
-- 3. Indexes
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS "Product_locale_slug_key"
    ON "Product" ("locale", "slug");

CREATE INDEX IF NOT EXISTS "Product_slug_idx"
    ON "Product" ("slug");

CREATE INDEX IF NOT EXISTS "Product_locale_idx"
    ON "Product" ("locale");

CREATE INDEX IF NOT EXISTS "Product_locale_brand_idx"
    ON "Product" ("locale", "brand");

CREATE INDEX IF NOT EXISTS "Product_locale_category_idx"
    ON "Product" ("locale", "category");

CREATE INDEX IF NOT EXISTS "Product_locale_status_idx"
    ON "Product" ("locale", "status");

CREATE INDEX IF NOT EXISTS "Product_locale_stockStatus_idx"
    ON "Product" ("locale", "stockStatus");

CREATE INDEX IF NOT EXISTS "Product_locale_priceValue_idx"
    ON "Product" ("locale", "priceValue");

-- ---------------------------------------------------------------------------
-- 4. Optional: JSONB path indexes for common payload queries
--    (uncomment if you filter inside payload in raw SQL)
-- ---------------------------------------------------------------------------
-- CREATE INDEX IF NOT EXISTS "Product_payload_getic_uid_idx"
--     ON "Product" (("payload"->>'getic_uid'));
--
-- CREATE INDEX IF NOT EXISTS "Product_payload_catalog_id_idx"
--     ON "Product" (("payload"->>'id'));

-- ---------------------------------------------------------------------------
-- 5. Verify
-- ---------------------------------------------------------------------------
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'Product'
ORDER BY ordinal_position;
