-- AlterTable
ALTER TABLE `SiteTheme` ADD COLUMN `cursorEffectEnabled` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `backgroundEffectEnabled` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `textEffectEnabled` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `cardStyle` VARCHAR(191) NULL,
    ADD COLUMN `borderStyle` VARCHAR(191) NULL;
