-- Migrate legacy SeoSettings.ogImageUrl into SeoMeta, then drop SeoSettings (MySQL).

UPDATE `SeoMeta` sm
INNER JOIN `SeoSettings` ss ON sm.`pageKey` = ss.`pageKey`
SET sm.`ogImageUrl` = ss.`ogImageUrl`
WHERE (sm.`ogImageUrl` IS NULL OR TRIM(sm.`ogImageUrl`) = '')
  AND ss.`ogImageUrl` IS NOT NULL
  AND TRIM(ss.`ogImageUrl`) <> '';

DROP TABLE IF EXISTS `SeoSettings`;
