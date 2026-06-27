-- AlterTable: canonical preset id (may already exist on manually migrated databases)
ALTER TABLE `SiteTheme` ADD COLUMN `siteDefaultPresetId` VARCHAR(191) NULL;

-- Backfill canonical preset id from legacy column, then sync legacy to canonical.
UPDATE `SiteTheme`
SET `siteDefaultPresetId` = `activePresetId`
WHERE `siteDefaultPresetId` IS NULL AND `activePresetId` IS NOT NULL;

UPDATE `SiteTheme`
SET `activePresetId` = `siteDefaultPresetId`
WHERE `siteDefaultPresetId` IS NOT NULL
  AND (`activePresetId` IS NULL OR `activePresetId` <> `siteDefaultPresetId`);
