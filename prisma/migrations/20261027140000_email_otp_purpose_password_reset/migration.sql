-- Ensure EmailOtpToken.purpose includes password-reset and login-MFA codes.
-- Older installs only had SIGNUP_VERIFY + ADMIN_LOGIN; without these values,
-- password-reset OTP inserts fail and the UI advances with no mail sent.
ALTER TABLE `EmailOtpToken`
  MODIFY COLUMN `purpose` ENUM('SIGNUP_VERIFY', 'ADMIN_LOGIN', 'PASSWORD_RESET', 'LOGIN_MFA') NOT NULL;
