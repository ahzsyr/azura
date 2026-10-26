import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSeoDocumentCacheKey } from "../seo-cache-key";

describe("SEO document cache keys", () => {
  it("keeps readable URL keys for path invalidation", () => {
    assert.equal(
      buildSeoDocumentCacheKey({ url: "https://example.com/about" }),
      "url:https://example.com/about",
    );
  });

  it("does not collide when entities share locale and path", () => {
    const a = buildSeoDocumentCacheKey({
      locale: "en",
      path: "/blog/hello",
      postId: "post-a",
    });
    const b = buildSeoDocumentCacheKey({
      locale: "en",
      path: "/blog/hello",
      postId: "post-b",
    });
    assert.notEqual(a, b);
    assert.match(a, /^identity:en:/);
  });

  it("changes when status, og image, fallback, or localized slugs change", () => {
    const base = { locale: "en", pageKey: "about", path: "/about" } as const;
    const keys = new Set([
      buildSeoDocumentCacheKey(base),
      buildSeoDocumentCacheKey({ ...base, status: 404 }),
      buildSeoDocumentCacheKey({ ...base, ogImage: "https://example.com/og.png" }),
      buildSeoDocumentCacheKey({ ...base, fallback: { title: "Fallback" } }),
      buildSeoDocumentCacheKey({ ...base, slugByLocale: { ar: "من-نحن" } }),
    ]);
    assert.equal(keys.size, 5);
  });

  it("is stable for the same input", () => {
    const input = {
      locale: "ar",
      path: "/about",
      pageKey: "about",
      slug: "about",
      status: 200,
    } as const;
    assert.equal(buildSeoDocumentCacheKey(input), buildSeoDocumentCacheKey({ ...input }));
  });
});
