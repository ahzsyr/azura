import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import type { Product as DbProduct } from "@prisma/client";
import { toDbRow, fromDbRow } from "@/features/products/db/product-db-mapper";
import { normalizeImportedProduct } from "@/features/products/import/product-normalizer";
import { validateImportedProduct } from "@/features/products/import/product-validator";

const templatePath = join(
  import.meta.dirname,
  "fixtures",
  "full-product-document.json",
);

test("converter template JSON preserves rich fields through import mapper round-trip", () => {
  const raw = JSON.parse(readFileSync(templatePath, "utf-8")) as Record<string, unknown>;
  raw.getic_uid = "afi-aln-test";

  const slug = String(raw.slug ?? "amplifi-alien-router-and-meshpoint");
  const normalized = normalizeImportedProduct(raw, slug);
  const validation = validateImportedProduct(normalized);
  assert.equal(validation.ok, true);
  if (!validation.ok) return;

  const create = toDbRow({
    locale: "en-us",
    slug,
    product: validation.product,
    meta: { sourceType: "json", sourceFile: "template-json.json" },
  });

  const mockRow = {
    ...create,
    id: "test-product-id",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-02"),
  } as DbProduct;

  const roundTripped = fromDbRow(mockRow);

  assert.ok(Array.isArray(roundTripped.detailed_description));
  assert.ok((roundTripped.detailed_description?.length ?? 0) > 0);
  assert.ok(Array.isArray(roundTripped.specifications));
  assert.ok((roundTripped.specifications?.length ?? 0) > 0);
  assert.ok(Array.isArray(roundTripped.variation_combinations));
  assert.ok((roundTripped.variation_combinations?.length ?? 0) > 0);
  assert.ok(roundTripped.page_display && typeof roundTripped.page_display === "object");
  assert.equal(roundTripped.getic_uid, "afi-aln-test");
  assert.ok(Array.isArray(roundTripped.media?.images));
  assert.ok((roundTripped.media?.images?.length ?? 0) > 0);
});

test("pairImportFileEntries imports JSON and skips CSV-only", async () => {
  const { pairImportFileEntries } = await import("@/features/products/import/product-file-pairing");
  const json = readFileSync(templatePath, "utf-8");

  const paired = pairImportFileEntries([
    { name: "Product A.json", content: json },
    { name: "Product A.csv", content: "Type,Name\nsimple,Test" },
    { name: "Orphan.csv", content: "Type,Name\nsimple,Orphan" },
  ]);

  assert.equal(paired.products.length, 1);
  assert.equal(paired.products[0]?.pairedCsv, "Product A.csv");
  assert.equal(paired.csvOnlyCount, 1);
  assert.ok(paired.skipped.some((s) => s.kind === "csv_without_json"));
});
