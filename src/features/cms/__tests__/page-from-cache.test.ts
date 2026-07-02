import test from "node:test";
import assert from "node:assert/strict";
import { publicViewFromPageCache } from "@/features/cms/page-from-cache";
import type { CachedPagePayload } from "@/features/storage/page-cache";

const samplePayload: CachedPagePayload = {
  id: "page-1",
  slug: "home",
  title: "Home",
  excerpt: "Welcome home",
  titleEn: "Home",
  titleAr: "الرئيسية",
  excerptEn: "Welcome home",
  excerptAr: "مرحبًا",
  blocks: [{ id: "b1", type: "hero", props: {} }],
  updatedAt: "2026-01-15T12:00:00.000Z",
};

test("publicViewFromPageCache maps payload to CmsPagePublicView", () => {
  const view = publicViewFromPageCache(samplePayload);

  assert.equal(view.id, "page-1");
  assert.equal(view.slug, "home");
  assert.equal(view.status, "PUBLISHED");
  assert.equal(view.title, "Home");
  assert.equal(view.titleEn, "Home");
  assert.equal(view.titleAr, "الرئيسية");
  assert.equal(view.excerpt, "Welcome home");
  assert.equal(view.description, "Welcome home");
  assert.equal(view.seoMeta, null);
  assert.equal(Array.isArray(view.blocks), true);
  assert.equal(view.blocks.length, 1);
  assert.equal(view.updatedAt.toISOString(), samplePayload.updatedAt);
});

test("publicViewFromPageCache uses excerpt fallbacks when excerpt is null", () => {
  const view = publicViewFromPageCache({
    ...samplePayload,
    excerpt: null,
    excerptEn: "EN excerpt",
    excerptAr: null,
  });

  assert.equal(view.excerpt, "EN excerpt");
  assert.equal(view.descriptionEn, "EN excerpt");
});
