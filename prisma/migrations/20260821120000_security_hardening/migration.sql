-- Security hardening (MySQL / Hostinger): sessionVersion, MFA, media visibility, rate limits, audit, SUPER_ADMIN

-- User session + MFA columns (idempotent via migrate history; patches also guard)
ALTER TABLE `User` ADD COLUMN `sessionVersion` INT NOT NULL DEFAULT 0;
ALTER TABLE `User` ADD COLUMN `totpSecret` TEXT NULL;
ALTER TABLE `User` ADD COLUMN `totpEnabled` BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE `MediaAsset` ADD COLUMN `visibility` ENUM('PUBLIC', 'GATED', 'PRIVATE') NOT NULL DEFAULT 'PUBLIC';

CREATE TABLE `MfaRecoveryCode` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `codeHash` VARCHAR(64) NOT NULL,
  `usedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `MfaRecoveryCode_userId_idx`(`userId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `MfaRecoveryCode`
  ADD CONSTRAINT `MfaRecoveryCode_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `RateLimitBucket` (
  `id` VARCHAR(191) NOT NULL,
  `bucketKey` VARCHAR(191) NOT NULL,
  `windowStart` DATETIME(3) NOT NULL,
  `count` INT NOT NULL DEFAULT 0,
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `RateLimitBucket_bucketKey_key`(`bucketKey`),
  INDEX `RateLimitBucket_windowStart_idx`(`windowStart`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SecurityAuditLog` (
  `id` VARCHAR(191) NOT NULL,
  `action` VARCHAR(64) NOT NULL,
  `actorId` VARCHAR(36) NULL,
  `actorRole` VARCHAR(32) NULL,
  `ip` VARCHAR(64) NULL,
  `meta` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `SecurityAuditLog_action_createdAt_idx`(`action`, `createdAt`),
  INDEX `SecurityAuditLog_actorId_createdAt_idx`(`actorId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Extend role enum + default new users to CUSTOMER (existing rows keep their role)
ALTER TABLE `User`
  MODIFY COLUMN `role` ENUM('ADMIN', 'CUSTOMER', 'SUPER_ADMIN') NOT NULL DEFAULT 'CUSTOMER';
