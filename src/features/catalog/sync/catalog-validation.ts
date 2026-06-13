import "server-only";

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { catalogEntityId } from "@/features/search-framework/providers/catalog-providers";
import { loadCollectionsFromFs } from "@/features/collections/collections-fs";
import { catalogProductToCollectionProduct } from "@/features/collections/engine";
import { detectOrphanProducts } from "@/features/products/product-collections";
import type { ProductListingIndexFile } from "@/features/products/index/product-index-types";
import { localeIndexDir } from "@/features/products/index/product-index-builder";

export type CatalogValidationIssue = {
  level: "error" | "warn";
  code: string;
  message: string;
};

export type CatalogValidationReport = {
  generatedAt: string;
  errors: CatalogValidationIssue[];
  warnings: CatalogValidationIssue[];
};

async function walkProductJsonPaths(dir: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(d: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.isFile() && e.name.endsWith(".json")) out.push(p);
    }
  }
  await walk(dir);
  return out;
}

function slugFromPath(path: string): string {
  const name = path.split(/[/\\]/).pop() ?? "";
  return name.replace(/\.json$/i, "");
}

export async function countOrphanIndexEntries(
  locale: string,
): Promise<{ orphans: string[]; indexCount: number; filesystemCount: number }> {
  const root = join(process.cwd(), "src", "data");
  const productsDir = join(root, locale, "products");
  const jsonPaths = await walkProductJsonPaths(productsDir);
  const fsSlugs = new Set(jsonPaths.map(slugFromPath));

  const listingPath = join(localeIndexDir(locale as "en-us" | "ar-ae"), "product-listing-index.json");
  let listing: ProductListingIndexFile | null = null;
  try {
    listing = JSON.parse(await readFile(listingPath, "utf-8")) as ProductListingIndexFile;
  } catch {
    return { orphans: [], indexCount: 0, filesystemCount: fsSlugs.size };
  }

  const indexSlugs = (listing.records ?? []).map((r) => r.slug);
  const orphans = indexSlugs.filter((slug) => !fsSlugs.has(slug));

  return {
    orphans,
    indexCount: indexSlugs.length,
    filesystemCount: fsSlugs.size,
  };
}

export async function validateCatalogConsistency(
  locales: string[] = ["en-us", "ar-ae"],
): Promise<CatalogValidationReport> {
  const errors: CatalogValidationIssue[] = [];
  const warnings: CatalogValidationIssue[] = [];
  const root = join(process.cwd(), "src", "data");

  for (const locale of locales) {
    const productsDir = join(root, locale, "products");
    const jsonPaths = await walkProductJsonPaths(productsDir);
    const fsSlugs = new Set(jsonPaths.map(slugFromPath));
    const slugCounts = new Map<string, number>();
    for (const s of fsSlugs) {
      const k = s.toLowerCase();
      slugCounts.set(k, (slugCounts.get(k) ?? 0) + 1);
    }
    for (const [k, n] of slugCounts) {
      if (n > 1) {
        warnings.push({
          level: "warn",
          code: "DUPLICATE_SLUG",
          message: `${locale}: duplicate slug "${k}" (${n} files)`,
        });
      }
    }

    const listingPath = join(localeIndexDir(locale as "en-us" | "ar-ae"), "product-listing-index.json");
    let listing: ProductListingIndexFile | null = null;
    try {
      listing = JSON.parse(await readFile(listingPath, "utf-8")) as ProductListingIndexFile;
    } catch {
      if (fsSlugs.size > 0) {
        warnings.push({
          level: "warn",
          code: "MISSING_LISTING_INDEX",
          message: `Missing product listing index for ${locale}`,
        });
      }
      continue;
    }

    const indexSlugs = new Set((listing.records ?? []).map((r) => r.slug));
    if (indexSlugs.size !== fsSlugs.size) {
      warnings.push({
        level: "warn",
        code: "INDEX_COUNT_MISMATCH",
        message: `${locale}: index has ${indexSlugs.size} records, filesystem has ${fsSlugs.size}`,
      });
    }

    for (const slug of fsSlugs) {
      if (!indexSlugs.has(slug)) {
        warnings.push({
          level: "warn",
          code: "MISSING_INDEX_ENTRY",
          message: `${locale}: product "${slug}" missing from listing index`,
        });
      }
    }

    for (const slug of indexSlugs) {
      if (!fsSlugs.has(slug)) {
        warnings.push({
          level: "warn",
          code: "ORPHAN_INDEX_ENTRY",
          message: `${locale}: listing index contains "${slug}" with no JSON file`,
        });
      }
    }
  }

  try {
    const prefix = "en";
    const collections = await loadCollectionsFromFs(prefix);
    const engineProducts = [];
    for (const locale of locales) {
      const jsonPaths = await walkProductJsonPaths(join(root, locale, "products"));
      for (const p of jsonPaths.slice(0, 5000)) {
        try {
          const raw = JSON.parse(await readFile(p, "utf-8"));
          const slug = slugFromPath(p);
          engineProducts.push(catalogProductToCollectionProduct(slug, raw));
        } catch {
          /* skip */
        }
      }
    }
    const orphans = detectOrphanProducts(engineProducts, collections);
    if (orphans.length > 0) {
      warnings.push({
        level: "warn",
        code: "ORPHAN_PRODUCTS",
        message: `${orphans.length} product(s) match no collection`,
      });
    }

    const counts = new Map<string, number>();
    for (const col of collections) {
      counts.set(col.slug, 0);
    }
    for (const ep of engineProducts) {
      const { getCollectionsMatchingProduct } = await import("@/features/products/product-collections");
      for (const m of getCollectionsMatchingProduct(ep, collections)) {
        counts.set(m.slug, (counts.get(m.slug) ?? 0) + 1);
      }
    }
    for (const col of collections) {
      if ((counts.get(col.slug) ?? 0) === 0 && col.visible !== false) {
        warnings.push({
          level: "warn",
          code: "EMPTY_COLLECTION",
          message: `Collection "${col.slug}" has no products`,
        });
      }
    }
  } catch {
    /* collections optional in validate */
  }

  return {
    generatedAt: new Date().toISOString(),
    errors,
    warnings,
  };
}

export async function validateSearchIndexConsistency(): Promise<{
  generatedAt: string;
  errors: CatalogValidationIssue[];
  warnings: CatalogValidationIssue[];
  staleCatalogDocs: number;
}> {
  const errors: CatalogValidationIssue[] = [];
  const warnings: CatalogValidationIssue[] = [];
  let staleCatalogDocs = 0;

  try {
    const { prisma } = await import("@/lib/prisma");
    const { discoverCatalogSearchSources } = await import(
      "@/features/search-framework/discovery/catalog-search-discovery"
    );
    const { loadListingRecords } = await import("@/features/products/index/product-index-loader");
    const { collectionsDataService } = await import("@/features/collections/collections-data.service");

    const discovery = await discoverCatalogSearchSources();
    const valid = new Set<string>();

    for (const { urlPrefix } of discovery.indexerLocales) {
      if (discovery.siteCatalog.products) {
        const records = await loadListingRecords(urlPrefix);
        for (const r of records) {
          valid.add(`CATALOG_PRODUCT:${catalogEntityId("product", r.slug)}:${urlPrefix}`);
        }
      }
      if (discovery.siteCatalog.collections) {
        const cols = await collectionsDataService.loadAll({ localePrefix: urlPrefix });
        for (const col of cols) {
          if (col.visible === false) continue;
          valid.add(`CATALOG_COLLECTION:${catalogEntityId("pcol", col.slug)}:${urlPrefix}`);
        }
      }
    }

    const catalogTypes = ["CATALOG_PRODUCT", "CATALOG_COLLECTION", "CATALOG_CATEGORY"] as const;
    const existing = await prisma.searchDocument.findMany({
      where: { entityType: { in: [...catalogTypes] } },
      select: { entityType: true, entityId: true, locale: true },
    });

    for (const row of existing) {
      const key = `${row.entityType}:${row.entityId}:${row.locale}`;
      if (!valid.has(key) && row.entityType !== "CATALOG_CATEGORY") {
        staleCatalogDocs += 1;
      }
    }

    if (staleCatalogDocs > 0) {
      warnings.push({
        level: "warn",
        code: "STALE_SEARCH_DOCS",
        message: `${staleCatalogDocs} stale catalog SearchDocument row(s) — run catalog sync or search reconcile`,
      });
    }
  } catch (e) {
    errors.push({
      level: "error",
      code: "SEARCH_VALIDATE_FAILED",
      message: e instanceof Error ? e.message : String(e),
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    errors,
    warnings,
    staleCatalogDocs,
  };
}
