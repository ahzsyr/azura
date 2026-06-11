import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildPageEditorFormData,
  getPageEditorLocalizedInputName,
  type PageEditorFormState,
} from "@/features/cms/lib/page-editor-form-data";
import type { PageBlocks } from "@/types/builder";

const baseState: PageEditorFormState = {
  slug: "home",
  status: "DRAFT",
  titleEn: "Home EN",
  titleAr: "Home AR",
  excerptEn: "Excerpt EN",
  excerptAr: "Excerpt AR",
  templateKey: "landing",
  scheduledAt: "",
  revisionMessage: "",
  blocks: [{ id: "hero-34", type: "hero", props: { titleEn: "Welcome" } }] as PageBlocks,
  localeFields: {
    title: { en: "Home EN", ar: "Home AR" },
    excerpt: { en: "Ex EN", ar: "Ex AR" },
  },
  visualSettings: { canvasEffects: "inherit" },
};

describe("buildPageEditorFormData", () => {
  it("includes blocks JSON and editor navigation meta", () => {
    const blocks: PageBlocks = [
      { id: "hero-34", type: "hero", props: { imageUrl: "https://cdn.example/h.jpg" } },
    ];
    const formData = buildPageEditorFormData(
      baseState,
      {
        pageId: "page-1",
        editorTab: "content",
        selectedBlockId: "hero-34",
        editorInspector: "content",
      },
      { blocks },
    );

    assert.equal(formData.get("id"), "page-1");
    assert.equal(formData.get("slug"), "home");
    assert.equal(formData.get("editorTab"), "content");
    assert.equal(formData.get("selectedBlockId"), "hero-34");
    assert.equal(formData.get("editorInspector"), "content");
    assert.equal(formData.get("blocks"), JSON.stringify(blocks));
  });

  it("applies PUBLISHED status override", () => {
    const formData = buildPageEditorFormData(
      baseState,
      {
        editorTab: "content",
        selectedBlockId: null,
        editorInspector: "content",
        statusOverride: "PUBLISHED",
      },
    );
    assert.equal(formData.get("status"), "PUBLISHED");
  });

  it("writes locale-specific hidden field names", () => {
    const formData = buildPageEditorFormData(
      baseState,
      { editorTab: "general", selectedBlockId: null, editorInspector: "content" },
      {
        locales: [
          { code: "en", urlPrefix: "en", label: "English", htmlLang: "en", dir: "ltr", flag: "🇺🇸", isDefault: true },
          { code: "ar", urlPrefix: "ar", label: "Arabic", htmlLang: "ar", dir: "rtl", flag: "🇸🇦", isDefault: false },
        ],
      },
    );

    assert.equal(formData.get(getPageEditorLocalizedInputName("title", "en")), "Home EN");
    assert.equal(formData.get(getPageEditorLocalizedInputName("title", "ar")), "Home AR");
    assert.equal(formData.get(getPageEditorLocalizedInputName("excerpt", "en")), "Ex EN");
  });

  it("includes blockTranslations when provided", () => {
    const formData = buildPageEditorFormData(
      baseState,
      { editorTab: "content", selectedBlockId: null, editorInspector: "content" },
      {
        blockTranslations: [
          {
            entityType: "Block",
            entityId: "CmsPage:page-1:hero-34",
            field: "title",
            languageCode: "ar",
            value: "مرحبا",
          },
        ],
      },
    );
    const raw = formData.get("blockTranslations");
    assert.equal(typeof raw, "string");
    assert.match(String(raw), /hero-34/);
  });
});

describe("getPageEditorLocalizedInputName", () => {
  it("maps en/ar to legacy suffix fields", () => {
    assert.equal(getPageEditorLocalizedInputName("title", "en"), "titleEn");
    assert.equal(getPageEditorLocalizedInputName("title", "ar"), "titleAr");
  });
});
