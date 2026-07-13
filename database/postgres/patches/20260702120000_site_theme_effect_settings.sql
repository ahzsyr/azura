-- Idempotent patch for existing PostgreSQL databases (SiteTheme effect tuning columns).
-- Also applied automatically by scripts/deploy/prisma-migrate-deploy.mjs on deploy.

ALTER TABLE "SiteTheme" ADD COLUMN IF NOT EXISTS "cursorEffectSettings" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "SiteTheme" ADD COLUMN IF NOT EXISTS "textEffectSettings" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "SiteTheme" ADD COLUMN IF NOT EXISTS "motionSettings" JSONB NOT NULL DEFAULT '{}';
