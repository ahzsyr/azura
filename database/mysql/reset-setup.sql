-- AZURA — force setup wizard (MySQL one-time fix)
-- Run in phpMyAdmin after deploying code that trusts JsonStore setupComplete.
-- Then visit the site — you should land on /setup and create the admin via the wizard.

UPDATE `JsonStore`
SET `data` = '{"setupComplete":false,"comingSoonEnabled":false,"registrationEnabled":true}'
WHERE `namespace` = 'settings' AND `key` = 'system';

DELETE FROM `User` WHERE `role` = 'ADMIN';
