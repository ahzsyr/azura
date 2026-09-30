import assert from "node:assert/strict";
import test from "node:test";
import { mapContentCardToCatalogCard, resolveCatalogCardSource } from "@/features/catalog/map-content-card-to-catalog-card";
import { formatCatalogCityLabel, resolveCatalogCardLocation } from "@/features/catalog/catalog-card-location";
import type { ContentCardData } from "@/features/content/types";
import { mergeMissingBuiltinFields } from "@/features/content/content-type.registry";

function card(partial: Partial<ContentCardData> & Pick<ContentCardData, "contentTypeSlug">): ContentCardData {
  return {
    id: "1",
    slug: "enterprise-security-solutions",
    title: "Enterprise Security Solutions",
    titleEn: "Enterprise Security Solutions",
    titleAr: "",
    attributes: {},
    images: [],
    ...partial,
  };
}

test("custom content types are not treated as packages", () => {
  assert.equal(resolveCatalogCardSource("solutions"), "solutions");
  assert.equal(resolveCatalogCardSource("catalog-items"), "packages");
  assert.equal(resolveCatalogCardSource("listings"), "hotels");
  assert.equal(resolveCatalogCardSource("offerings"), "services");
});

test("solutions cards do not inherit a hardcoded package location", () => {
  const mapped = mapContentCardToCatalogCard(
    card({
      contentTypeSlug: "solutions",
      excerpt: "Modern facility management requires moving past reactive security postures.",
      excerptEn: "Modern facility management requires moving past reactive security postures.",
    }),
  );
  assert.equal(mapped.source, "solutions");
  assert.equal(mapped.locationEn, undefined);
  assert.equal(mapped.city, undefined);
  assert.equal(resolveCatalogCardLocation(mapped, "en"), "");
});

test("catalog cards use the editable location attribute", () => {
  const mapped = mapContentCardToCatalogCard(
    card({
      contentTypeSlug: "catalog-items",
      attributes: { locationEn: "Dubai, UAE", locationAr: "دبي" },
    }),
  );
  assert.equal(mapped.source, "packages");
  assert.equal(mapped.locationEn, "Dubai, UAE");
  assert.equal(resolveCatalogCardLocation(mapped, "en"), "Dubai, UAE");
  assert.equal(resolveCatalogCardLocation(mapped, "ar"), "دبي");
});

test("unlocalized location and city codes resolve for the card", () => {
  const fromLocation = mapContentCardToCatalogCard(
    card({ contentTypeSlug: "solutions", attributes: { location: "Abu Dhabi" } }),
  );
  assert.equal(resolveCatalogCardLocation(fromLocation, "en"), "Abu Dhabi");

  const fromCity = mapContentCardToCatalogCard(
    card({ contentTypeSlug: "listings", attributes: { city: "MAKKAH" } }),
  );
  assert.equal(fromCity.source, "hotels");
  assert.equal(formatCatalogCityLabel(fromCity.city), "Makkah");
  assert.equal(resolveCatalogCardLocation(fromCity, "en"), "Makkah");
});

test("mergeMissingBuiltinFields appends new location field without replacing existing ones", () => {
  const merged = mergeMissingBuiltinFields(
    [{ key: "duration", type: "number", labelEn: "Duration" }],
    [
      { key: "duration", type: "number", labelEn: "Duration (days)" },
      { key: "location", type: "text", labelEn: "Location", localized: true, group: "location" },
    ],
  );
  assert.ok(merged);
  assert.equal(merged?.map((field) => field.key).join(","), "duration,location");
  assert.equal(merged?.[0]?.labelEn, "Duration");
});
