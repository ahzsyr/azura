-- Catalog vs CMS media scope on MediaAsset
ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "assetScope" VARCHAR(16) NOT NULL DEFAULT 'CMS';
CREATE INDEX IF NOT EXISTS "MediaAsset_assetScope_idx" ON "MediaAsset" ("assetScope");
