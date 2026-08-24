-- AZURA — Catalog Collection tables for Supabase (PostgreSQL)
--
-- Run in Supabase → SQL Editor after 04-catalog-products-table.sql.
-- Safe to re-run: uses IF NOT EXISTS for table, columns, and indexes.
--
-- Prisma models: CatalogCollection, CatalogCollectionLocale

-- ---------------------------------------------------------------------------
-- 1. Create tables (no-op if already present)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "CatalogCollection" (
    "id"          TEXT         NOT NULL,
    "slug"        VARCHAR(128) NOT NULL,
    "name"        TEXT         NOT NULL,
    "description" TEXT,
    "parentSlug"  VARCHAR(128),
    "sortOrder"   INTEGER      NOT NULL DEFAULT 0,
    "visible"     BOOLEAN      NOT NULL DEFAULT true,
    "conditions" JSONB        NOT NULL DEFAULT '{}'::jsonb,
    "metadata"    JSONB        NOT NULL DEFAULT '{}'::jsonb,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatalogCollection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CatalogCollectionLocale" (
    "id"           TEXT        NOT NULL,
    "collectionId" TEXT        NOT NULL,
    "locale"       VARCHAR(10) NOT NULL,
    "overrides"    JSONB       NOT NULL DEFAULT '{}'::jsonb,

    CONSTRAINT "CatalogCollectionLocale_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- 2. Add any missing columns (for partial / older tables)
-- ---------------------------------------------------------------------------
ALTER TABLE "CatalogCollection" ADD COLUMN IF NOT EXISTS "slug"        VARCHAR(128) NOT NULL DEFAULT '';
ALTER TABLE "CatalogCollection" ADD COLUMN IF NOT EXISTS "name"        TEXT         NOT NULL DEFAULT '';
ALTER TABLE "CatalogCollection" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "CatalogCollection" ADD COLUMN IF NOT EXISTS "parentSlug"  VARCHAR(128);
ALTER TABLE "CatalogCollection" ADD COLUMN IF NOT EXISTS "sortOrder"   INTEGER      NOT NULL DEFAULT 0;
ALTER TABLE "CatalogCollection" ADD COLUMN IF NOT EXISTS "visible"     BOOLEAN      NOT NULL DEFAULT true;
ALTER TABLE "CatalogCollection" ADD COLUMN IF NOT EXISTS "conditions" JSONB        NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE "CatalogCollection" ADD COLUMN IF NOT EXISTS "metadata"    JSONB        NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE "CatalogCollection" ADD COLUMN IF NOT EXISTS "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "CatalogCollection" ADD COLUMN IF NOT EXISTS "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "CatalogCollectionLocale" ADD COLUMN IF NOT EXISTS "collectionId" TEXT        NOT NULL DEFAULT '';
ALTER TABLE "CatalogCollectionLocale" ADD COLUMN IF NOT EXISTS "locale"       VARCHAR(10) NOT NULL DEFAULT '';
ALTER TABLE "CatalogCollectionLocale" ADD COLUMN IF NOT EXISTS "overrides"    JSONB       NOT NULL DEFAULT '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- 3. Foreign key (add only if missing)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'CatalogCollectionLocale_collectionId_fkey'
    ) THEN
        ALTER TABLE "CatalogCollectionLocale"
            ADD CONSTRAINT "CatalogCollectionLocale_collectionId_fkey"
            FOREIGN KEY ("collectionId") REFERENCES "CatalogCollection" ("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Indexes
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS "CatalogCollection_slug_key"
    ON "CatalogCollection" ("slug");

CREATE INDEX IF NOT EXISTS "CatalogCollection_parentSlug_idx"
    ON "CatalogCollection" ("parentSlug");

CREATE INDEX IF NOT EXISTS "CatalogCollection_visible_idx"
    ON "CatalogCollection" ("visible");

CREATE UNIQUE INDEX IF NOT EXISTS "CatalogCollectionLocale_collectionId_locale_key"
    ON "CatalogCollectionLocale" ("collectionId", "locale");

CREATE INDEX IF NOT EXISTS "CatalogCollectionLocale_locale_idx"
    ON "CatalogCollectionLocale" ("locale");

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
  AND table_name = 'CatalogCollection'
ORDER BY ordinal_position;
