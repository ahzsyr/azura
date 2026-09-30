-- Email OTP tokens for signup verify + admin login (5-minute hashed codes)
CREATE TABLE IF NOT EXISTS `EmailOtpToken` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `purpose` ENUM('SIGNUP_VERIFY', 'ADMIN_LOGIN') NOT NULL,
  `codeHash` VARCHAR(64) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `usedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `EmailOtpToken_userId_purpose_idx`(`userId`, `purpose`),
  INDEX `EmailOtpToken_expiresAt_idx`(`expiresAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- FK best-effort (may already exist on re-run via IF NOT EXISTS table only)
-- Applied separately in deploy patch when missing.
