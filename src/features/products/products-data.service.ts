import "server-only";

import { readFile } from "node:fs/promises";
import { z } from "zod";
import { DEFAULT_CATALOG_LOCALE } from "@/features/catalog/locales";
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

const priceSchema = z.object({
  value: z.number(),
  currency: z.enum(["USD", "EUR", "AED", "GBP", "JPY"]),
  discount: z.number().nullable().optional(),
});

const productSchema = z.object({
  id: z.string().min(1),
  productTitle: z.string().min(1),
  name: z.string().optional(),
  title: z.string().optional(),
  title_extended: z.string().nullable().optional(),
  short_description: z.string().optional(),
  description: z.string().optional(),
  price: priceSchema,
  old_price: z.number().nullable().optional(),
  availability: z.enum(["InStock", "OutOfStock", "PreOrder", "RequestQuote"]).optional(),
  stock_status: z.enum(["in_stock", "out_of_stock", "preorder"]).optional(),
  mpn: z.string().optional(),
  manufacturer_part_number: z.string().optional(),
  ean: z.string().optional(),
  brand: z.string().optional(),
  warranty: z.string().optional(),
  category: z.union([z.string(), z.null()]).optional(),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  media: z.object({
    images: z
      .array(
        z.object({
          url: z.string().optional(),
          alt: z.string().optional(),
          type: z.enum(["main", "gallery", "thumbnail"]).optional(),
        }),
      )
      .default([]),
  }),
  reviews: z
    .object({
      rating: z.number(),
      count: z.number().int().nonnegative(),
    })
    .passthrough(),
}).passthrough();

function normalizeLoadedProduct(slug: string, raw: Product): Product {
  const title = (raw.productTitle || raw.name || raw.title || slug).trim() || slug;
  return {
    ...raw,
    id: String(raw.id ?? slug).trim() || slug,
    productTitle: title,
    name: raw.name || title,
    detailed_description: normalizeDetailedDescriptionInput(raw.detailed_description),
    reviews: normalizeProductReviewsInput(raw.reviews),
    media: raw.media?.images ? raw.media : { images: [] },
  };
}

async function readProductFile(
  absPath: string,
  slug: string,
  locale: string,
): Promise<{ product: Product } | { issue: ProductCatalogIssue }> {
  try {
    const raw = await readFile(absPath, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
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

async function applyLocaleFallback(
  urlPrefix: string,
  slug: string,
  product: Product,
  issues: ProductCatalogIssue[],
): Promise<{ product: Product; issues: ProductCatalogIssue[] }> {
  if (!shouldMergeLocaleFallback(product)) {
    return { product, issues };
  }

  const defaultIndex = await getProductCatalogIndex(DEFAULT_CATALOG_LOCALE);
  const sourceEntry = resolveIndexEntry(defaultIndex, slug);
  if (!sourceEntry) return { product, issues };

  const sourceRead = await readProductFile(
    sourceEntry.absPath,
    sourceEntry.slug,
    sourceEntry.localeKey,
  );
  if ("issue" in sourceRead) {
    return { product, issues: [...issues, sourceRead.issue] };
  }

  return {
    product: mergeProductLocaleFallback(product, sourceRead.product),
    issues,
  };
}

/** Product loader — reads from `src/data/<locale>/products/**.json` via a single-pass index. */
export const productsDataService = {
  invalidateIndex: invalidateProductCatalogIndex,

  async getProductSlugs(urlPrefix: string): Promise<string[]> {
    return listIndexSlugs(urlPrefix);
  },

  async listProductPickerEntries(
    urlPrefix: string,
    limit = 400,
  ): Promise<Array<{ slug: string; name: string }>> {
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

    // #region agent log
    fetch("http://127.0.0.1:7876/ingest/6e6c5bde-6579-4633-b8e0-f055b7efa2da", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "bd4a08" },
      body: JSON.stringify({
        sessionId: "bd4a08",
        runId: "pre-fix",
        hypothesisId: "H1",
        location: "products-data.service.ts:getProduct",
        message: "resolved product entry",
        data: {
          slug: s,
          urlPrefix,
          absPath: entry.absPath,
          entrySlug: entry.slug,
          fileSlug: entry.fileSlug,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    const read = await readProductFile(entry.absPath, entry.slug, entry.localeKey);
    if ("issue" in read) {
      // #region agent log
      fetch("http://127.0.0.1:7876/ingest/6e6c5bde-6579-4633-b8e0-f055b7efa2da", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "bd4a08" },
        body: JSON.stringify({
          sessionId: "bd4a08",
          runId: "pre-fix",
          hypothesisId: "H4",
          location: "products-data.service.ts:getProduct",
          message: "product read failed",
          data: { slug: s, issue: read.issue },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      return null;
    }

    return applyLocaleFallback(urlPrefix, entry.slug, read.product, []);
  },

  async getAllProducts(
    urlPrefix: string,
  ): Promise<{ products: ProductSummary[]; issues: ProductCatalogIssue[] }> {
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
