-- Installation-wide module and preset enablement.
-- Locales share these rows. There is no site id.

CREATE TABLE `SiteFeature` (
  `kind` VARCHAR(16) NOT NULL,
  `featureId` VARCHAR(64) NOT NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT true,
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`kind`, `featureId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
