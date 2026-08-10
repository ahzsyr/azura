-- Ensure SiteSettings exists (table was historically created outside migrations).
CREATE TABLE IF NOT EXISTS `SiteSettings` (
    `locale` VARCHAR(10) NOT NULL,
    `payload` JSON NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `publishedVersion` INTEGER NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`locale`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add column on older databases that already have the table without it.
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'SiteSettings'
    AND COLUMN_NAME = 'publishedVersion'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE `SiteSettings` ADD COLUMN `publishedVersion` INTEGER NOT NULL DEFAULT 0',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
