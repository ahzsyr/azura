-- Optional per-page / per-post display of author and publish date.
-- Defaults to true so existing published content keeps current appearance.

ALTER TABLE `CmsPage`
    ADD COLUMN `showAuthor` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `showPublishedAt` BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE `Post`
    ADD COLUMN `showAuthor` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `showPublishedAt` BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE `ContentItem`
    ADD COLUMN `showAuthor` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `showPublishedAt` BOOLEAN NOT NULL DEFAULT true;
