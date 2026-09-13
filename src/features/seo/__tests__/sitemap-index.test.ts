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

async function loadSitemapIndex() {
  return import("../sitemap-index.service");
}

test("classifies catalog URLs into typed sitemaps", async () => {
  const { classifySitemapUrl } = await loadSitemapIndex();
  assert.equal(classifySitemapUrl("https://example.com/en/products/switch"), "product");
  assert.equal(classifySitemapUrl("https://example.com/ar/blog/news"), "post");
  assert.equal(classifySitemapUrl("https://example.com/en/categories/access"), "category");
  assert.equal(classifySitemapUrl("https://example.com/en/brands/cisco"), "brand");
  assert.equal(classifySitemapUrl("https://example.com/en/videos/unifi-show"), "video");
  assert.equal(classifySitemapUrl("https://example.com/videos"), "page");
  assert.equal(classifySitemapUrl("https://example.com/en/about"), "page");
});

test("skips compare, account, favorites, and search URLs without SEO resolve", async () => {
  const { isSitemapIndexableUrl, bucketSitemapEntries } = await loadSitemapIndex();
  assert.equal(isSitemapIndexableUrl("https://example.com/en/compare"), false);
  assert.equal(isSitemapIndexableUrl("https://example.com/ar/account"), false);
  assert.equal(isSitemapIndexableUrl("https://example.com/en/favorites/list"), false);
  assert.equal(isSitemapIndexableUrl("https://example.com/en/search"), false);
  assert.equal(isSitemapIndexableUrl("https://example.com/en/products/switch"), true);

  const buckets = bucketSitemapEntries([
    { url: "https://example.com/en/compare" },
    { url: "https://example.com/en/account" },
    { url: "https://example.com/en/products/switch" },
    { url: "https://example.com/en/about" },
  ]);
  assert.equal(buckets.product.length, 1);
  assert.equal(buckets.page.length, 1);
  assert.equal(buckets.product[0]?.url, "https://example.com/en/products/switch");
});

test("chunks entries and formats sitemap index XML", async () => {
  const {
    SITEMAP_CHUNK_SIZE,
    chunkEntries,
    formatSitemapIndexXmlFromBuckets,
    formatSitemapUrlsetXml,
    parseSitemapRouteName,
    minimalSitemapIndexXml,
    emptySitemapUrlsetXml,
    ensurePageSitemapBucket,
    emptySitemapBuckets,
  } = await loadSitemapIndex();

  const many = Array.from({ length: SITEMAP_CHUNK_SIZE + 2 }, (_, i) => ({
    url: `https://example.com/en/products/item-${i}`,
  }));
  const chunks = chunkEntries(many);
  assert.equal(chunks.length, 2);
  assert.equal(chunks[0]?.length, SITEMAP_CHUNK_SIZE);
  assert.equal(chunks[1]?.length, 2);

  const lastmod = "2026-09-03T12:00:00.000Z";
  const index = formatSitemapIndexXmlFromBuckets(
    "https://example.com",
    {
      page: [{ url: "https://example.com/en/about", lastModified: lastmod }],
      post: [],
      product: many,
      category: [],
      brand: [],
      video: [],
    },
    lastmod,
  );
  assert.match(index, /<sitemapindex /);
  assert.match(index, /https:\/\/example.com\/page-sitemap\.xml/);
  assert.match(index, /https:\/\/example.com\/product-sitemap\.xml/);
  assert.match(index, /https:\/\/example.com\/product-sitemap2\.xml/);
  assert.doesNotMatch(index, /image:image/);

  const urlset = formatSitemapUrlsetXml([{ url: "https://example.com/en/about", lastModified: lastmod }]);
  assert.match(urlset, /<loc>https:\/\/example.com\/en\/about<\/loc>/);
  assert.match(urlset, /<lastmod>2026-09-03T12:00:00.000Z<\/lastmod>/);
  assert.doesNotMatch(urlset, /image:image/);

  assert.deepEqual(parseSitemapRouteName("product-sitemap.xml"), { type: "product", page: 1 });
  assert.deepEqual(parseSitemapRouteName("product-sitemap2.xml"), { type: "product", page: 2 });
  assert.deepEqual(parseSitemapRouteName("video-sitemap.xml"), { type: "video", page: 1 });
  assert.equal(parseSitemapRouteName("other.xml"), null);

  const { formatVideoSitemapXml } = await loadSitemapIndex();
  const videoXml = formatVideoSitemapXml([
    {
      url: "https://example.com/videos/demo",
      lastModified: lastmod,
      video: {
        title: "Demo",
        description: "A demo video",
        thumbnailLoc: "https://example.com/thumb.jpg",
        contentLoc: "https://example.com/demo.mp4",
        duration: "90",
        publicationDate: lastmod,
      },
    },
  ]);
  assert.match(videoXml, /xmlns:video=/);
  assert.match(videoXml, /<video:video>/);
  assert.match(videoXml, /<video:content_loc>https:\/\/example.com\/demo\.mp4<\/video:content_loc>/);
  assert.match(videoXml, /<video:duration>90<\/video:duration>/);

  const minimal = minimalSitemapIndexXml("https://brt-me.com");
  assert.match(minimal, /<sitemapindex /);
  assert.match(minimal, /https:\/\/brt-me\.com\/page-sitemap\.xml/);
  assert.match(minimal, /<\?xml /);

  const empty = emptySitemapUrlsetXml();
  assert.match(empty, /<urlset /);
  assert.match(empty, /<\?xml /);

  const ensured = ensurePageSitemapBucket("https://brt-me.com", emptySitemapBuckets());
  assert.ok(ensured.page.length > 0);
  assert.ok(ensured.page.some((e) => e.url === "https://brt-me.com/" || e.url.endsWith("brt-me.com/")));
});

test("English homepage sitemap loc uses apex / not /en", async () => {
  const { fallbackStaticSitemapEntries } = await import("../sitemap.service");
  const entries = fallbackStaticSitemapEntries("https://brt-me.com", ["en", "ar"]);
  const homeEn = entries.find((e) => e.url === "https://brt-me.com/" || e.url === "https://brt-me.com");
  assert.ok(homeEn, "English homepage must be https://brt-me.com/");
  assert.ok(
    !entries.some((e) => e.url === "https://brt-me.com/en" || e.url === "https://brt-me.com/en/"),
    "must not emit /en as English homepage",
  );
  const homeAr = entries.find((e) => e.url === "https://brt-me.com/ar" || e.url === "https://brt-me.com/ar/");
  assert.ok(homeAr, "Arabic homepage must be under /ar/");
});
