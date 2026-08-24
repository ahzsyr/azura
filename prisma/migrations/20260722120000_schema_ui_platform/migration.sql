-- Schema UI platform: interaction events + submission entity refs

ALTER TABLE `FormSubmission`
  ADD COLUMN `pipelineType` VARCHAR(64) NULL,
  ADD COLUMN `assigneeId` VARCHAR(36) NULL,
  ADD COLUMN `tags` JSON NOT NULL DEFAULT ('[]'),
  ADD COLUMN `customerId` VARCHAR(36) NULL,
  ADD COLUMN `companyId` VARCHAR(36) NULL,
  ADD COLUMN `campaignId` VARCHAR(36) NULL,
  ADD COLUMN `metadata` JSON NOT NULL DEFAULT ('{}');

CREATE INDEX `FormSubmission_assigneeId_idx` ON `FormSubmission`(`assigneeId`);
CREATE INDEX `FormSubmission_pipelineType_idx` ON `FormSubmission`(`pipelineType`);

CREATE TABLE `InteractionEvent` (
  `id` VARCHAR(191) NOT NULL,
  `aggregateId` VARCHAR(36) NOT NULL,
  `type` VARCHAR(64) NOT NULL,
  `payload` JSON NOT NULL DEFAULT ('{}'),
  `metadata` JSON NOT NULL DEFAULT ('{}'),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `InteractionEvent_aggregateId_createdAt_idx`(`aggregateId`, `createdAt`),
  INDEX `InteractionEvent_type_createdAt_idx`(`type`, `createdAt`),
  CONSTRAINT `InteractionEvent_aggregateId_fkey` FOREIGN KEY (`aggregateId`) REFERENCES `FormSubmission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
