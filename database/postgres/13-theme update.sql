ALTER TABLE "SiteTheme"
  ADD COLUMN "siteDefaultPresetId" TEXT,
  ADD COLUMN "themeProvenance" JSONB NOT NULL DEFAULT '{}'::jsonb;