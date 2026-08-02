-- AlterTable
ALTER TABLE `SiteTheme` ADD COLUMN `cursorEffectSettings` JSON NOT NULL DEFAULT ('{}');
ALTER TABLE `SiteTheme` ADD COLUMN `textEffectSettings` JSON NOT NULL DEFAULT ('{}');
ALTER TABLE `SiteTheme` ADD COLUMN `motionSettings` JSON NOT NULL DEFAULT ('{}');
