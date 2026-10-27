-- Per-user MFA method + password-reset / login-MFA one-time codes.
--
-- Kept as a separate, self-contained migration on purpose. Two things here
-- change Prisma enum types, and Prisma's generated client is checked against
-- *all* enums declared in the schema; adding the same values in a second place
-- would make one of the two edits redundant. If `prisma validate` reports the
-- enum is already up to date, delete that line from prisma/schema/mysql/enums.prisma.

-- Per-user second factor. Existing authenticator enrollments are kept: the
-- legacy `totpEnabled` flag is mapped onto the new method column so no admin
-- loses their factor.
ALTER TABLE `User` ADD COLUMN `mfaMethod` ENUM('AUTHENTICATOR', 'EMAIL_OTP') NULL;
ALTER TABLE `User` ADD COLUMN `mfaEnrolledAt` DATETIME(3) NULL;
ALTER TABLE `User` ADD COLUMN `mfaDisabledByAdminAt` DATETIME(3) NULL;

UPDATE `User`
SET `mfaMethod` = 'AUTHENTICATOR', `mfaEnrolledAt` = COALESCE(`updatedAt`, NOW(3))
WHERE `totpEnabled` = true;

-- Password-reset / login-MFA purposes (idempotent with later ensure script).
ALTER TABLE `EmailOtpToken`
  MODIFY COLUMN `purpose` ENUM('SIGNUP_VERIFY', 'ADMIN_LOGIN', 'PASSWORD_RESET', 'LOGIN_MFA') NOT NULL;
