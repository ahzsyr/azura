-- Per-locale site settings (replaces JsonStore site-settings + runtime site.json)
CREATE TABLE IF NOT EXISTS "SiteSettings" (
    "locale"    VARCHAR(10)  NOT NULL,
    "payload"   JSONB        NOT NULL DEFAULT '{}'::jsonb,
    "version"   INTEGER      NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("locale")
);
