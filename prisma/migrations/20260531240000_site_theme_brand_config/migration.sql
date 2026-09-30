-- AlterTable
ALTER TABLE `SiteTheme` ADD COLUMN `brandConfig` JSON NOT NULL;

UPDATE `SiteTheme` SET `brandConfig` = JSON_OBJECT() WHERE `brandConfig` IS NULL;
