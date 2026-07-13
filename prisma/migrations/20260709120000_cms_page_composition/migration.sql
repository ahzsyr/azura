-- Layout Engine: versioned page composition JSON (regions, layout type, settings)
ALTER TABLE `CmsPage` ADD COLUMN `composition` JSON NOT NULL DEFAULT ('{}');
ALTER TABLE `CmsPageRevision` ADD COLUMN `composition` JSON NOT NULL DEFAULT ('{}');
