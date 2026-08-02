import test from "node:test";
import assert from "node:assert/strict";
import {
  getContentItemTranslatableFields,
  getSchemaAttributeTranslatableFields,
  translationFieldFromAttributeKey,
} from "@/features/translation/content-type-translation-registry";

const vehicleSchema = [
  { key: "make", type: "text" as const, labelEn: "Make", localized: true },
  { key: "year", type: "number" as const, labelEn: "Year" },
  { key: "summary", type: "textarea" as const, labelEn: "Summary", localized: true },
];

test("getSchemaAttributeTranslatableFields returns localized schema fields", () => {
  const fields = getSchemaAttributeTranslatableFields(vehicleSchema);
  assert.deepEqual(
    fields.map((f) => f.field),
    ["attr:make", "attr:summary"],
  );
});

test("getContentItemTranslatableFields merges core and schema fields", () => {
  const fields = getContentItemTranslatableFields(vehicleSchema);
  assert.ok(fields.some((f) => f.field === "title"));
  assert.ok(fields.some((f) => f.field === translationFieldFromAttributeKey("make")));
});
