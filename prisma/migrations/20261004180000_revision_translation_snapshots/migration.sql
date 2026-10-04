-- Immutable EntityTranslation snapshots on CMS revisions (Phase 3 Content i18n)

ALTER TABLE `CmsPageRevision`
  ADD COLUMN `translations` JSON NOT NULL DEFAULT ('[]');

ALTER TABLE `PostRevision`
  ADD COLUMN `translations` JSON NOT NULL DEFAULT ('[]');

ALTER TABLE `ContentItemRevision`
  ADD COLUMN `translations` JSON NOT NULL DEFAULT ('[]');
