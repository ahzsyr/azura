import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import type { Product as DbProduct } from "@prisma/client";
import { toDbRow, fromDbRow } from "@/features/products/db/product-db-mapper";
import { normalizeImportedProduct } from "@/features/products/import/product-normalizer";
import { validateImportedProduct } from "@/features/products/import/product-validator";
import { pairImportFileEntries } from "@/features/products/import/product-file-pairing";
import { applyUnifiImportLayoutHint } from "@/features/products/lib/unifi-import-meta";
import { nestedSpecRows } from "@/features/products/lib/product-spec-rows";
import { resolveModel3d, sectionsForTab } from "@/features/products/lib/unifi-product-sections";
import type { ProductModel3dObject } from "@/features/products/types";

const fixturePath = join(import.meta.dirname, "fixtures", "unifi-u7-pro-xg.json");
const defaultFixturePath = join(import.meta.dirname, "fixtures", "full-product-document.json");

test("UniFi converter JSON preserves rich fields through import mapper round-trip", () => {
  const raw = JSON.parse(readFileSync(fixturePath, "utf-8")) as Record<string, unknown>;
  const slug = String(raw.slug);
  const normalized = normalizeImportedProduct(raw, slug);
  const validation = validateImportedProduct(normalized);
  assert.equal(validation.ok, true);
  if (!validation.ok) return;

  const overview = sectionsForTab(validation.product, "overview");
  assert.ok(overview.length >= 2);
  assert.equal(overview[0]?.tab, "overview");
  assert.ok((overview[0]?.features?.length ?? 0) > 0);
  assert.equal(overview[0]?.features?.[0]?.hotspot?.dotX, 0.25);
  assert.ok((overview[1]?.media?.length ?? 0) > 0);

  const install = sectionsForTab(validation.product, "installation");
  assert.equal(install[0]?.videos?.[0]?.poster, "https://example.com/poster-black.png");
  assert.equal(install[0]?.videos?.[0]?.color, "Black");

  const box = sectionsForTab(validation.product, "in_the_box");
  assert.equal(box[0]?.media?.[0]?.url, "https://example.com/box-black.png");
  assert.equal(box[0]?.media?.[0]?.color, "Black");

  const technical = sectionsForTab(validation.product, "technical");
  assert.equal(technical[0]?.media?.[0]?.color, "Black");

  const model = resolveModel3d(validation.product);
  assert.ok(model && typeof model === "object");
  assert.equal(model?.url, "https://example.com/model.glb");
  assert.equal(model?.variants?.[0]?.color, "Black");

  const nested = nestedSpecRows(validation.product.specifications![0]!);
  assert.equal(nested[0]?.isGroup, true);
  assert.equal(nested[1]?.item.parent, "MIMO");
  assert.equal(validation.product.bought_together?.[0]?.name, "10G PoE++ Adapter (60W)");

  const create = toDbRow({
    canonicalSlug: slug,
    product: validation.product,
    meta: { sourceType: "json", sourceFile: "unifi-u7-pro-xg.json" },
  });
  const mockRow = {
    ...create,
    id: "test-unifi-id",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-02"),
  } as DbProduct;
  const roundTripped = fromDbRow(mockRow);
  const roundModel = roundTripped.media["3d_model"] as ProductModel3dObject;
  assert.equal(typeof roundModel, "object");
  assert.equal(roundModel.url, "https://example.com/model.glb");
  assert.equal(roundTripped.media.images[0]?.color, "Black");
  assert.equal(roundTripped.media.images[1]?.color, "White");
  const combos = roundTripped.variation_combinations ?? [];
  assert.equal((combos[0] as { Color?: string }).Color, "Black");
  assert.equal(sectionsForTab(roundTripped, "overview")[0]?.features?.[0]?.title, "6-Stream Tri-Radio WiFi 7");
});

test("paired CSV Meta: _output_format sets UniFi layout without changing default products", () => {
  const json = readFileSync(fixturePath, "utf-8");
  const csv = "Type,Name,Meta: _output_format\nvariable,U7 Pro XG,unifi\n";
  const paired = pairImportFileEntries([
    { name: "unifi-U7-Pro-XG.json", content: json },
    { name: "unifi-U7-Pro-XG.csv", content: csv },
  ]);
  assert.equal(paired.products[0]?.product.page_layout_template, "unifi");

  const defaultJson = readFileSync(defaultFixturePath, "utf-8");
  const defaultPaired = pairImportFileEntries([{ name: "amplifi.json", content: defaultJson }]);
  assert.notEqual(defaultPaired.products[0]?.product.page_layout_template, "unifi");
});

test("explicit default layout is not overwritten by CSV unifi hint", () => {
  const hinted = applyUnifiImportLayoutHint(
    { page_layout_template: "default", output_format: "unifi" },
    "Type,Meta: _output_format\nvariable,unifi\n",
  );
  assert.equal(hinted.page_layout_template, "default");
});

test("JSON output_format sets UniFi layout", () => {
  const hinted = applyUnifiImportLayoutHint({ output_format: "unifi" });
  assert.equal(hinted.page_layout_template, "unifi");
});
