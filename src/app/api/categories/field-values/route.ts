import { NextResponse } from "next/server";
import {
  MAIN_CATEGORY_VALUES,
  SPEC_ALIAS_FIELDS,
  normalizeMatchingRulesList,
  productToRuleFields,
  readSpecValueByName,
  type SpecAliasField,
} from "@/features/categories/matching";
import { loadAllProducts } from "@/features/collections/collection-sync.service";
import { requireCatalogAdmin } from "@/lib/catalog-api-auth";
import { normalizeCatalogLocaleCode } from "@/features/catalog/locales";

const SUGGESTION_LIMIT = 40;

const SCALAR_FIELDS = new Set([
  "brand",
  "category",
  "title",
  "name",
  "mainCategory",
  "environment",
  "mountingMethod",
  "generation",
  "antennaDesign",
  "badge",
  "status",
  "stock",
  "mpn",
]);

const LIST_FIELDS = new Set(["categories", "tags", "matchingRules", "specification"]);

function filterAndLimit(values: Iterable<string>, q: string, limit = SUGGESTION_LIMIT): string[] {
  const needle = q.trim().toLowerCase();
  const sorted = [...values]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  const filtered = needle
    ? sorted.filter((v) => v.toLowerCase().includes(needle))
    : sorted;
  return filtered.slice(0, limit);
}

/**
 * GET /api/categories/field-values?field=brand&locale=en-us&q=ubi
 * Returns unique catalog values for a Matching Rules field (search suggestions).
 */
export async function GET(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  try {
    const url = new URL(request.url);
    const field = String(url.searchParams.get("field") || "").trim();
    const q = String(url.searchParams.get("q") || "");
    const locale = await normalizeCatalogLocaleCode(
      String(url.searchParams.get("locale") || "en-us"),
    );

    if (!field) {
      return NextResponse.json({ error: "field is required" }, { status: 400 });
    }

    if (field === "mainCategory") {
      return NextResponse.json({
        field,
        values: filterAndLimit(MAIN_CATEGORY_VALUES, q),
      });
    }

    if (!SCALAR_FIELDS.has(field) && !LIST_FIELDS.has(field) && !field.startsWith("spec:")) {
      return NextResponse.json({ field, values: [] });
    }

    const products = await loadAllProducts(locale);
    const values = new Set<string>();

    for (const { slug, product } of products) {
      if (field in SPEC_ALIAS_FIELDS) {
        const specName = SPEC_ALIAS_FIELDS[field as SpecAliasField];
        const v = readSpecValueByName(product.specifications, specName);
        if (v) values.add(v);
        continue;
      }

      if (field.startsWith("spec:")) {
        const key = field.slice("spec:".length);
        const v = readSpecValueByName(product.specifications, key);
        if (v) values.add(v);
        continue;
      }

      const bag = productToRuleFields(slug, product);
      const raw = bag[field];
      if (Array.isArray(raw)) {
        for (const item of raw) {
          if (item != null && String(item).trim()) values.add(String(item).trim());
        }
      } else if (raw != null && String(raw).trim()) {
        values.add(String(raw).trim());
      }

      if (field === "matchingRules") {
        for (const token of normalizeMatchingRulesList(product.matchingRules)) {
          values.add(token);
        }
      }
    }

    return NextResponse.json({
      field,
      values: filterAndLimit(values, q),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load field values" },
      { status: 500 },
    );
  }
}
