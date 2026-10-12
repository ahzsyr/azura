-- Installer ledger for apps, extensions, and themes.
-- One database is one installation. Package SQL is recorded separately from Prisma migrations.

CREATE TABLE `PackageInstallation` (
  `packageId` VARCHAR(64) NOT NULL,
  `kind` VARCHAR(16) NOT NULL,
  `version` VARCHAR(32) NOT NULL,
  `status` VARCHAR(16) NOT NULL,
  `manifest` JSON NOT NULL,
  `installedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `PackageInstallation_status_idx`(`status`),
  PRIMARY KEY (`packageId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PackageMigration` (
  `id` VARCHAR(191) NOT NULL,
  `packageId` VARCHAR(64) NOT NULL,
  `version` VARCHAR(32) NOT NULL,
  `filename` VARCHAR(255) NOT NULL,
  `checksum` VARCHAR(64) NOT NULL,
  `direction` VARCHAR(8) NOT NULL,
  `appliedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `PackageMigration_packageId_idx`(`packageId`),
  UNIQUE INDEX `PackageMigration_packageId_filename_direction_key`(`packageId`, `filename`, `direction`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PackageMigration`
  ADD CONSTRAINT `PackageMigration_packageId_fkey`
  FOREIGN KEY (`packageId`) REFERENCES `PackageInstallation`(`packageId`)
  ON DELETE CASCADE ON UPDATE CASCADE;
