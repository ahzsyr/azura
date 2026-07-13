-- Backfill canonical preset id from legacy column, then sync legacy to canonical.
UPDATE "SiteTheme"
SET "siteDefaultPresetId" = "activePresetId"
WHERE "siteDefaultPresetId" IS NULL AND "activePresetId" IS NOT NULL;

UPDATE "SiteTheme"
SET "activePresetId" = "siteDefaultPresetId"
WHERE "siteDefaultPresetId" IS NOT NULL
  AND ("activePresetId" IS NULL OR "activePresetId" <> "siteDefaultPresetId");
