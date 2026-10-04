-- Dual revision pointers + PostRevision (Phase 2 CMS architecture)

ALTER TABLE `CmsPage`
  ADD COLUMN `workingRevisionId` VARCHAR(191) NULL,
  ADD COLUMN `publishedRevisionId` VARCHAR(191) NULL;

CREATE INDEX `CmsPage_workingRevisionId_idx` ON `CmsPage`(`workingRevisionId`);
CREATE INDEX `CmsPage_publishedRevisionId_idx` ON `CmsPage`(`publishedRevisionId`);

ALTER TABLE `Post`
  ADD COLUMN `workingRevisionId` VARCHAR(191) NULL,
  ADD COLUMN `publishedRevisionId` VARCHAR(191) NULL;

CREATE INDEX `Post_workingRevisionId_idx` ON `Post`(`workingRevisionId`);
CREATE INDEX `Post_publishedRevisionId_idx` ON `Post`(`publishedRevisionId`);

CREATE TABLE `PostRevision` (
  `id` VARCHAR(191) NOT NULL,
  `postId` VARCHAR(191) NOT NULL,
  `version` INTEGER NOT NULL,
  `blocks` JSON NOT NULL,
  `composition` JSON NOT NULL,
  `message` VARCHAR(191) NULL,
  `createdById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `PostRevision_postId_idx` ON `PostRevision`(`postId`);

ALTER TABLE `PostRevision`
  ADD CONSTRAINT `PostRevision_postId_fkey`
    FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PostRevision`
  ADD CONSTRAINT `PostRevision_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `ContentItem`
  ADD COLUMN `workingRevisionId` VARCHAR(191) NULL,
  ADD COLUMN `publishedRevisionId` VARCHAR(191) NULL;

CREATE INDEX `ContentItem_workingRevisionId_idx` ON `ContentItem`(`workingRevisionId`);
CREATE INDEX `ContentItem_publishedRevisionId_idx` ON `ContentItem`(`publishedRevisionId`);

-- Backfill: working = latest revision; published = latest when entity is PUBLISHED
UPDATE `CmsPage` p
SET
  `workingRevisionId` = (
    SELECT r.`id` FROM `CmsPageRevision` r
    WHERE r.`pageId` = p.`id`
    ORDER BY r.`version` DESC
    LIMIT 1
  ),
  `publishedRevisionId` = CASE
    WHEN p.`status` = 'PUBLISHED' THEN (
      SELECT r.`id` FROM `CmsPageRevision` r
      WHERE r.`pageId` = p.`id`
      ORDER BY r.`version` DESC
      LIMIT 1
    )
    ELSE NULL
  END
WHERE EXISTS (SELECT 1 FROM `CmsPageRevision` r WHERE r.`pageId` = p.`id`);

UPDATE `ContentItem` i
SET
  `workingRevisionId` = (
    SELECT r.`id` FROM `ContentItemRevision` r
    WHERE r.`itemId` = i.`id`
    ORDER BY r.`version` DESC
    LIMIT 1
  ),
  `publishedRevisionId` = CASE
    WHEN i.`status` = 'PUBLISHED' THEN (
      SELECT r.`id` FROM `ContentItemRevision` r
      WHERE r.`itemId` = i.`id`
      ORDER BY r.`version` DESC
      LIMIT 1
    )
    ELSE NULL
  END
WHERE EXISTS (SELECT 1 FROM `ContentItemRevision` r WHERE r.`itemId` = i.`id`);
