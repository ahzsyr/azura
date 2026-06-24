import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyPatch,
  computePatch,
  isEmptyPatch,
  flattenPatchPaths,
  getChangedSections,
  countPatchFields,
  deepEqual,
  cmsPatchAffectsRevision,
  cmsPatchAffectsSearch,
  cmsPatchAffectsTranslations,
  contentPatchAffectsPublicPage,
  contentPatchAffectsSearch,
  postPatchAffectsPublicPage,
} from "@/lib/patch";

describe("deepEqual", () => {
  it("compares primitives and nested structures", () => {
    assert.equal(deepEqual(1, 1), true);
    assert.equal(deepEqual({ a: 1 }, { a: 1 }), true);
    assert.equal(deepEqual({ a: 1 }, { a: 2 }), false);
    assert.equal(deepEqual([1, 2], [1, 2]), true);
    assert.equal(deepEqual([1, 2], [1, 3]), false);
  });
});

describe("computePatch", () => {
  it("returns empty patch when nothing changed", () => {
    const orig = { title: "A", seo: { metaTitle: "X" } };
    const patch = computePatch(orig, { ...orig, seo: { ...orig.seo } });
    assert.equal(isEmptyPatch(patch), true);
  });

  it("includes only changed leaf fields", () => {
    const orig = { title: "Old", seo: { metaTitle: "X", metaDesc: "Y" } };
    const curr = { title: "New", seo: { metaTitle: "X", metaDesc: "Y" } };
    const patch = computePatch(orig, curr);
    assert.deepEqual(patch, { title: "New" });
  });

  it("includes nested object patches", () => {
    const orig = { title: "A", seo: { metaTitle: "X", metaDesc: "Y" } };
    const curr = { title: "A", seo: { metaTitle: "Updated", metaDesc: "Y" } };
    const patch = computePatch(orig, curr);
    assert.deepEqual(patch, { seo: { metaTitle: "Updated" } });
  });

  it("treats arrays as atomic", () => {
    const orig = { items: [{ id: "1", v: 1 }] };
    const curr = { items: [{ id: "1", v: 2 }] };
    const patch = computePatch(orig, curr);
    assert.deepEqual(patch, { items: [{ id: "1", v: 2 }] });
  });

  it("detects new keys", () => {
    const orig = { a: 1 } as Record<string, unknown>;
    const curr = { a: 1, b: 2 };
    const patch = computePatch(orig, curr);
    assert.deepEqual(patch, { b: 2 });
  });
});

describe("applyPatch", () => {
  it("deep merges objects", () => {
    const base = { title: "A", seo: { metaTitle: "X", metaDesc: "Y" } };
    const merged = applyPatch(base, { seo: { metaTitle: "Updated" } });
    assert.deepEqual(merged, {
      title: "A",
      seo: { metaTitle: "Updated", metaDesc: "Y" },
    });
  });

  it("replaces arrays atomically", () => {
    const base = { items: [1, 2, 3] };
    const merged = applyPatch(base, { items: [4] });
    assert.deepEqual(merged, { items: [4] });
  });

  it("round-trips with computePatch", () => {
    const orig = { title: "Old", price: { value: 10 }, tags: ["a"] };
    const curr = { title: "New", price: { value: 120 }, tags: ["a", "b"] };
    const patch = computePatch(orig, curr);
    const merged = applyPatch(orig, patch);
    assert.deepEqual(merged, curr);
  });
});

describe("patch paths", () => {
  it("flattens nested paths", () => {
    const paths = flattenPatchPaths({
      title: "X",
      seo: { metaTitle: "Y" },
      pricing: { basePrice: 120 },
    });
    assert.deepEqual(paths.sort(), ["pricing.basePrice", "seo.metaTitle", "title"].sort());
  });

  it("maps paths to sections", () => {
    const sections = getChangedSections(
      ["title", "seo.metaTitle", "pricing.basePrice"],
      [
        { prefix: "seo", label: "SEO" },
        { prefix: "pricing", label: "Pricing" },
        { prefix: "title", label: "General" },
      ],
    );
    assert.deepEqual(sections.sort(), ["General", "Pricing", "SEO"].sort());
  });

  it("counts patch fields", () => {
    assert.equal(
      countPatchFields({ title: "A", seo: { metaTitle: "B", metaDesc: "C" } }),
      3,
    );
  });
});

describe("isEmptyPatch", () => {
  it("handles nullish and empty objects", () => {
    assert.equal(isEmptyPatch(null), true);
    assert.equal(isEmptyPatch(undefined), true);
    assert.equal(isEmptyPatch({}), true);
    assert.equal(isEmptyPatch({ a: 1 }), false);
  });
});

describe("patch side-effect classification", () => {
  it("classifies CMS page translation and revision fields", () => {
    const paths = ["localeFields.title.en"];
    assert.equal(cmsPatchAffectsTranslations(paths), true);
    assert.equal(cmsPatchAffectsSearch(paths), true);
    assert.equal(cmsPatchAffectsRevision(paths), true);
  });

  it("classifies content item public and search fields", () => {
    assert.equal(contentPatchAffectsPublicPage(["displaySettings.cardLayout"]), true);
    assert.equal(contentPatchAffectsSearch(["displaySettings.cardLayout"]), false);
    assert.equal(contentPatchAffectsSearch(["attributes.title.en"]), true);
  });

  it("classifies post public fields", () => {
    assert.equal(postPatchAffectsPublicPage(["categoryIds"]), true);
    assert.equal(postPatchAffectsPublicPage(["scheduledAt"]), false);
  });
});
