-- Form template publish snapshots + per-schema admin permissions

ALTER TABLE `FormTemplate`
  ADD COLUMN `publishedVersion` INT NULL,
  ADD COLUMN `allowedAdminIds` JSON NOT NULL DEFAULT ('[]');

CREATE TABLE `FormTemplateSnapshot` (
  `id` VARCHAR(191) NOT NULL,
  `templateId` VARCHAR(191) NOT NULL,
  `version` INT NOT NULL,
  `label` VARCHAR(128) NULL,
  `definition` JSON NOT NULL,
  `publishedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdById` VARCHAR(36) NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `FormTemplateSnapshot_templateId_version_key`(`templateId`, `version`),
  INDEX `FormTemplateSnapshot_templateId_publishedAt_idx`(`templateId`, `publishedAt`),
  CONSTRAINT `FormTemplateSnapshot_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `FormTemplate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
