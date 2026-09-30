import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveCompareFields,
  resolveComparisonForType,
  isContentTypeComparable,
} from "@/features/comparison/comparison-schema-resolver";

describe("resolveComparisonForType", () => {
  it("returns comparable when enabled with compare fields", () => {
    const result = resolveComparisonForType({
      fieldSchema: [
        { key: "price", type: "price", labelEn: "Price", compare: true, compareOrder: 1 },
      ],
      adminConfig: {
        isComparable: true,
        comparisonSettings: { enabled: true, maxItems: 3, comparisonMode: "hybrid" },
      },
    });
    assert.equal(result.comparable, true);
    assert.equal(result.fields.length, 1);
    assert.equal(result.config.comparisonSettings.maxItems, 3);
  });

  it("is not comparable without compare fields", () => {
    const result = resolveComparisonForType({
      fieldSchema: [{ key: "title", type: "text", labelEn: "Title" }],
      adminConfig: { isComparable: true, comparisonSettings: { enabled: true } },
    });
    assert.equal(result.comparable, false);
  });

  it("is comparable with compare fields when isComparable is unset", () => {
    const result = resolveComparisonForType({
      fieldSchema: [
        { key: "price", type: "price", labelEn: "Price", compare: true },
      ],
      adminConfig: { comparisonSettings: { enabled: true, maxItems: 4, comparisonMode: "hybrid" } },
    });
    assert.equal(result.comparable, true);
  });

  it("is not comparable when isComparable is explicitly false", () => {
    const result = resolveComparisonForType({
      fieldSchema: [
        { key: "price", type: "price", labelEn: "Price", compare: true },
      ],
      adminConfig: {
        isComparable: false,
        comparisonSettings: { enabled: true, maxItems: 4, comparisonMode: "hybrid" },
      },
    });
    assert.equal(result.comparable, false);
  });
});

describe("resolveCompareFields", () => {
  it("sorts by compareOrder and applies overrides", () => {
    const fields = resolveCompareFields(
      [
        { key: "b", type: "text", labelEn: "B", compare: true, compareOrder: 20 },
        { key: "a", type: "text", labelEn: "A", compare: true, compareOrder: 10 },
      ],
      {
        isComparable: true,
        comparisonSettings: {
          enabled: true,
          maxItems: 4,
          comparisonMode: "table",
          attributes: [{ key: "a", labelEn: "Custom A" }],
        },
      }
    );
    assert.equal(fields[0].key, "a");
    assert.equal(fields[0].labelEn, "Custom A");
    assert.equal(fields[1].key, "b");
  });
});

describe("isContentTypeComparable", () => {
  it("allows enabled settings unless isComparable is explicitly false", () => {
    assert.equal(
      isContentTypeComparable({
        comparisonSettings: { enabled: true },
      }),
      true
    );
    assert.equal(
      isContentTypeComparable({
        isComparable: false,
        comparisonSettings: { enabled: true },
      }),
      false
    );
    assert.equal(
      isContentTypeComparable({
        comparisonSettings: { enabled: false },
      }),
      false
    );
  });
});
