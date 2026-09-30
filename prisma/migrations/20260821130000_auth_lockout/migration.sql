-- P1 auth security: account disable + temporary lockout counters
ALTER TABLE `User` ADD COLUMN `disabledAt` DATETIME(3) NULL;
ALTER TABLE `User` ADD COLUMN `lockedUntil` DATETIME(3) NULL;
ALTER TABLE `User` ADD COLUMN `failedLoginCount` INT NOT NULL DEFAULT 0;
