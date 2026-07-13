import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildCmsPageEditorSeoContext,
  coalesceMetaRecord,
  coalesceTranslationRecords,
  coalesceWiredPageSeo,
  getCmsPageSeoPageKey,
  isSavedSeoTranslation,
  resolveCmsPageEditorSeoMeta,
} from "@/features/seo/cms-page-seo-context";

describe("getCmsPageSeoPageKey", () => {
  it("returns pageKey for wired marketing slugs", () => {
    assert.equal(getCmsPageSeoPageKey("home"), "home");
    assert.equal(getCmsPageSeoPageKey("about"), "about");
    assert.equal(getCmsPageSeoPageKey("smart-home"), "smart-home");
  });

  it("returns undefined for why-choose-us (uses cmsPageId on public site)", () => {
    assert.equal(getCmsPageSeoPageKey("why-choose-us"), undefined);
  });

  it("returns undefined for non-wired slugs", () => {
    assert.equal(getCmsPageSeoPageKey("my-custom-page"), undefined);
    assert.equal(getCmsPageSeoPageKey(""), undefined);
  });
});

describe("coalesceMetaRecord", () => {
  it("merges non-localized fields from cms when pageKey values are empty", () => {
    const pageKeyMeta = {
      id: "pk-1",
      pageKey: "home",
      focusKeywords: null,
      ogImageUrl: null,
    } as never;
    const cmsMeta = {
      id: "cms-1",
      focusKeywords: "wireless, IoT",
      ogImageUrl: "https://example.com/og.jpg",
    } as never;

    const merged = coalesceMetaRecord(pageKeyMeta, cmsMeta);
    assert.equal(merged?.id, "pk-1");
    assert.equal(merged?.focusKeywords, "wireless, IoT");
    assert.equal(merged?.ogImageUrl, "https://example.com/og.jpg");
  });

  it("prefers pageKey non-localized fields when set", () => {
    const pageKeyMeta = {
      id: "pk-1",
      focusKeywords: "pageKey keywords",
      ogImageUrl: "https://pagekey.jpg",
    } as never;
    const cmsMeta = {
      id: "cms-1",
      focusKeywords: "cms keywords",
      ogImageUrl: "https://cms.jpg",
    } as never;

    const merged = coalesceMetaRecord(pageKeyMeta, cmsMeta);
    assert.equal(merged?.focusKeywords, "pageKey keywords");
    assert.equal(merged?.ogImageUrl, "https://pagekey.jpg");
  });
});

describe("coalesceTranslationRecords", () => {
  it("inherits cms translations when pageKey translations are empty", () => {
    const merged = coalesceTranslationRecords(
      { metaTitleEn: "" },
      { metaTitleEn: "Umrah Packages 2024", metaDescriptionEn: "Book now" },
    );
    assert.equal(merged.metaTitleEn, "Umrah Packages 2024");
    assert.equal(merged.metaDescriptionEn, "Book now");
  });
});

describe("resolveCmsPageEditorSeoMeta", () => {
  it("coalesces pageKey and cms records for wired pages", () => {
    const pageKeyMeta = { id: "pk-1", focusKeywords: null } as never;
    const cmsMeta = { id: "cms-1", focusKeywords: "cms keywords" } as never;
    const merged = resolveCmsPageEditorSeoMeta(pageKeyMeta, cmsMeta, "home");
    assert.equal(merged?.id, "pk-1");
    assert.equal(merged?.focusKeywords, "cms keywords");
  });

  it("falls back to cmsPageId record when pageKey record is missing", () => {
    const cmsMeta = { id: "cms-1" } as never;
    assert.equal(resolveCmsPageEditorSeoMeta(null, cmsMeta, "home"), cmsMeta);
  });

  it("uses cmsPageId record for non-wired pages", () => {
    const cmsMeta = { id: "cms-1" } as never;
    assert.equal(resolveCmsPageEditorSeoMeta(null, cmsMeta), cmsMeta);
  });
});

describe("coalesceWiredPageSeo", () => {
  it("flags cms meta id to retire when duplicates exist", () => {
    const result = coalesceWiredPageSeo({
      pageKey: "home",
      pageKeyMeta: { id: "pk-1" } as never,
      cmsSeoMeta: { id: "cms-1" } as never,
      pageKeyTranslations: {},
      cmsTranslations: { metaTitleEn: "Saved title" },
    });
    assert.equal(result.cmsSeoMetaIdToRetire, "cms-1");
    assert.equal(result.translations.metaTitleEn, "Saved title");
  });
});

describe("buildCmsPageEditorSeoContext", () => {
  it("builds pageKey context for wired home with coalesced translations", () => {
    const ctx = buildCmsPageEditorSeoContext({
      slug: "home",
      cmsPageId: "page-uuid",
      cmsSeoMeta: { id: "cms-meta", focusKeywords: "cms" } as never,
      pageKeyMeta: { id: "home-meta", focusKeywords: null } as never,
      pageKeyTranslations: {},
      cmsTranslations: { metaTitleEn: "Coalesced title" },
    });
    assert.equal(ctx.pageKey, "home");
    assert.equal(ctx.cmsPageId, undefined);
    assert.equal(ctx.meta?.id, "home-meta");
    assert.equal(ctx.translations.metaTitleEn, "Coalesced title");
    assert.equal(ctx.cmsSeoMetaIdToRetire, "cms-meta");
  });

  it("builds cmsPageId context for why-choose-us", () => {
    const cmsMeta = { id: "cms-meta" } as never;
    const ctx = buildCmsPageEditorSeoContext({
      slug: "why-choose-us",
      cmsPageId: "page-uuid",
      cmsSeoMeta: cmsMeta,
    });
    assert.equal(ctx.pageKey, undefined);
    assert.equal(ctx.cmsPageId, "page-uuid");
    assert.equal(ctx.meta, cmsMeta);
  });

  it("builds cmsPageId context for custom pages", () => {
    const cmsMeta = { id: "cms-meta" } as never;
    const ctx = buildCmsPageEditorSeoContext({
      slug: "landing-promo",
      cmsPageId: "page-uuid",
      cmsSeoMeta: cmsMeta,
    });
    assert.equal(ctx.pageKey, undefined);
    assert.equal(ctx.cmsPageId, "page-uuid");
    assert.equal(ctx.meta, cmsMeta);
  });
});

describe("isSavedSeoTranslation", () => {
  it("returns true when translation exists in DB shape", () => {
    assert.equal(
      isSavedSeoTranslation({ metaTitleEn: "Saved" }, "metaTitle", "en"),
      true,
    );
  });

  it("returns false when translation is missing", () => {
    assert.equal(isSavedSeoTranslation({}, "metaTitle", "en"), false);
  });

  it("matches savedTranslations used by both admin UIs after canonical merge", () => {
    const canonicalSaved = {
      metaTitleEn: "B R T trading | Home",
      metaDescriptionEn: "Wireless and networking solutions.",
    };
    const coalesced = coalesceWiredPageSeo({
      pageKey: "home",
      pageKeyMeta: { id: "pk-1" } as never,
      cmsSeoMeta: { id: "cms-1" } as never,
      pageKeyTranslations: canonicalSaved,
      cmsTranslations: { metaTitleEn: "Stale CMS title" },
    });

    assert.equal(coalesced.cmsSeoMetaIdToRetire, "cms-1");
    assert.equal(coalesced.translations.metaTitleEn, "B R T trading | Home");
    assert.equal(
      isSavedSeoTranslation(canonicalSaved, "metaTitle", "en"),
      true,
    );
  });
});
