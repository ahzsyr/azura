-- Login OTP delivery channel (email / sms / whatsapp).
-- Existing rows were all email codes, so the column defaults to 'email'.
ALTER TABLE `EmailOtpToken` ADD COLUMN `channel` VARCHAR(16) NOT NULL DEFAULT 'email';
