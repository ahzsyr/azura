import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveStaticPageSeoMaps } from "@/features/seo/cms-page-seo-context";

const pageKeyMeta = {
  id: "pk-home",
  pageKey: "home",
  focusKeywords: null,
} as never;

const cmsSeoMeta = {
  id: "cms-home",
  focusKeywords: "cms keywords",
} as never;

describe("resolveStaticPageSeoMaps", () => {
  it("flags needsMerge when duplicate cmsPageId row exists for wired slug", () => {
    const result = resolveStaticPageSeoMaps({
      pageKey: "home",
      pageKeyMeta,
      cmsSeoMeta,
      pageKeyTranslations: {},
      cmsSeoTranslations: { metaTitleEn: "CMS title" },
    });

    assert.equal(result.needsMerge, true);
    assert.equal(result.translations.metaTitleEn, "CMS title");
    assert.equal(result.savedTranslations.metaTitleEn, undefined);
  });

  it("aligns savedTranslations with canonical row after merge reload", () => {
    const canonicalMeta = {
      id: "pk-home",
      pageKey: "home",
      focusKeywords: "merged keywords",
    } as never;

    const result = resolveStaticPageSeoMaps({
      pageKey: "home",
      pageKeyMeta,
      cmsSeoMeta,
      pageKeyTranslations: {},
      cmsSeoTranslations: { metaTitleEn: "CMS title" },
      canonicalMetaAfterMerge: canonicalMeta,
      canonicalTranslationsAfterMerge: {
        metaTitleEn: "Merged title",
        metaDescriptionEn: "Merged description",
      },
    });

    assert.equal(result.needsMerge, true);
    assert.equal(result.meta.id, "pk-home");
    assert.equal(result.translations.metaTitleEn, "Merged title");
    assert.equal(result.savedTranslations.metaTitleEn, "Merged title");
    assert.equal(result.savedTranslations.metaDescriptionEn, "Merged description");
  });

  it("uses pageKey translations as saved when no duplicate exists", () => {
    const result = resolveStaticPageSeoMaps({
      pageKey: "home",
      pageKeyMeta,
      cmsSeoMeta: null,
      pageKeyTranslations: { metaTitleEn: "Saved title" },
      cmsSeoTranslations: {},
    });

    assert.equal(result.needsMerge, false);
    assert.equal(result.translations.metaTitleEn, "Saved title");
    assert.equal(result.savedTranslations.metaTitleEn, "Saved title");
  });
});
