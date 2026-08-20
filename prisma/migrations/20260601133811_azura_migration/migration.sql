-- AlterTable
ALTER TABLE `contentitem` MODIFY `excerptEn` TEXT NOT NULL DEFAULT (''),
    MODIFY `excerptAr` TEXT NOT NULL DEFAULT (''),
    MODIFY `descriptionEn` TEXT NOT NULL DEFAULT (''),
    MODIFY `descriptionAr` TEXT NOT NULL DEFAULT ('');

-- AlterTable
ALTER TABLE `contentitemmedia` MODIFY `captionEn` TEXT NOT NULL DEFAULT (''),
    MODIFY `captionAr` TEXT NOT NULL DEFAULT ('');

-- AlterTable
ALTER TABLE `faqset` MODIFY `descriptionEn` TEXT NOT NULL DEFAULT (''),
    MODIFY `descriptionAr` TEXT NOT NULL DEFAULT ('');

-- AlterTable
ALTER TABLE `gallery` MODIFY `descriptionEn` TEXT NOT NULL DEFAULT (''),
    MODIFY `descriptionAr` TEXT NOT NULL DEFAULT ('');

-- AlterTable
ALTER TABLE `gallerymedia` MODIFY `descriptionEn` TEXT NOT NULL DEFAULT (''),
    MODIFY `descriptionAr` TEXT NOT NULL DEFAULT ('');

-- AlterTable
ALTER TABLE `localeconfig` MODIFY `flag` VARCHAR(191) NOT NULL DEFAULT '🌐';
