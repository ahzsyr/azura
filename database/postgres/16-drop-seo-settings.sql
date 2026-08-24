-- Migrate legacy SeoSettings.ogImageUrl into SeoMeta, then drop SeoSettings.

UPDATE "SeoMeta" sm
SET "ogImageUrl" = ss."ogImageUrl"
FROM "SeoSettings" ss
WHERE sm."pageKey" = ss."pageKey"
  AND (sm."ogImageUrl" IS NULL OR TRIM(sm."ogImageUrl") = '')
  AND ss."ogImageUrl" IS NOT NULL
  AND TRIM(ss."ogImageUrl") <> '';

DROP TABLE IF EXISTS "SeoSettings";
