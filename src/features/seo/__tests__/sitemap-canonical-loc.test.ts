import assert from "node:assert/strict";
import test from "node:test";
import Module from "node:module";

const originalLoad = (Module as unknown as { _load: (...args: unknown[]) => unknown })._load;
(Module as unknown as { _load: (...args: unknown[]) => unknown })._load = function load(
  request: string,
  ...args: unknown[]
) {
  if (request === "server-only") return {};
  if (request === "next/cache") {
    return {
      unstable_cache: (fn: unknown) => fn,
      revalidateTag: () => {},
      revalidatePath: () => {},
    };
  }
  return originalLoad.call(this, request, ...args);
};

const SITE = "https://brt-me.com";

test("canonicalizeSitemapLoc rewrites www, http, and /en onto apex", async () => {
  const { canonicalizeSitemapLoc } = await import("../sitemap-path-utils");
  assert.equal(canonicalizeSitemapLoc("https://www.brt-me.com/", SITE), `${SITE}/`);
  assert.equal(canonicalizeSitemapLoc("http://brt-me.com/about", SITE), `${SITE}/about`);
  assert.equal(canonicalizeSitemapLoc("https://brt-me.com/en", SITE), `${SITE}/`);
  assert.equal(canonicalizeSitemapLoc("https://www.brt-me.com/en/about", SITE), `${SITE}/about`);
  assert.equal(canonicalizeSitemapLoc("https://other.example/about", SITE), null);
});

test("bucketSitemapEntries emits only apex locs without /en", async () => {
  const { bucketSitemapEntries } = await import("../sitemap-index.service");
  const { violatesSeoApexUrlInvariants } = await import("@/lib/preferred-host");
  const buckets = bucketSitemapEntries(
    [
      { url: "https://www.brt-me.com/en" },
      { url: "https://brt-me.com/products/demo" },
      { url: "http://brt-me.com/blog/hello" },
    ],
    SITE,
  );
  const all = [...buckets.page, ...buckets.product, ...buckets.post];
  assert.deepEqual(
    all.map((e) => e.url).sort(),
    [`${SITE}/`, `${SITE}/blog/hello`, `${SITE}/products/demo`].sort(),
  );
  for (const entry of all) {
    assert.equal(violatesSeoApexUrlInvariants(entry.url), null);
  }
});
