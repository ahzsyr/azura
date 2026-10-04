-- Canonical MediaAsset storage identity (Phase 4)
-- storageBackend + bucket + objectKey is authoritative; url is denormalized.

ALTER TABLE `MediaAsset`
  ADD COLUMN `storageBackend` VARCHAR(16) NOT NULL DEFAULT 'local',
  ADD COLUMN `bucket` VARCHAR(128) NOT NULL DEFAULT 'local',
  ADD COLUMN `objectKey` VARCHAR(512) NOT NULL DEFAULT '';

-- Local /uploads/... URLs
UPDATE `MediaAsset`
SET
  `storageBackend` = 'local',
  `bucket` = 'local',
  `objectKey` = TRIM(LEADING '/' FROM SUBSTRING(`url`, LENGTH('/uploads/') + 1))
WHERE `url` LIKE '/uploads/%'
  AND (`objectKey` = '' OR `objectKey` IS NULL);

-- Supabase public object URLs
UPDATE `MediaAsset`
SET
  `storageBackend` = 'supabase',
  `bucket` = SUBSTRING_INDEX(SUBSTRING_INDEX(`url`, '/storage/v1/object/public/', -1), '/', 1),
  `objectKey` = SUBSTRING(
    SUBSTRING_INDEX(`url`, '/storage/v1/object/public/', -1),
    LOCATE('/', SUBSTRING_INDEX(`url`, '/storage/v1/object/public/', -1)) + 1
  )
WHERE `url` LIKE '%/storage/v1/object/public/%'
  AND (`objectKey` = '' OR `objectKey` IS NULL);

-- Unparseable legacy rows: unique placeholder keyed by id
UPDATE `MediaAsset`
SET
  `storageBackend` = IF(`storageBackend` = '', 'local', `storageBackend`),
  `bucket` = IF(`bucket` = '', 'local', `bucket`),
  `objectKey` = CONCAT('legacy/', `id`)
WHERE `objectKey` = '' OR `objectKey` IS NULL;

-- Widen url for long CDN URLs
ALTER TABLE `MediaAsset`
  MODIFY COLUMN `url` TEXT NOT NULL;

CREATE UNIQUE INDEX `MediaAsset_storageBackend_bucket_objectKey_key`
  ON `MediaAsset`(`storageBackend`, `bucket`, `objectKey`);
