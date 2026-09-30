import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildComparableTypeBySlugMap,
  findComparableTypeMeta,
} from "@/features/comparison/resolve-comparable-type";

type TestType = {
  slug: string;
  labelPluralEn: string;
};

const catalogType: TestType = {
  slug: "catalog-items",
  labelPluralEn: "Catalog items",
};

const listingsType: TestType = {
  slug: "listings",
  labelPluralEn: "Listings",
};

describe("findComparableTypeMeta", () => {
  const types = [catalogType, listingsType];

  it("finds type by canonical bucket slug", () => {
    assert.equal(findComparableTypeMeta(types, "catalog-items"), catalogType);
  });

  it("finds catalog-items when bucket uses legacy packages slug", () => {
    assert.equal(findComparableTypeMeta(types, "packages"), catalogType);
  });

  it("finds listings when bucket uses legacy hotels slug", () => {
    assert.equal(findComparableTypeMeta(types, "hotels"), listingsType);
  });

  it("returns undefined when no matching comparable type", () => {
    assert.equal(findComparableTypeMeta(types, "vehicles"), undefined);
  });
});

describe("buildComparableTypeBySlugMap", () => {
  it("indexes types by raw and canonical slugs", () => {
    const map = buildComparableTypeBySlugMap([catalogType]);
    assert.equal(map.get("catalog-items"), catalogType);
    assert.equal(map.get("packages"), catalogType);
    assert.equal(map.get("package"), catalogType);
  });
});
