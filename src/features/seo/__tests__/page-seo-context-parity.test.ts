import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toSeoMetaFormProps } from "@/features/seo/mappers/to-seo-meta-form-props";
import type { PageSeoContext } from "@/features/seo/page-seo-context.types";

function homeContext(overrides: Partial<PageSeoContext> = {}): PageSeoContext {
  return {
    identity: { pageKey: "home", cmsPageId: "cms-home-id", slug: "home" },
    writeTarget: { pageKey: "home" },
    meta: {
      id: "meta-home",
      pageKey: "home",
      cmsPageId: null,
      postId: null,
      packageId: null,
      entityType: null,
      entityId: null,
      canonicalUrl: null,
      robots: "index, follow",
      focusKeywords: null,
      ogImageUrl: null,
      twitterCard: "summary_large_image",
      jsonLd: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    translations: {
      metaTitleEn: "B R T trading | Home",
      metaDescriptionEn: "Wireless solutions.",
    },
    savedTranslations: {
      metaTitleEn: "B R T trading | Home",
      metaDescriptionEn: "Wireless solutions.",
    },
    contentFallbacks: {
      titleEn: "Home Page",
      titleAr: "الصفحة الرئيسية",
      descEn: "Welcome",
      descAr: "مرحبا",
    },
    origin: "https://example.com",
    indexing: { robots: "index, follow", isNoIndex: false, publicPath: "" },
    ...overrides,
  };
}

describe("PageSeoContext parity", () => {
  it("toSeoMetaFormProps produces identical shape for hub and page editor", () => {
    const context = homeContext();
    const hubProps = toSeoMetaFormProps(context);
    const editorProps = toSeoMetaFormProps(context);

    assert.deepEqual(hubProps, editorProps);
    assert.equal(hubProps.pageKey, "home");
    assert.equal(hubProps.savedTranslations.metaTitleEn, "B R T trading | Home");
    assert.equal(hubProps.defaultTitleEn, "Home Page");
    assert.equal(hubProps.previewOrigin, "example.com");
  });

  it("unsaved SEO exposes content fallbacks via mapper defaults", () => {
    const context = homeContext({
      translations: {},
      savedTranslations: {},
      meta: null,
    });

    const props = toSeoMetaFormProps(context);
    assert.equal(props.defaultTitleEn, "Home Page");
    assert.equal(props.defaultDescEn, "Welcome");
    assert.deepEqual(props.savedTranslations, {});
  });

  it("cmsPageId-only context maps write target for custom pages", () => {
    const context = homeContext({
      identity: { cmsPageId: "custom-id", slug: "landing" },
      writeTarget: { cmsPageId: "custom-id" },
      meta: null,
      translations: {},
      savedTranslations: {},
      indexing: { robots: "index, follow", isNoIndex: false, publicPath: "/pages/landing" },
    });

    const props = toSeoMetaFormProps(context);
    assert.equal(props.cmsPageId, "custom-id");
    assert.equal(props.pageKey, undefined);
  });
});
