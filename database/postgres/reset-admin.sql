-- AZURA — reset admin user (PostgreSQL / Supabase)
-- Only use when setup is already complete (setupComplete: true).
-- For a fresh deploy, use reset-setup.sql and run the /setup wizard instead.
--
-- Login after running:
--   Email:    admin@azura.com
--   Password: Admin123

DELETE FROM "User" WHERE "role" = 'ADMIN' OR "email" = 'admin@azura.com';

INSERT INTO "User" (
  "id",
  "email",
  "passwordHash",
  "name",
  "role",
  "marketingOptIn",
  "createdAt",
  "updatedAt"
) VALUES (
  'cmpv9625i0000hf2wf3ora99k',
  'admin@azura.com',
  '$2b$12$7sRKw6v9xxnKrM1H0uo00OgOEdDSniUFj8lQ/G52/5AU.qJYAAYNq',
  'Admin',
  'ADMIN',
  false,
  NOW(),
  NOW()
)
ON CONFLICT ("email") DO UPDATE SET
  "passwordHash" = EXCLUDED."passwordHash",
  "name" = 'Admin',
  "role" = 'ADMIN',
  "updatedAt" = NOW();
