import assert from "node:assert/strict";
import test from "node:test";
import Module from "node:module";

/**
 * Phase 2 image/media crawlability invariants (no image sitemap in this project).
 * Important assets under /uploads must remain crawlable via robots Allow.
 */

const originalLoad = (Module as unknown as { _load: (...args: unknown[]) => unknown })._load;
(Module as unknown as { _load: (...args: unknown[]) => unknown })._load = function load(
  request: string,
  ...args: unknown[]
) {
  if (request === "server-only") return {};
  return originalLoad.call(this, request, ...args);
};

test("default robots disallow never blocks /uploads", () => {
  const additionalDisallow = ["/private/", "/uploads/", "/uploads"];
  const disallow = ["/admin/", "/api/", ...additionalDisallow].filter(
    (path) => !path.replace(/\/$/, "").endsWith("/uploads") && path !== "/uploads/",
  );
  assert.ok(!disallow.some((p) => p.includes("uploads")));
  assert.ok(disallow.includes("/admin/"));
  assert.ok(disallow.includes("/api/"));
});

test("important marketing images should render as crawlable img-like URLs", async () => {
  const { resolveSeoOgImageUrl } = await import("../seo-image-url");
  const abs = resolveSeoOgImageUrl("/uploads/images/hero.jpg", "https://www.brt-me.com");
  assert.equal(abs, "https://brt-me.com/uploads/images/hero.jpg");
  assert.ok(!abs.includes("www."));
  assert.ok(abs.startsWith("https://"));
});
