import test from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";

const livePage = {
  id: "live-1",
  slug: "home",
  status: "PUBLISHED",
  blocks: [{ id: "live-block", type: "hero", props: {} }],
  title: "Live Home",
  excerpt: "",
  description: "",
  titleEn: "Live Home",
  titleAr: "",
  excerptEn: "",
  excerptAr: "",
  descriptionEn: "",
  descriptionAr: "",
};

const stalePayload = {
  id: "stale-1",
  slug: "home",
  title: "Stale Home",
  excerpt: "Cached",
  titleEn: "Stale Home",
  titleAr: "",
  excerptEn: "Cached",
  excerptAr: null,
  blocks: [{ id: "stale-block", type: "hero", props: {} }],
  updatedAt: "2026-01-01T00:00:00.000Z",
};

let liveThrows = false;
let liveReturns: typeof livePage | null = livePage;
let cacheReturns: typeof stalePayload | null = null;

const originalLoad = (Module as unknown as { _load: (...args: unknown[]) => unknown })._load;
(Module as unknown as { _load: (...args: unknown[]) => unknown })._load = function load(
  request: string,
  ...args: unknown[]
) {
  if (request === "server-only") return {};
  if (request.endsWith("/cms.service") || request === "@/features/cms/cms.service") {
    return {
      cmsService: {
        getPublishedPageBySlug: async () => {
          if (liveThrows) throw new Error("Timed out fetching a new connection from the connection pool");
          return liveReturns;
        },
      },
    };
  }
  if (request.endsWith("/page-cache") || request === "@/features/storage/page-cache") {
    return {
      pageCache: {
        get: async () => cacheReturns,
      },
    };
  }
  return originalLoad.call(this, request, ...args);
};

test("resolvePublishedPageWithFallback returns live page on success", async () => {
  liveThrows = false;
  liveReturns = livePage;
  cacheReturns = stalePayload;

  const { resolvePublishedPageWithFallback } = await import(
    "@/features/cms/resolve-published-page"
  );
  const result = await resolvePublishedPageWithFallback("home");

  assert.ok(result);
  assert.equal(result.source, "live");
  assert.equal(result.page.id, "live-1");
});

test("resolvePublishedPageWithFallback returns stale page when live throws recoverable error", async () => {
  liveThrows = true;
  cacheReturns = stalePayload;

  const { resolvePublishedPageWithFallback } = await import(
    "@/features/cms/resolve-published-page"
  );
  const result = await resolvePublishedPageWithFallback("home");

  assert.ok(result);
  assert.equal(result.source, "stale");
  assert.equal(result.page.slug, "home");
  assert.equal(result.page.title, "Stale Home");
});

test("resolvePublishedPageWithFallback returns null when live fails and cache misses", async () => {
  liveThrows = true;
  cacheReturns = null;

  const mod = await import("@/features/cms/resolve-published-page");
  const result = await mod.resolvePublishedPageWithFallback("about");

  assert.equal(result, null);
});
