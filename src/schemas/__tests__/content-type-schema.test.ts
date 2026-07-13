import test from "node:test";
import assert from "node:assert/strict";
import { contentFieldDefinitionSchema, contentTypeSchema } from "@/schemas/content/content-type";

test("contentFieldDefinitionSchema accepts labelEn from visual editor", () => {
  const field = contentFieldDefinitionSchema.parse({
    key: "make",
    type: "text",
    labelEn: "Make",
    localized: true,
  });
  assert.equal(field.labelEn, "Make");
});

test("contentFieldDefinitionSchema normalizes JSON label to labelEn", () => {
  const field = contentFieldDefinitionSchema.parse({
    key: "model",
    type: "text",
    label: "Model",
  });
  assert.equal(field.labelEn, "Model");
});

test("contentTypeSchema validates required localized labels", () => {
  const parsed = contentTypeSchema.parse({
    slug: "vehicles",
    name: "Vehicles",
    labelSingular: "Vehicle",
    labelPlural: "Vehicles",
    fieldSchema: [],
  });
  assert.equal(parsed.slug, "vehicles");
});
