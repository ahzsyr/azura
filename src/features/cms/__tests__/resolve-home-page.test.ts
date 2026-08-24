import test from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";

const livePage = {
  id: "live-home",
  slug: "home",
  status: "PUBLISHED",
  blocks: [{ id: "b1", type: "hero", props: {} }],
  title: "Home",
  excerpt: "",
  description: "",
  titleEn: "Home",
  titleAr: "",
  excerptEn: "",
  excerptAr: "",
  descriptionEn: "",
  descriptionAr: "",
};

const stalePayload = {
  id: "stale-home",
  slug: "home",
  title: "Stale Home",
  excerpt: null,
  titleEn: "Stale Home",
  titleAr: "",
  excerptEn: null,
  excerptAr: null,
  blocks: [{ id: "stale", type: "hero", props: {} }],
  updatedAt: "2026-01-01T00:00:00.000Z",
};

let cachedHomeReturns: typeof livePage | null = livePage;
let cachedHomeThrows = false;
let pageCacheReturns: typeof stalePayload | null = null;

const originalLoad = (Module as unknown as { _load: (...args: unknown[]) => unknown })._load;
(Module as unknown as { _load: (...args: unknown[]) => unknown })._load = function load(
  request: string,
  ...args: unknown[]
) {
  if (request === "server-only") return {};
  if (request.endsWith("/load-home-page") || request === "@/features/cms/load-home-page") {
    return {
      loadCachedHomePage: async () => {
        if (cachedHomeThrows) throw new Error("P2024");
        return cachedHomeReturns;
      },
    };
  }
  if (request.endsWith("/page-cache") || request === "@/features/storage/page-cache") {
    return {
      pageCache: {
        get: async () => pageCacheReturns,
      },
    };
  }
  return originalLoad.call(this, request, ...args);
};

test("resolveHomePage returns live CMS when loadCachedHomePage succeeds", async () => {
  cachedHomeThrows = false;
  cachedHomeReturns = livePage;
  pageCacheReturns = stalePayload;

  const { resolveHomePage } = await import("@/features/cms/resolve-home-page");
  const result = await resolveHomePage();

  assert.equal(result.kind, "cms");
  if (result.kind === "cms") {
    assert.equal(result.source, "live");
    assert.equal(result.page.id, "live-home");
  }
});

test("resolveHomePage returns stale CMS when live fails but pageCache hits", async () => {
  cachedHomeThrows = true;
  cachedHomeReturns = null;
  pageCacheReturns = stalePayload;

  const { resolveHomePage } = await import("@/features/cms/resolve-home-page");
  const result = await resolveHomePage();

  assert.equal(result.kind, "cms");
  if (result.kind === "cms") {
    assert.equal(result.source, "stale");
    assert.equal(result.page.title, "Stale Home");
  }
});

test("resolveHomePage returns fallback when live and stale both miss", async () => {
  cachedHomeThrows = false;
  cachedHomeReturns = null;
  pageCacheReturns = null;

  const { resolveHomePage } = await import("@/features/cms/resolve-home-page");
  const result = await resolveHomePage();

  assert.equal(result.kind, "fallback");
});

test("resolveHomePage skipLive uses stale without calling live path success", async () => {
  cachedHomeThrows = false;
  cachedHomeReturns = livePage;
  pageCacheReturns = stalePayload;

  const { resolveHomePage } = await import("@/features/cms/resolve-home-page");
  const result = await resolveHomePage({ skipLive: true });

  assert.equal(result.kind, "cms");
  if (result.kind === "cms") {
    assert.equal(result.source, "stale");
    assert.equal(result.page.id, "stale-home");
  }
});
