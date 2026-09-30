-- MySQL security hardening companion (idempotent safety net for Hostinger)
-- Prefer: prisma migrate deploy via hostinger-start / prestart (migration 20260821120000_security_hardening)
-- This file mirrors the same changes for manual SQL if needed.

ALTER TABLE `User` ADD COLUMN `sessionVersion` INT NOT NULL DEFAULT 0;
ALTER TABLE `User` ADD COLUMN `totpSecret` TEXT NULL;
ALTER TABLE `User` ADD COLUMN `totpEnabled` BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE `MediaAsset` ADD COLUMN `visibility` ENUM('PUBLIC','GATED','PRIVATE') NOT NULL DEFAULT 'PUBLIC';

CREATE TABLE IF NOT EXISTS `MfaRecoveryCode` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `codeHash` VARCHAR(64) NOT NULL,
  `usedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `MfaRecoveryCode_userId_idx` (`userId`),
  CONSTRAINT `MfaRecoveryCode_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `RateLimitBucket` (
  `id` VARCHAR(191) NOT NULL,
  `bucketKey` VARCHAR(191) NOT NULL,
  `windowStart` DATETIME(3) NOT NULL,
  `count` INT NOT NULL DEFAULT 0,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `RateLimitBucket_bucketKey_key` (`bucketKey`),
  INDEX `RateLimitBucket_windowStart_idx` (`windowStart`)
);

CREATE TABLE IF NOT EXISTS `SecurityAuditLog` (
  `id` VARCHAR(191) NOT NULL,
  `action` VARCHAR(64) NOT NULL,
  `actorId` VARCHAR(36) NULL,
  `actorRole` VARCHAR(32) NULL,
  `ip` VARCHAR(64) NULL,
  `meta` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `SecurityAuditLog_action_createdAt_idx` (`action`, `createdAt`),
  INDEX `SecurityAuditLog_actorId_createdAt_idx` (`actorId`, `createdAt`)
);

ALTER TABLE `User` MODIFY `role` ENUM('ADMIN','CUSTOMER','SUPER_ADMIN') NOT NULL DEFAULT 'CUSTOMER';
