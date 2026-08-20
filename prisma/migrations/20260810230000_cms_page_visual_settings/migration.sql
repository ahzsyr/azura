-- CmsPage.visualSettings was in schema/seed SQL but never added via Prisma migrate.
ALTER TABLE `CmsPage` ADD COLUMN `visualSettings` JSON NOT NULL DEFAULT ('{}');
