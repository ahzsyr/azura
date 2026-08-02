import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { CompareFieldMeta, CompareItemSnapshot } from "@/features/comparison/types";
import {
  buildCompareTable,
  filterCompareEntriesByGroups,
  getCompareGroupsFromFields,
} from "@/features/comparison/comparison-engine";

function meta(
  key: string,
  group: string,
  overrides?: Partial<CompareFieldMeta>
): CompareFieldMeta {
  return {
    key,
    field: { key, type: "text", labelEn: key },
    labelEn: key,
    compareOrder: 0,
    compareGroup: group,
    highlightDifferences: true,
    ...overrides,
  };
}

const items: CompareItemSnapshot[] = [
  {
    id: "1",
    contentTypeSlug: "pkg",
    slug: "a",
    titleEn: "A",
    titleAr: "A",
    href: "/a",
    imageUrl: null,
    attributes: { duration: 7, brand: "X" },
  },
  {
    id: "2",
    contentTypeSlug: "pkg",
    slug: "b",
    titleEn: "B",
    titleAr: "B",
    href: "/b",
    imageUrl: null,
    attributes: { duration: 10, brand: "Y" },
  },
];

describe("buildCompareTable", () => {
  const fields = [
    meta("duration", "Pricing", { compareOrder: 10, field: { key: "duration", type: "number", labelEn: "Days" } }),
    meta("brand", "Details", { compareOrder: 20 }),
  ];

  it("builds grouped rows for all mode", () => {
    const entries = buildCompareTable(items, fields, "en", "all");
    assert.ok(entries.some((e) => e.type === "group" && e.group === "Pricing"));
    const durationRow = entries.find((e) => e.type === "row" && e.key === "duration");
    assert.ok(durationRow && durationRow.type === "row");
    assert.deepEqual(durationRow.values, ["7", "10"]);
    assert.equal(durationRow.differs, true);
  });

  it("filters to differences only", () => {
    const entries = buildCompareTable(items, fields, "en", "differences");
    const rowKeys = entries.filter((e) => e.type === "row").map((e) => (e.type === "row" ? e.key : ""));
    assert.ok(rowKeys.includes("duration"));
    assert.ok(rowKeys.includes("brand"));
  });
});

describe("filterCompareEntriesByGroups", () => {
  it("returns subset when groups selected", () => {
    const entries = buildCompareTable(items, [
      meta("duration", "Pricing"),
      meta("brand", "Details"),
    ], "en", "all");
    const filtered = filterCompareEntriesByGroups(entries, new Set(["Pricing"]));
    assert.ok(filtered.some((e) => e.type === "group" && e.group === "Pricing"));
    assert.ok(!filtered.some((e) => e.type === "group" && e.group === "Details"));
  });
});

describe("getCompareGroupsFromFields", () => {
  it("returns unique groups in field order", () => {
    const groups = getCompareGroupsFromFields([
      meta("a", "Z"),
      meta("b", "A"),
      meta("c", "Z"),
    ]);
    assert.deepEqual(groups, ["Z", "A"]);
  });
});

describe("rowDiffers via table", () => {
  it("marks identical values as not differing", () => {
    const same: CompareItemSnapshot[] = [
      { ...items[0], attributes: { brand: "Same" } },
      { ...items[1], attributes: { brand: "Same" } },
    ];
    const entries = buildCompareTable(same, [meta("brand", "G")], "en", "all");
    const row = entries.find((e) => e.type === "row" && e.key === "brand");
    assert.ok(row && row.type === "row");
    assert.equal(row.differs, false);
  });
});
