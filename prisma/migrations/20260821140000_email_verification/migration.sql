-- P2 account lifecycle: email verification + pending email change
ALTER TABLE `User` ADD COLUMN `emailVerifiedAt` DATETIME(3) NULL;
ALTER TABLE `User` ADD COLUMN `pendingEmail` VARCHAR(191) NULL;

-- Grandfather existing accounts as verified
UPDATE `User` SET `emailVerifiedAt` = `createdAt` WHERE `emailVerifiedAt` IS NULL;

CREATE TABLE `EmailVerificationToken` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `purpose` ENUM('SIGNUP_VERIFY', 'EMAIL_CHANGE') NOT NULL,
  `tokenHash` VARCHAR(191) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `usedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `EmailVerificationToken_userId_purpose_idx`(`userId`, `purpose`),
  INDEX `EmailVerificationToken_expiresAt_idx`(`expiresAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `EmailVerificationToken`
  ADD CONSTRAINT `EmailVerificationToken_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
