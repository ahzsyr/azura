-- MediaAsset.assetScope was in schema/update SQL but never added via Prisma migrate.
ALTER TABLE `MediaAsset` ADD COLUMN `assetScope` VARCHAR(16) NOT NULL DEFAULT 'CMS';
CREATE INDEX `MediaAsset_assetScope_idx` ON `MediaAsset`(`assetScope`);
