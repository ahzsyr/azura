-- P3 admin lifecycle: mustChangePassword, AdminInviteToken, promote oldest ADMIN to SUPER_ADMIN
ALTER TABLE `User` ADD COLUMN `mustChangePassword` BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE `AdminInviteToken` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `tokenHash` VARCHAR(191) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `usedAt` DATETIME(3) NULL,
  `invitedById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `AdminInviteToken_userId_idx`(`userId`),
  INDEX `AdminInviteToken_expiresAt_idx`(`expiresAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `AdminInviteToken`
  ADD CONSTRAINT `AdminInviteToken_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Promote oldest ADMIN to SUPER_ADMIN when none exists
UPDATE `User`
SET `role` = 'SUPER_ADMIN'
WHERE `id` = (
  SELECT `id` FROM (
    SELECT `id` FROM `User`
    WHERE `role` = 'ADMIN'
    ORDER BY `createdAt` ASC
    LIMIT 1
  ) AS `oldest`
)
AND NOT EXISTS (
  SELECT 1 FROM (
    SELECT `id` FROM `User` WHERE `role` = 'SUPER_ADMIN' LIMIT 1
  ) AS `existing_super`
);
