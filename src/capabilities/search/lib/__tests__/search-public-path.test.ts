import test from "node:test";
import assert from "node:assert/strict";
import {
  contentItemSearchPath,
  inferContentTypeSlugFromPublicPath,
  isAdminSearchUrlPath,
  normalizeSearchPublicPath,
  resolveSearchContentTypeSlug,
} from "@/capabilities/search/lib/search-public-path";
import { extractCmsBlockSearchText, firstCmsBlockTitle } from "@/capabilities/search/lib/cms-page-index-text";
import { labelForContentTypeSlug, labelForSearchHit } from "@/capabilities/search/constants";
import { preferPublicPagesOverCatalogItems } from "@/capabilities/search/engine/filter/prefer-public-pages";
import { searchFilterEngine } from "@/capabilities/search/engine/filter/search-filter-engine";
import { aggregateFacetsFromHits } from "@/capabilities/search/engine/filter/search-facet-aggregate";
import { normalizeIndexRecord } from "@/capabilities/search/engine/indexer/validate-index-record";
import {
  countCatalogItemPublicDuplicates,
  hasContentTypeSlugMismatch,
  hasSearchTitleMismatch,
} from "@/capabilities/search/engine/indexer/search-index-consistency-checks";

test("content item search paths use the builtin public route for offerings", () => {
  assert.equal(
    contentItemSearchPath("en", "hotels-transport", "offerings", "indoor-coverage"),
    "/en/services/indoor-coverage",
  );
});

test("admin URL detection ignores locale prefixes", () => {
  assert.equal(isAdminSearchUrlPath("/admin/content/offerings/abc"), true);
  assert.equal(isAdminSearchUrlPath("/en/admin/media"), true);
  assert.equal(isAdminSearchUrlPath("/en/services/indoor-coverage"), false);
});

test("normalizeSearchPublicPath strips locale prefixes", () => {
  assert.equal(normalizeSearchPublicPath("/en/services/indoor-coverage"), "/services/indoor-coverage");
  assert.equal(normalizeSearchPublicPath("/services/indoor-coverage"), "/services/indoor-coverage");
});

test("CMS block text is indexed from hero props", () => {
  const blocks = [
    {
      type: "hero",
      props: {
        titleEn: "Enterprise Indoor Coverage",
        subtitleEn: "Building-wide signal enhancement",
      },
    },
  ];
  assert.equal(firstCmsBlockTitle(blocks, "en"), "Enterprise Indoor Coverage");
  assert.match(extractCmsBlockSearchText(blocks, "en"), /Building-wide signal enhancement/);
});

test("content items are labeled by content type, not Catalog item", () => {
  assert.equal(
    labelForSearchHit("CONTENT_ITEM", "en", "offerings", [
      { slug: "offerings", label: "Services", labelEn: "Services" },
    ]),
    "Services",
  );
  assert.equal(labelForSearchHit("CMS_PAGE", "en"), "Page");
});

test("offerings fall back to builtin Services label when discovery labels are empty", () => {
  assert.equal(labelForContentTypeSlug("offerings", "en"), "Services");
  assert.equal(
    labelForSearchHit("CONTENT_ITEM", "en", "offerings", [
      { slug: "offerings", label: "  ", labelEn: "", labelAr: "" },
    ]),
    "Services",
  );
});

test("public audience drops admin-only and /admin URL documents", () => {
  const rows = [
    { entityType: "CONTENT_ITEM" as const, urlPath: "/en/services/indoor-coverage", metadata: {} },
    { entityType: "MEDIA" as const, urlPath: "/admin/media", metadata: { adminOnly: true } },
    { entityType: "ICON" as const, urlPath: "/admin/media", metadata: { visibility: "admin" } },
    {
      entityType: "CONTENT_ITEM" as const,
      urlPath: "/admin/content/catalog-items/abc",
      metadata: { visibility: "public" },
    },
  ];
  const publicRows = searchFilterEngine.filterForAudience(rows, { includeAdmin: false });
  assert.deepEqual(
    publicRows.map((row) => row.urlPath),
    ["/en/services/indoor-coverage"],
  );
});

test("CMS pages win over catalog items that share a public path", () => {
  const hits = preferPublicPagesOverCatalogItems([
    { entityType: "CONTENT_ITEM", urlPath: "/en/services/indoor-coverage", title: "Catalog" },
    { entityType: "CMS_PAGE", urlPath: "/en/services/indoor-coverage", title: "Page" },
    { entityType: "CONTENT_ITEM", urlPath: "/en/services/other", title: "Other" },
  ]);
  assert.deepEqual(
    hits.map((hit) => hit.title),
    ["Page", "Other"],
  );
});

test("offerings win over catalog-items that share a title", () => {
  const hits = preferPublicPagesOverCatalogItems([
    {
      entityType: "CONTENT_ITEM",
      urlPath: "/en/packages/indoor-coverage",
      title: "Enterprise Indoor Coverage",
      contentTypeSlug: "catalog-items",
    },
    {
      entityType: "CONTENT_ITEM",
      urlPath: "/en/services/indoor-coverage",
      title: "Enterprise Indoor Coverage",
      contentTypeSlug: "offerings",
    },
  ]);
  assert.deepEqual(
    hits.map((hit) => hit.urlPath),
    ["/en/services/indoor-coverage"],
  );
});

test("offerings win over catalog-items that share a public path", () => {
  const hits = preferPublicPagesOverCatalogItems([
    {
      entityType: "CONTENT_ITEM",
      urlPath: "/en/services/indoor-coverage",
      title: "Package copy",
      metadata: { contentTypeSlug: "catalog-items" },
    },
    {
      entityType: "CONTENT_ITEM",
      urlPath: "/en/services/indoor-coverage",
      title: "Enterprise Indoor Coverage",
      metadata: { contentTypeSlug: "offerings" },
    },
  ]);
  assert.equal(hits.length, 1);
  assert.equal(hits[0]?.title, "Enterprise Indoor Coverage");
});

test("exact-title content item is promoted above products", () => {
  const hits = preferPublicPagesOverCatalogItems(
    [
      {
        entityType: "CATALOG_PRODUCT",
        urlPath: "/en/products/u6-extender",
        title: "Ubiquiti UniFi U6 Extender",
      },
      {
        entityType: "CONTENT_ITEM",
        urlPath: "/en/services/indoor-coverage",
        title: "Enterprise Indoor Coverage",
        contentTypeSlug: "offerings",
      },
    ],
    false,
    "Enterprise Indoor Coverage",
  );
  assert.equal(hits[0]?.urlPath, "/en/services/indoor-coverage");
  assert.equal(hits[1]?.entityType, "CATALOG_PRODUCT");
});

test("contentType facet filter matches metadata.contentTypeSlug", () => {
  const rows = [
    {
      entityType: "CONTENT_ITEM" as const,
      urlPath: "/en/solutions/indoor-coverage",
      metadata: {
        contentTypeSlug: "solutions",
        facets: { contentTypeSlug: "solutions" },
      },
    },
    {
      entityType: "CATALOG_PRODUCT" as const,
      urlPath: "/en/products/u6",
      metadata: { facets: { brand: "Ubiquiti" } },
    },
  ];
  const filtered = searchFilterEngine.applyFacetFilter(rows, {
    contentTypeSlugs: ["solutions"],
  });
  assert.deepEqual(
    filtered.map((row) => row.urlPath),
    ["/en/solutions/indoor-coverage"],
  );

  // Defensive: UI filter id must not zero-out results if left in facetValues.
  const viaFacetId = searchFilterEngine.applyFacetFilter(rows, {
    facetValues: { contentType: ["solutions"] },
  });
  assert.deepEqual(
    viaFacetId.map((row) => row.urlPath),
    ["/en/solutions/indoor-coverage"],
  );
});

test("contentType filter matches facets.contentTypeSlug when meta slug is missing", () => {
  // Stale/partial index docs: facet chip counts from facets.*, filter used to miss them.
  const rows = [
    {
      entityType: "CONTENT_ITEM" as const,
      urlPath: "/en/solutions/indoor-coverage",
      metadata: {
        facets: { contentTypeSlug: "solutions" },
      },
    },
  ];
  const filtered = searchFilterEngine.applyFacetFilter(rows, {
    contentTypeSlugs: ["solutions"],
  });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.urlPath, "/en/solutions/indoor-coverage");
});

test("contentType filter keeps hits when slug is only inferable from URL", () => {
  const rows = [
    {
      entityType: "CONTENT_ITEM" as const,
      urlPath: "/en/solutions/indoor-coverage",
      metadata: {},
    },
    {
      entityType: "CATALOG_PRODUCT" as const,
      urlPath: "/en/products/u6",
      metadata: {},
    },
  ];
  const filtered = searchFilterEngine.applyFacetFilter(rows, {
    contentTypeSlugs: ["solutions"],
  });
  assert.deepEqual(
    filtered.map((row) => row.urlPath),
    ["/en/solutions/indoor-coverage"],
  );
});

test("inferContentTypeSlugFromPublicPath maps builtin routes and custom segments", () => {
  assert.equal(inferContentTypeSlugFromPublicPath("/en/solutions/indoor-coverage"), "solutions");
  assert.equal(inferContentTypeSlugFromPublicPath("/en/services/indoor-coverage"), "offerings");
  assert.equal(inferContentTypeSlugFromPublicPath("/en/products/u6"), undefined);
});

test("resolveSearchContentTypeSlug prefers meta then URL", () => {
  assert.equal(
    resolveSearchContentTypeSlug({
      entityType: "CONTENT_ITEM",
      metadata: {},
      urlPath: "/en/solutions/indoor-coverage",
    }),
    "solutions",
  );
  assert.equal(
    resolveSearchContentTypeSlug({
      entityType: "CONTENT_ITEM",
      metadata: { contentTypeSlug: "offerings" },
      urlPath: "/en/solutions/indoor-coverage",
    }),
    "offerings",
  );
});

test("aggregateFacetsFromHits counts URL-inferred content types from search-shaped hits", () => {
  const aggs = aggregateFacetsFromHits([
    {
      entityType: "CONTENT_ITEM",
      urlPath: "/en/solutions/indoor-coverage",
      metadata: {},
    },
    {
      entityType: "CATALOG_PRODUCT",
      urlPath: "/en/products/u6",
      facets: { brand: "Ubiquiti" },
    },
  ]);
  const contentType = aggs.find((a) => a.filterId === "contentType");
  assert.ok(contentType);
  assert.deepEqual(contentType.values, [{ value: "solutions", count: 1 }]);
});

test("normalizeIndexRecord forces admin visibility for /admin URLs", () => {
  const normalized = normalizeIndexRecord({
    entityType: "CONTENT_ITEM",
    entityId: "abc123",
    locale: "en",
    title: "Admin leak",
    body: "",
    urlPath: "/admin/content/catalog-items/abc123",
    kind: "content_item",
    visibility: "public",
    boost: 1,
    facets: {},
    metadata: {},
  });
  assert.equal(normalized.visibility, "admin");
  assert.equal(normalized.metadata.visibility, "admin");
});

test("consistency helpers detect title and content-type mismatches", () => {
  assert.equal(hasContentTypeSlugMismatch("catalog-items", "offerings"), true);
  assert.equal(hasContentTypeSlugMismatch("offerings", "offerings"), false);
  assert.equal(hasSearchTitleMismatch("Old Title", "Enterprise Indoor Coverage"), true);
  assert.equal(hasSearchTitleMismatch("Enterprise Indoor Coverage", "Enterprise Indoor Coverage"), false);
});

test("consistency helpers count catalog-item duplicates of public pages", () => {
  const count = countCatalogItemPublicDuplicates({
    catalogItemDocs: [
      {
        entityId: "pkg1",
        locale: "en",
        title: "Enterprise Indoor Coverage",
        urlPath: "/en/packages/indoor",
        contentTypeSlug: "catalog-items",
      },
    ],
    preferredDocs: [
      {
        title: "Enterprise Indoor Coverage",
        urlPath: "/en/services/indoor-coverage",
        locale: "en",
      },
    ],
  });
  assert.equal(count, 1);
});
