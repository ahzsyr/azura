-- Merge duplicate SeoMeta rows: cmsPageId-linked rows into pageKey rows for wired marketing slugs.
-- Skips why-choose-us (intentionally uses cmsPageId only).

DO $$
DECLARE
  wired_slug TEXT;
  cms_page_id TEXT;
  cms_meta_id TEXT;
  page_key_meta_id TEXT;
BEGIN
  FOR wired_slug IN
    SELECT unnest(ARRAY[
      'home', 'about', 'contact', 'packages', 'gallery', 'testimonials',
      'hotels-transport', 'products', 'collections', 'services', 'compare',
      'favorites', 'account', 'smart-home', 'security-solutions', 'enterprise-wireless'
    ])
  LOOP
    SELECT cp.id, sm.id
    INTO cms_page_id, cms_meta_id
    FROM "CmsPage" cp
    JOIN "SeoMeta" sm ON sm."cmsPageId" = cp.id
    WHERE cp.slug = wired_slug;

    IF cms_meta_id IS NULL THEN
      CONTINUE;
    END IF;

    SELECT id INTO page_key_meta_id FROM "SeoMeta" WHERE "pageKey" = wired_slug;

    IF page_key_meta_id IS NULL THEN
      UPDATE "SeoMeta"
      SET "pageKey" = wired_slug, "cmsPageId" = NULL
      WHERE id = cms_meta_id;
      CONTINUE;
    END IF;

    IF page_key_meta_id = cms_meta_id THEN
      CONTINUE;
    END IF;

    UPDATE "SeoMeta" pk
    SET
      "canonicalUrl" = COALESCE(NULLIF(TRIM(pk."canonicalUrl"), ''), NULLIF(TRIM(cms."canonicalUrl"), '')),
      "robots" = COALESCE(NULLIF(TRIM(pk."robots"), ''), NULLIF(TRIM(cms."robots"), '')),
      "focusKeywords" = COALESCE(NULLIF(TRIM(pk."focusKeywords"), ''), NULLIF(TRIM(cms."focusKeywords"), '')),
      "ogImageUrl" = COALESCE(NULLIF(TRIM(pk."ogImageUrl"), ''), NULLIF(TRIM(cms."ogImageUrl"), '')),
      "twitterCard" = COALESCE(NULLIF(TRIM(pk."twitterCard"), ''), NULLIF(TRIM(cms."twitterCard"), '')),
      "jsonLd" = COALESCE(pk."jsonLd", cms."jsonLd")
    FROM "SeoMeta" cms
    WHERE pk.id = page_key_meta_id AND cms.id = cms_meta_id;

    INSERT INTO "EntityTranslation" ("id", "entityType", "entityId", "field", "localeCode", "value", "status", "version", "createdAt", "updatedAt")
    SELECT
      gen_random_uuid()::text,
      'SeoMeta',
      page_key_meta_id,
      cms_t.field,
      cms_t."localeCode",
      cms_t.value,
      cms_t.status,
      1,
      NOW(),
      NOW()
    FROM "EntityTranslation" cms_t
    WHERE cms_t."entityType" = 'SeoMeta'
      AND cms_t."entityId" = cms_meta_id
      AND NOT EXISTS (
        SELECT 1 FROM "EntityTranslation" pk_t
        WHERE pk_t."entityType" = 'SeoMeta'
          AND pk_t."entityId" = page_key_meta_id
          AND pk_t.field = cms_t.field
          AND pk_t."localeCode" = cms_t."localeCode"
          AND NULLIF(TRIM(pk_t.value), '') IS NOT NULL
      )
    ON CONFLICT DO NOTHING;

    DELETE FROM "EntityTranslation"
    WHERE "entityType" = 'SeoMeta' AND "entityId" = cms_meta_id;

    DELETE FROM "SeoMeta" WHERE id = cms_meta_id;
  END LOOP;
END $$;
