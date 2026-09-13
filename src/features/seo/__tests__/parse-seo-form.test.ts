import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { seoMetaBaseSchema } from "@/schemas/seo";
import { parseJsonLdForSeoColumn, parseSeoForm } from "@/features/seo/parse-seo-form";
import type { PublicLocale } from "@/i18n/locale-config";

const LOCALES: PublicLocale[] = [
  {
    code: "en",
    urlPrefix: "en",
    label: "English",
    htmlLang: "en",
    dir: "ltr",
    flag: "🇬🇧",
    isDefault: true,
  },
  {
    code: "ar",
    urlPrefix: "ar",
    label: "Arabic",
    htmlLang: "ar",
    dir: "rtl",
    flag: "🇸🇦",
    isDefault: false,
  },
];

function seoForm(fields: Record<string, string>): FormData {
  const fd = new FormData();
  fd.set("cmsPageId", "page-1");
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fd;
}

describe("seoMetaBaseSchema", () => {
  it("accepts relative locale canonicals stored by normalizeCanonicalUrlForPageKey", () => {
    const parsed = seoMetaBaseSchema.safeParse({ canonicalUrl: "/en/about" });
    assert.equal(parsed.success, true);
    if (parsed.success) assert.equal(parsed.data.canonicalUrl, "/en/about");
  });

  it("accepts absolute canonical URLs", () => {
    const parsed = seoMetaBaseSchema.safeParse({
      canonicalUrl: "https://example.com/ar/about",
    });
    assert.equal(parsed.success, true);
  });

  it("treats empty canonical as null", () => {
    const parsed = seoMetaBaseSchema.safeParse({ canonicalUrl: "  " });
    assert.equal(parsed.success, true);
    if (parsed.success) assert.equal(parsed.data.canonicalUrl, null);
  });
});

describe("parseSeoForm", () => {
  it("does not throw when saving Arabic while English canonical is a relative path", () => {
    const parsed = parseSeoForm(
      seoForm({
        metaTitleEn: "About",
        canonicalUrlEn: "/en/about",
        metaTitleAr: "حول",
        canonicalUrlAr: "https://example.com/ar/about",
        twitterCard: "summary_large_image",
      }),
      LOCALES,
    );
    assert.equal(parsed.canonicalUrl, "/en/about");
    assert.equal(parsed.twitterCard, "summary_large_image");
  });

  it("coerces unknown twitter card values instead of failing the save", () => {
    const parsed = parseSeoForm(
      seoForm({
        canonicalUrlEn: "https://example.com/en",
        twitterCard: "summary_large_image extra",
      }),
      LOCALES,
    );
    assert.equal(parsed.twitterCard, "summary_large_image");
  });
});

describe("parseJsonLdForSeoColumn", () => {
  it("parses valid JSON-LD", () => {
    assert.deepEqual(parseJsonLdForSeoColumn('{"@type":"WebPage"}'), { "@type": "WebPage" });
  });

  it("returns null for invalid JSON instead of throwing", () => {
    assert.equal(parseJsonLdForSeoColumn("{not json"), null);
    assert.equal(parseJsonLdForSeoColumn(""), null);
    assert.equal(parseJsonLdForSeoColumn(null), null);
  });
});
