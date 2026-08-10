import test from "node:test";
import assert from "node:assert/strict";
import {
  applyDefaultSearchFlags,
  mergeSearchDefaultsIntoAdminConfig,
} from "@/features/content/generate-search-profile-defaults";

test("applyDefaultSearchFlags marks localized text fields searchable", () => {
  const fields = applyDefaultSearchFlags([
    { key: "make", type: "text", labelEn: "Make", localized: true },
    { key: "year", type: "number", labelEn: "Year" },
  ]);
  assert.equal(fields[0]?.search, true);
  assert.deepEqual(fields[1]?.search, { facet: true });
});

test("mergeSearchDefaultsIntoAdminConfig adds search.index when missing", () => {
  const merged = mergeSearchDefaultsIntoAdminConfig(
    { inquiryEnabled: true },
    [{ key: "make", type: "text", labelEn: "Make", localized: true, search: true }],
  );
  const search = merged.search as Record<string, unknown>;
  assert.ok(search.index);
});
