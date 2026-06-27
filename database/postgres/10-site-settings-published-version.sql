-- SiteSettings publish tracking (save vs live). Applied automatically on Vercel production deploy.
ALTER TABLE "SiteSettings"
  ADD COLUMN IF NOT EXISTS "publishedVersion" INTEGER NOT NULL DEFAULT 0;
