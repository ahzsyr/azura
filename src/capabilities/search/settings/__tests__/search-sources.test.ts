import test from "node:test";
import assert from "node:assert/strict";
import type { SearchSourcesSettings } from "@/capabilities/search/settings/admin-search-settings.schema";
import {
  isContentTypeSlugSearchable,
  resolveContentTypeSourceLabel,
} from "@/capabilities/search/settings/search-sources";

function sources(partial: Partial<SearchSourcesSettings> = {}): SearchSourcesSettings {
  return {
    products: true,
    packages: true,
    listings: true,
    offerings: true,
    projects: true,
    collections: true,
    pages: true,
    posts: true,
    media: false,
    customContentTypes: true,
    contentTypeSlugs: {},
    contentTypeLandings: true,
    faqs: true,
    testimonials: true,
    ...partial,
  };
}

test("explicit slug override wins over a legacy builtin flag", () => {
  const settings = sources({
    packages: true,
    offerings: false,
    contentTypeSlugs: { "catalog-items": false, offerings: true },
  });
  assert.equal(isContentTypeSlugSearchable("catalog-items", settings), false);
  assert.equal(isContentTypeSlugSearchable("offerings", settings), true);
});

test("a renamed builtin follows its origin flag until the current slug is set", () => {
  const settings = sources({ offerings: false });
  assert.equal(isContentTypeSlugSearchable("services", settings, "offerings"), false);
  assert.equal(
    isContentTypeSlugSearchable("services", sources({
      offerings: false,
      contentTypeSlugs: { services: true },
    }), "offerings"),
    true
  );
});

test("custom types use the custom default when they have no explicit slug", () => {
  assert.equal(isContentTypeSlugSearchable("guides", sources({ customContentTypes: false })), false);
  assert.equal(isContentTypeSlugSearchable("guides", sources()), true);
});

test("content type labels prefer the plural name", () => {
  assert.equal(
    resolveContentTypeSourceLabel({ en: "Services" }, { en: "Service" }, "offerings", "en"),
    "Services"
  );
  assert.equal(resolveContentTypeSourceLabel({}, { ar: "خدمة" }, "offerings"), "خدمة");
  assert.equal(resolveContentTypeSourceLabel({}, {}, "offerings"), "offerings");
});
