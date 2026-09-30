import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { normalizeImportedProduct } from "@/features/products/import/product-normalizer";
import { validateImportedProduct } from "@/features/products/import/product-validator";
import { pairImportFileEntries } from "@/features/products/import/product-file-pairing";
import { applyMikrotikImportLayoutHint } from "@/features/products/lib/mikrotik-import-meta";
import { applyUnifiImportLayoutHint } from "@/features/products/lib/unifi-import-meta";

const fixturePath = join(import.meta.dirname, "fixtures", "mikrotik-sxtsq-5ax.json");

test("MikroTik converter JSON preserves core fields through import validation", () => {
  const raw = JSON.parse(readFileSync(fixturePath, "utf-8")) as Record<string, unknown>;
  const slug = String(raw.slug || "sxtsq-5-ax");
  const normalized = normalizeImportedProduct(raw, slug);
  const validation = validateImportedProduct(normalized);
  assert.equal(validation.ok, true);
  if (!validation.ok) return;

  assert.equal(validation.product.productTitle, "SXTsq 5 ax");
  assert.equal(validation.product.mpn || validation.product.manufacturer_part_number, "SXTsq-5axD");
  assert.ok((validation.product.specifications?.length ?? 0) >= 4);
  assert.ok((validation.product.documents?.length ?? 0) >= 1);
  assert.ok((validation.product.detailed_description?.length ?? 0) >= 1);
  assert.equal(validation.product.brand, "MikroTik");
});

test("paired CSV Meta: _output_format sets MikroTik layout", () => {
  const json = readFileSync(fixturePath, "utf-8");
  const csv = "Type,Name,Meta: _output_format\nsimple,SXTsq 5 ax,mikrotik\n";
  const paired = pairImportFileEntries([
    { name: "mikrotik-sxtsq-5ax.json", content: json },
    { name: "mikrotik-sxtsq-5ax.csv", content: csv },
  ]);
  assert.equal(paired.products[0]?.product.page_layout_template, "mikrotik");
});

test("explicit default layout is not overwritten by CSV mikrotik hint", () => {
  const hinted = applyMikrotikImportLayoutHint(
    { page_layout_template: "default", output_format: "mikrotik" },
    "Type,Meta: _output_format\nsimple,mikrotik\n",
  );
  assert.equal(hinted.page_layout_template, "default");
});

test("JSON output_format sets MikroTik layout", () => {
  const hinted = applyMikrotikImportLayoutHint({ output_format: "mikrotik" });
  assert.equal(hinted.page_layout_template, "mikrotik");
});

test("MikroTik hint does not rewrite UniFi products", () => {
  const hinted = applyMikrotikImportLayoutHint({ output_format: "unifi" });
  assert.notEqual(hinted.page_layout_template, "mikrotik");
  const unifi = applyUnifiImportLayoutHint({ output_format: "unifi" });
  assert.equal(unifi.page_layout_template, "unifi");
  const stillUnifi = applyMikrotikImportLayoutHint(unifi);
  assert.equal(stillUnifi.page_layout_template, "unifi");
});
