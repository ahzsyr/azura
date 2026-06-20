import "server-only";

import { readFile } from "node:fs/promises";
import { prefixToCode } from "@/i18n/locale-registry.server";
import { translationService } from "@/features/translation/translation.service";
import { getLocalizedField } from "@/lib/utils";
import { fromDbRow } from "@/features/products/db/product-db-mapper";
import {
  applyProductTranslations,
  loadProductLocaleContext,
  resolveProductRow,
  PRODUCT_ENTITY_TYPE,
} from "@/features/products/db/product-translation";
import {
  getProductCatalogIndex,
  getUniqueProductIndexEntries,
  invalidateProductCatalogIndex,
  listIndexSlugs,
  resolveIndexEntry,
} from "./fs/product-catalog-index";
import { resolveProductJsonPath } from "./fs/product-fs-scan";
import {
  mergeProductLocaleFallback,
  shouldMergeLocaleFallback,
} from "./lib/product-locale-clone";
import type { Product, ProductPrice, ProductSummary } from "./types";
import {
  normalizeDetailedDescriptionInput,
  normalizeProductReviewsInput,
} from "./lib/product-detailed-description";
import { productSchema } from "./lib/product-schema";
import { loadProductOverlay } from "./products-persistence";
import { useCatalogProductsDb } from "./products-source";
import { productRepository } from "@/repositories/product.repository";

export type ProductCatalogIssue =
  | {
      kind: "invalid_json";
      slug: string;
      locale: string;
      filePath: string;
      message: string;
    }
  | {
      kind: "validation";
      slug: string;
      locale: string;
      filePath: string;
      message: string;
      fields?: string[];
    };

export { productSchema };

function normalizeLoadedProduct(slug: string, raw: Product): Product {
  const title = (raw.productTitle || raw.name || raw.title || slug).trim() || slug;
  return {
    ...raw,
    id: String(raw.id ?? slug).trim() || slug,
    name: raw.name || title,
    detailed_description: normalizeDetailedDescriptionInput(raw.detailed_description),
    reviews: normalizeProductReviewsInput(raw.reviews),
    media: raw.media?.images ? raw.media : { images: [] },
  };
}

async function readProductFromDb(
  urlPrefix: string,
  slug: string,
): Promise<{ product: Product; localizedSlug: string } | { issue: ProductCatalogIssue } | null> {
  const resolved = await resolveProductRow(urlPrefix, slug);
  if (!resolved?.row) return null;

  const { row, localizedSlug } = resolved;
  const ctx = await loadProductLocaleContext(urlPrefix);
  const translations = await translationService.getForEntity(PRODUCT_ENTITY_TYPE, row.id);
  const product = applyProductTranslations(
    normalizeLoadedProduct(row.canonicalSlug, fromDbRow(row)),
    row.canonicalSlug,
    ctx,
    translations,
  );

  const validated = productSchema.safeParse(product);
  if (!validated.success) {
    return {
      issue: {
        kind: "validation",
        slug: localizedSlug,
        locale: urlPrefix,
        filePath: `db:${row.canonicalSlug}`,
        message: validated.error.message,
        fields: validated.error.issues.map((i) => i.path.join(".")).filter(Boolean),
      },
    };
  }

  return {
    product: normalizeLoadedProduct(localizedSlug, validated.data as unknown as Product),
    localizedSlug,
  };
}

async function readProductFile(
  absPath: string,
  slug: string,
  locale: string,
): Promise<{ product: Product } | { issue: ProductCatalogIssue }> {
  try {
    const overlay = await loadProductOverlay(locale, slug);
    const parsed = overlay ?? (JSON.parse(await readFile(absPath, "utf-8")) as unknown);
    const validated = productSchema.safeParse(parsed);
    if (!validated.success) {
      return {
        issue: {
          kind: "validation",
          slug,
          locale,
          filePath: absPath,
          message: validated.error.message,
          fields: validated.error.issues.map((i) => i.path.join(".")).filter(Boolean),
        },
      };
    }
    return { product: normalizeLoadedProduct(slug, validated.data as unknown as Product) };
  } catch (e) {
    return {
      issue: {
        kind: "invalid_json",
        slug,
        locale,
        filePath: absPath,
        message: e instanceof Error ? e.message : String(e),
      },
    };
  }
}

function pickProductLabel(slug: string, parsed: Record<string, unknown>): string {
  for (const key of ["productTitle", "name", "title"] as const) {
    const v = parsed[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return slug;
}

function toSummary(slug: string, product: Product): ProductSummary {
  const name = product.name || product.productTitle || product.title || slug;
  const images = product.media?.images ?? [];
  const primary = images.find((img) => img.type === "main")?.url || images[0]?.url;
  const secondary = images.find((img) => img.url && img.type !== "main")?.url;
  const out =
    product.stock_status === "out_of_stock" || product.availability === "OutOfStock";
  const price = product.price as ProductPrice;
  return {
    slug,
    id: product.id,
    name,
    brand: product.brand,
    category: (product.category as string | null | undefined) ?? null,
    price,
    old_price: product.old_price ?? undefined,
    short_description: product.short_description,
    availability: product.availability,
    stock_status: product.stock_status,
    mpn: product.mpn || product.manufacturer_part_number,
    rating: product.reviews?.rating ?? 0,
    reviews_count: product.reviews?.count ?? 0,
    primary_image: primary,
    secondary_image: secondary,
    in_stock: !out,
    product_cta: product.product_cta,
  };
}

async function loadSourceProductForFallback(
  slug: string,
): Promise<Product | null> {
  const read = await readProductFromDb("en", slug);
  if (!read || "issue" in read) return null;
  return read.product;
}

async function applyLocaleFallback(
  urlPrefix: string,
  slug: string,
  product: Product,
  issues: ProductCatalogIssue[],
): Promise<{ product: Product; issues: ProductCatalogIssue[] }> {
  if (!shouldMergeLocaleFallback(product)) {
    return { product, issues };
  }

  const sourceProduct = await loadSourceProductForFallback(slug);
  if (!sourceProduct) return { product, issues };

  return {
    product: mergeProductLocaleFallback(product, sourceProduct),
    issues,
  };
}

/** Product loader — filesystem JSON or Prisma Product table (via CATALOG_PRODUCTS_SOURCE). */
export const productsDataService = {
  invalidateIndex: invalidateProductCatalogIndex,

  async getProductSlugs(urlPrefix: string): Promise<string[]> {
    if (useCatalogProductsDb()) {
      const languageCode = await prefixToCode(urlPrefix);
      return productRepository.listLocalizedSlugs(languageCode);
    }
    return listIndexSlugs(urlPrefix);
  },

  async listProductPickerEntries(
    urlPrefix: string,
    limit = 400,
  ): Promise<Array<{ slug: string; name: string }>> {
    if (useCatalogProductsDb()) {
      const languageCode = await prefixToCode(urlPrefix);
      const rows = await productRepository.listPickerEntries(languageCode, limit);
      const ids = rows.map((r) => r.id);
      const translationsMap = await translationService.getForEntities(PRODUCT_ENTITY_TYPE, ids);
      const ctx = await loadProductLocaleContext(urlPrefix);

      return rows
        .map((row) => {
          const translations = translationsMap.get(row.id) ?? [];
          const name =
            getLocalizedField(
              { productTitle: row.canonicalSlug },
              "productTitle",
              urlPrefix,
              {
                enabledLocales: ctx.enabledLocales,
                defaultCode: ctx.defaultCode,
                translations,
              },
            ) || row.canonicalSlug;
          return { slug: row.slug, name };
        })
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    }

    const entries = await getUniqueProductIndexEntries(urlPrefix);
    const out: Array<{ slug: string; name: string }> = [];
    for (const entry of entries) {
      if (out.length >= limit) break;
      try {
        const raw = await readFile(entry.absPath, "utf-8");
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        out.push({ slug: entry.slug, name: pickProductLabel(entry.slug, parsed) });
      } catch {
        out.push({ slug: entry.slug, name: entry.slug });
      }
    }

    return out.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  },

  async getProduct(
    urlPrefix: string,
    slug: string,
  ): Promise<{ product: Product; issues: ProductCatalogIssue[] } | null> {
    const s = slug.trim();
    if (!s) return null;

    if (useCatalogProductsDb()) {
      const read = await readProductFromDb(urlPrefix, s);
      if (!read) return null;
      if ("issue" in read) return null;
      return applyLocaleFallback(urlPrefix, read.localizedSlug, read.product, []);
    }

    const index = await getProductCatalogIndex(urlPrefix);
    let entry = resolveIndexEntry(index, s);

    if (!entry) {
      const absPath = await resolveProductJsonPath(urlPrefix, s);
      if (!absPath) return null;
      const reindexed = await getProductCatalogIndex(urlPrefix);
      entry = resolveIndexEntry(reindexed, s) ?? {
        absPath,
        slug: s,
        fileSlug: s,
        localeKey: urlPrefix,
        catalogLocale: null,
        ruleMeta: {
          slug: s,
          id: s,
          name: s,
          brand: "",
          category: "",
          categories: [],
          tags: [],
          status: "",
          stock: "in-stock",
        },
      };
    }

    const read = await readProductFile(entry.absPath, entry.slug, entry.localeKey);
    if ("issue" in read) {
      return null;
    }

    return applyLocaleFallback(urlPrefix, entry.slug, read.product, []);
  },

  async getAllProducts(
    urlPrefix: string,
  ): Promise<{ products: ProductSummary[]; issues: ProductCatalogIssue[] }> {
    if (useCatalogProductsDb()) {
      const languageCode = await prefixToCode(urlPrefix);
      const rows = await productRepository.findAll();
      const ids = rows.map((r) => r.id);
      const translationsMap = await translationService.getForEntities(PRODUCT_ENTITY_TYPE, ids);
      const slugRows = await productRepository.listPickerEntries(languageCode, rows.length);
      const slugById = new Map(slugRows.map((r) => [r.id, r.slug]));
      const ctx = await loadProductLocaleContext(urlPrefix);

      const products = rows.map((row) => {
        const translations = translationsMap.get(row.id) ?? [];
        const localizedSlug = slugById.get(row.id) ?? row.canonicalSlug;
        const product = applyProductTranslations(
          normalizeLoadedProduct(row.canonicalSlug, fromDbRow(row)),
          row.canonicalSlug,
          ctx,
          translations,
        );
        return toSummary(localizedSlug, product);
      });
      products.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
      return { products, issues: [] };
    }

    const entries = await getUniqueProductIndexEntries(urlPrefix);
    const products: ProductSummary[] = [];
    const issues: ProductCatalogIssue[] = [];

    for (const entry of entries) {
      const loaded = await this.getProduct(urlPrefix, entry.slug);
      if (!loaded) continue;
      products.push(toSummary(entry.slug, loaded.product));
      issues.push(...loaded.issues);
    }

    products.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    return { products, issues };
  },

  async getProductSlugAlternates(
    slug: string,
    locales: Array<{ code: string; urlPrefix: string }>,
  ): Promise<Record<string, string>> {
    const out: Record<string, string> = {};
    const s = slug.trim();
    if (!s) return out;

    if (useCatalogProductsDb()) {
      const resolved = await resolveProductRow(locales[0]?.urlPrefix ?? "en", s);
      if (!resolved?.row) return out;

      await Promise.all(
        locales.map(async (loc) => {
          const localizedSlug = await translationService.getLocalizedSlug(
            PRODUCT_ENTITY_TYPE,
            resolved.row!.id,
            loc.code,
            resolved.row!.canonicalSlug,
          );
          if (localizedSlug) {
            out[loc.code] = localizedSlug;
          }
        }),
      );
      return out;
    }

    await Promise.all(
      locales.map(async (loc) => {
        const loaded = await this.getProduct(loc.urlPrefix, s);
        if (loaded) {
          out[loc.code] = s;
        }
      }),
    );

    return out;
  },
};
