-- Layout Engine: composition JSON for blog posts and catalog content items
ALTER TABLE `Post` ADD COLUMN `composition` JSON NOT NULL DEFAULT ('{}');
ALTER TABLE `ContentItem` ADD COLUMN `composition` JSON NOT NULL DEFAULT ('{}');
ALTER TABLE `ContentItemRevision` ADD COLUMN `composition` JSON NOT NULL DEFAULT ('{}');
