-- AZURA — force setup wizard (PostgreSQL / Supabase one-time fix)
-- Run in Supabase SQL Editor after deploying code that trusts JsonStore setupComplete.
-- Then visit the site — you should land on /setup and create the admin via the wizard.

UPDATE "JsonStore"
SET "data" = '{"setupComplete":false,"comingSoonEnabled":false,"registrationEnabled":true}'::jsonb
WHERE "namespace" = 'settings' AND "key" = 'system';

DELETE FROM "User" WHERE "role" = 'ADMIN';
