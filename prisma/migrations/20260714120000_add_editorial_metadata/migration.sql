-- Add editorial metadata fields: authorId + sources to CmsPage, Post, and ContentItem
-- authorId references the shared PostAuthor model

-- AlterTable: CmsPage
ALTER TABLE `CmsPage` ADD COLUMN `authorId` VARCHAR(191) NULL;
ALTER TABLE `CmsPage` ADD COLUMN `sources` JSON NOT NULL DEFAULT ('[]');

-- AddForeignKey: CmsPage.authorId -> PostAuthor.id
ALTER TABLE `CmsPage` ADD CONSTRAINT `CmsPage_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `PostAuthor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: Post
ALTER TABLE `Post` ADD COLUMN `sources` JSON NOT NULL DEFAULT ('[]');

-- AlterTable: ContentItem
ALTER TABLE `ContentItem` ADD COLUMN `authorId` VARCHAR(36) NULL;
ALTER TABLE `ContentItem` ADD COLUMN `sources` JSON NOT NULL DEFAULT ('[]');

-- AddForeignKey: ContentItem.authorId -> PostAuthor.id
ALTER TABLE `ContentItem` ADD CONSTRAINT `ContentItem_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `PostAuthor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
