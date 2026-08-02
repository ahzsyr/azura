-- Form behavior analytics events (separate from operational InteractionEvent stream)

CREATE TABLE `FormBehaviorEvent` (
  `id` VARCHAR(191) NOT NULL,
  `schemaId` VARCHAR(36) NOT NULL,
  `sessionId` VARCHAR(64) NULL,
  `bindingId` VARCHAR(64) NULL,
  `type` VARCHAR(64) NOT NULL,
  `payload` JSON NOT NULL DEFAULT ('{}'),
  `metadata` JSON NOT NULL DEFAULT ('{}'),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `FormBehaviorEvent_schemaId_createdAt_idx`(`schemaId`, `createdAt`),
  INDEX `FormBehaviorEvent_type_createdAt_idx`(`type`, `createdAt`),
  INDEX `FormBehaviorEvent_sessionId_idx`(`sessionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
