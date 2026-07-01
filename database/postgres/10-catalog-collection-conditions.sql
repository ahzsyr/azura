-- AZURA — Align CatalogCollection.rules -> conditions (PostgreSQL / Supabase)
--
-- Run in Supabase → SQL Editor after 05-catalog-collections.sql.
-- Safe to re-run.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'CatalogCollection'
          AND column_name = 'rules'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'CatalogCollection'
          AND column_name = 'conditions'
    ) THEN
        ALTER TABLE "CatalogCollection" RENAME COLUMN "rules" TO "conditions";
    END IF;
END $$;

ALTER TABLE "CatalogCollection"
    ALTER COLUMN "conditions" SET DEFAULT '{}'::jsonb;

UPDATE "CatalogCollection"
SET "conditions" = '{}'::jsonb
WHERE "conditions" IS NULL;

ALTER TABLE "CatalogCollection"
    ALTER COLUMN "conditions" SET NOT NULL;
