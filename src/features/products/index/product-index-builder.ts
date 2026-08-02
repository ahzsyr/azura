import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { gzip } from "node:zlib";
import { promisify } from "node:util";
import {
  getCatalogLocaleCodes,
  normalizeCatalogLocaleCode,
} from "@/features/catalog/locales";
import { orderCollectionsHierarchy } from "@/features/collections/collection-hierarchy";
import { loadCollectionsFromFs } from "@/features/collections/collections-fs";
import { localeProductsDir, legacyProductsDir, walkProductJsonFiles } from "@/features/products/fs/product-fs-scan";
import { useCatalogProductsDb } from "@/features/products/products-source";
import { isCloudNativeProduction } from "@/lib/cloud-native-guard";
import { catalogSeedRoot } from "@/lib/catalog-seed-paths";
import { productRepository } from "@/repositories/product.repository";
import { fromDbRow } from "@/features/products/db/product-db-mapper";
import { isProductPublishedForSearch } from "@/features/products/lib/product-publish-status";
import { readSiteSettings } from "@/features/catalog/site-settings.service";
import { productJsonPath } from "@/features/products/fs/product-fs-paths";
import { aggregateFacets } from "@/features/products/listing/aggregate-facets";
import { recordFromProduct } from "@/features/products/listing/record-from-product";
import type { Product } from "@/features/products/types";
import type {
  CategoryIndexFile,
  CollectionIndexFile,
  FacetIndexFile,
  IndexedProductListingRecord,
  InvertedFacetIndexFile,
  ProductIndexManifest,
  ProductListingIndexFile,
  SearchTokenIndexFile,
  SlugPathIndexFile,
  SlugRegistryFile,
} from "./product-index-types";
import { PRODUCT_INDEX_SEMANTIC_VERSIONS, PRODUCT_INDEX_VERSION } from "./product-index-types";
import { buildInvertedFacetIndex } from "./inverted-facet-index";
import { buildSearchTokens } from "./search-token-index";

const gzipAsync = promisify(gzip);

export function productsIndexRoot(): string {
  return join(catalogSeedRoot(), "products-index");
}

export function localeIndexDir(locale: string): string {
  return join(productsIndexRoot(), locale);
}

function extractSlugFromJson(raw: string, fileSlug: string): string {
  try {
    const parsed = JSON.parse(raw) as { slug?: string };
    const fromJson = typeof parsed.slug === "string" ? parsed.slug.trim() : "";
    if (fromJson) return fromJson;
  } catch {
    /* fall through */
  }
  return fileSlug;
}

export function buildCategoryIndexFromRecords(
  records: IndexedProductListingRecord[],
): Record<string, string[]> {
  const categories: Record<string, Set<string>> = {};
  for (const record of records) {
    for (const cat of record.categories) {
      if (!cat) continue;
      if (!categories[cat]) categories[cat] = new Set();
      categories[cat].add(record.slug);
    }
    const primary = record.category != null ? String(record.category).trim() : "";
    if (primary) {
      if (!categories[primary]) categories[primary] = new Set();
      categories[primary].add(record.slug);
    }
  }
  const out: Record<string, string[]> = {};
  for (const [cat, slugs] of Object.entries(categories)) {
    out[cat] = [...slugs].sort();
  }
  return out;
}

function buildCollectionIndex(records: IndexedProductListingRecord[]): Record<string, string[]> {
  const collections: Record<string, Set<string>> = {};
  for (const record of records) {
    for (const col of record.collectionSlugs) {
      if (!collections[col]) collections[col] = new Set();
      collections[col].add(record.slug);
    }
  }
  const out: Record<string, string[]> = {};
  for (const [col, slugs] of Object.entries(collections)) {
    out[col] = [...slugs].sort();
  }
  return out;
}

function buildFacetIndex(
  locale: string,
  records: IndexedProductListingRecord[],
  collections: ReturnType<typeof orderCollectionsHierarchy>,
): FacetIndexFile {
  const global = aggregateFacets(records, collections);
  const byCollection: FacetIndexFile["byCollection"] = {};

  const collectionSlugs = new Set<string>();
  for (const record of records) {
    for (const slug of record.collectionSlugs) collectionSlugs.add(slug);
  }

  for (const colSlug of collectionSlugs) {
    const scoped = records.filter((r) => r.collectionSlugs.includes(colSlug));
    if (scoped.length === 0) continue;
    const facets = aggregateFacets(scoped, collections);
    byCollection[colSlug] = {
      categories: facets.categories,
      brands: facets.brands,
      tags: facets.tags,
      conditions: facets.conditions,
      variations: facets.variations,
      priceMin: facets.priceMin,
      priceMax: facets.priceMax,
      currency: facets.currency,
    };
  }

  return {
    version: PRODUCT_INDEX_VERSION,
    semanticVersions: PRODUCT_INDEX_SEMANTIC_VERSIONS,
    locale,
    generatedAt: new Date().toISOString(),
    global,
    byCollection,
  };
}

async function computeLocaleSignature(locale: string): Promise<string> {
  if (useCatalogProductsDb()) {
    const rows = await productRepository.findAll();
    let maxUpdated = 0;
    for (const row of rows) {
      const t = row.updatedAt.getTime();
      if (t > maxUpdated) maxUpdated = t;
    }
    return `db:${locale}:${rows.length}:${maxUpdated}`;
  }

  const parts: string[] = [];
  const productsRoot = localeProductsDir(locale);
  for await (const { absPath } of walkProductJsonFiles(productsRoot)) {
    try {
      const s = await stat(absPath);
      parts.push(`${absPath}:${s.mtimeMs}:${s.size}`);
    } catch {
      parts.push(`${absPath}:missing`);
    }
  }
  parts.sort();
  return `sha256:${createHash("sha256").update(parts.join("|")).digest("hex")}`;
}

async function writeJsonAtomic(dir: string, filename: string, data: unknown): Promise<void> {
  await mkdir(dir, { recursive: true });
  const target = join(dir, filename);
  const temp = `${target}.tmp`;
  await writeFile(temp, JSON.stringify(data), "utf-8");
  const { rename } = await import("node:fs/promises");
  await rename(temp, target);
}

async function writeGzipCopy(dir: string, filename: string): Promise<void> {
  if (isCloudNativeProduction()) return;
  const source = join(dir, filename);
  const dest = `${source}.gz`;
  const content = await readFile(source);
  const compressed = await gzipAsync(content);
  await writeFile(dest, compressed);
}

export type ScannedProduct = {
  slug: string;
  absPath: string;
  relPath: string;
  product: Product;
  mtimeMs: number;
};

export async function scanLocaleProducts(locale: string): Promise<ScannedProduct[]> {
  if (useCatalogProductsDb()) {
    const rows = await productRepository.findMany({ status: "published" });
    return rows
      .filter((row) => isProductPublishedForSearch(row.status))
      .map((row) => {
        const product = fromDbRow(row);
        const absPath = productJsonPath(locale, row.canonicalSlug);
        return {
          slug: row.canonicalSlug,
          absPath,
          relPath: `${locale}/products/${row.canonicalSlug}.json`,
          product,
          mtimeMs: row.updatedAt.getTime(),
        };
      });
  }

  if (isCloudNativeProduction()) {
    return [];
  }

  const productsRoot = localeProductsDir(locale);
  const dataRoot = catalogSeedRoot();
  const seen = new Set<string>();
  const results: ScannedProduct[] = [];

  for await (const { absPath, slug: fileSlug } of walkProductJsonFiles(productsRoot)) {
    let raw = "";
    try {
      raw = await readFile(absPath, "utf-8");
    } catch {
      continue;
    }
    const canonicalSlug = extractSlugFromJson(raw, fileSlug);
    const key = canonicalSlug.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    let parsed: Product;
    try {
      parsed = JSON.parse(raw) as Product;
    } catch {
      continue;
    }

    let mtimeMs = 0;
    try {
      mtimeMs = (await stat(absPath)).mtimeMs;
    } catch {
      /* ignore */
    }

    results.push({
      slug: canonicalSlug,
      absPath,
      relPath: relative(dataRoot, absPath).replace(/\\/g, "/"),
      product: parsed,
      mtimeMs,
    });
  }

  results.sort((a, b) => a.slug.localeCompare(b.slug, undefined, { sensitivity: "base" }));
  return results;
}

export async function buildLocaleProductIndex(
  locale: string,
  localePrefix?: string,
): Promise<{
  listingIndex: ProductListingIndexFile;
  facetIndex: FacetIndexFile;
  categoryIndex: CategoryIndexFile;
  collectionIndex: CollectionIndexFile;
  searchIndex: SearchTokenIndexFile;
  invertedFacetIndex: InvertedFacetIndexFile;
  slugPathIndex: SlugPathIndexFile;
  signature: string;
}> {
  const prefix = localePrefix ?? "en";
  const collections = orderCollectionsHierarchy(
    (await loadCollectionsFromFs(prefix)).filter((c) => c.visible !== false),
  );
  const site = await readSiteSettings(prefix);
  const scanned = await scanLocaleProducts(locale);
  const signature = await computeLocaleSignature(locale);

  const records: IndexedProductListingRecord[] = scanned.map(({ slug, product, mtimeMs }) => {
    const record = recordFromProduct(product, slug, collections, { site });
    return {
      ...record,
      status: "published",
      updatedAt: new Date(mtimeMs).toISOString(),
    };
  });

  let priceMin = Infinity;
  let priceMax = 0;
  let currency = records[0]?.price.currency ?? "USD";
  for (const record of records) {
    if (record.priceMin < priceMin) priceMin = record.priceMin;
    if (record.priceMax > priceMax) priceMax = record.priceMax;
    currency = record.price.currency;
  }
  if (!Number.isFinite(priceMin)) priceMin = 0;
  if (priceMax < priceMin) priceMax = priceMin;

  const listingIndex: ProductListingIndexFile = {
    version: PRODUCT_INDEX_VERSION,
    semanticVersions: PRODUCT_INDEX_SEMANTIC_VERSIONS,
    locale,
    generatedAt: new Date().toISOString(),
    sourceSignature: signature,
    currency,
    priceBounds: { min: priceMin, max: priceMax },
    records,
  };

  const facetIndex = buildFacetIndex(locale, records, collections);
  const categoryIndex: CategoryIndexFile = {
    version: PRODUCT_INDEX_VERSION,
    semanticVersions: PRODUCT_INDEX_SEMANTIC_VERSIONS,
    locale,
    categories: buildCategoryIndexFromRecords(records),
  };
  const collectionIndex: CollectionIndexFile = {
    version: PRODUCT_INDEX_VERSION,
    semanticVersions: PRODUCT_INDEX_SEMANTIC_VERSIONS,
    locale,
    collections: buildCollectionIndex(records),
  };
  const searchIndex: SearchTokenIndexFile = {
    version: PRODUCT_INDEX_VERSION,
    semanticVersions: PRODUCT_INDEX_SEMANTIC_VERSIONS,
    locale,
    tokens: buildSearchTokens(records),
  };
  const invertedFacetIndex = buildInvertedFacetIndex(locale, records);
  const paths: Record<string, string> = {};
  for (const item of scanned) {
    paths[item.slug] = item.relPath;
  }
  const slugPathIndex: SlugPathIndexFile = {
    version: PRODUCT_INDEX_VERSION,
    semanticVersions: PRODUCT_INDEX_SEMANTIC_VERSIONS,
    locale,
    paths,
  };

  return {
    listingIndex,
    facetIndex,
    categoryIndex,
    collectionIndex,
    searchIndex,
    invertedFacetIndex,
    slugPathIndex,
    signature,
  };
}

export async function writeLocaleProductIndexes(
  locale: string,
  localePrefix?: string,
  options?: { gzip?: boolean },
): Promise<{ count: number; signature: string }> {
  const built = await buildLocaleProductIndex(locale, localePrefix);

  if (!(await canWriteProductIndexes())) {
    const { applyProductIndexCaches } = await import(
      "@/features/products/index/product-index-loader"
    );
    applyProductIndexCaches(locale, built);
    return { count: built.listingIndex.records.length, signature: built.signature };
  }

  const dir = localeIndexDir(locale);

  await writeJsonAtomic(dir, "product-listing-index.json", built.listingIndex);
  await writeJsonAtomic(dir, "facet-index.json", built.facetIndex);
  await writeJsonAtomic(dir, "category-index.json", built.categoryIndex);
  await writeJsonAtomic(dir, "collection-index.json", built.collectionIndex);
  await writeJsonAtomic(dir, "search-token-index.json", built.searchIndex);
  await writeJsonAtomic(dir, "inverted-facet-index.json", built.invertedFacetIndex);
  await writeJsonAtomic(dir, "slug-path-index.json", built.slugPathIndex);

  if (options?.gzip !== false) {
    await writeGzipCopy(dir, "product-listing-index.json");
  }

  return { count: built.listingIndex.records.length, signature: built.signature };
}

export async function buildSlugRegistry(): Promise<SlugRegistryFile> {
  const products: SlugRegistryFile["products"] = {};
  const catalogLocales = await getCatalogLocaleCodes();
  const defaultLocale = await normalizeCatalogLocaleCode("");

  for (const locale of catalogLocales) {
    const scanned = await scanLocaleProducts(locale);
    for (const { slug, product } of scanned) {
      const key = slug.toLowerCase();
      if (!products[key]) {
        products[key] = {
          id: product.id,
          locales: [locale],
          canonicalLocale: locale === defaultLocale ? locale : defaultLocale,
        };
      } else if (!products[key].locales.includes(locale)) {
        products[key].locales.push(locale);
      }
    }
  }

  return {
    version: PRODUCT_INDEX_VERSION,
    generatedAt: new Date().toISOString(),
    products,
  };
}

export async function buildAllProductIndexes(options?: {
  locales?: string[];
  force?: boolean;
  gzip?: boolean;
}): Promise<ProductIndexManifest> {
  const locales = options?.locales ?? [...(await getCatalogLocaleCodes())];
  const root = productsIndexRoot();
  await mkdir(root, { recursive: true });

  const manifestPath = join(root, "manifest.json");
  let existingManifest: ProductIndexManifest | null = null;
  if (!isCloudNativeProduction()) {
    try {
      existingManifest = JSON.parse(await readFile(manifestPath, "utf-8")) as ProductIndexManifest;
    } catch {
      /* fresh build */
    }
  }

  const counts: Record<string, number> = {};
  const signatures: Record<string, string> = {};

  for (const locale of locales) {
    const scanned = await scanLocaleProducts(locale);
    const signature = await computeLocaleSignature(locale);
    const previousCount = existingManifest?.counts[locale] ?? 0;

    const productsRoot = localeProductsDir(locale);
    const catalogDirPresent = existsSync(productsRoot);

    if (scanned.length === 0 && previousCount > 0 && !options?.force && !catalogDirPresent) {
      console.warn(
        `[catalog:index] ${locale}: products folder missing from deploy — keeping existing index (${previousCount} products). Include catalog source in deploy zip.`,
      );
      counts[locale] = previousCount;
      signatures[locale] = existingManifest!.signatures[locale] ?? signature;
      continue;
    }

    if (
      !options?.force &&
      existingManifest?.signatures[locale] === signature &&
      existingManifest.counts[locale]
    ) {
      counts[locale] = existingManifest.counts[locale] ?? 0;
      signatures[locale] = signature;
      continue;
    }

    const prefix = "en";
    const result = await writeLocaleProductIndexes(locale, prefix, { gzip: options?.gzip });
    counts[locale] = result.count;
    signatures[locale] = result.signature;
  }

  const slugRegistry = await buildSlugRegistry();
  await writeJsonAtomic(root, "slug-registry.json", slugRegistry);

  const manifest: ProductIndexManifest = {
    version: PRODUCT_INDEX_VERSION,
    semanticVersions: PRODUCT_INDEX_SEMANTIC_VERSIONS,
    generatedAt: new Date().toISOString(),
    locales,
    counts,
    signatures,
  };
  await writeJsonAtomic(root, "manifest.json", manifest);

  // Optional: copy listing index gzip to public/ for static CDN serve.
  // Skipped on hosts where public/ is not writable during build (e.g. Hostinger).
  try {
    const publicIndexRoot = join(process.cwd(), "public", "data", "products-index");
    await mkdir(publicIndexRoot, { recursive: true });
    const { copyFile } = await import("node:fs/promises");
    for (const locale of locales) {
      const srcGz = join(localeIndexDir(locale), "product-listing-index.json.gz");
      const destGz = join(publicIndexRoot, `${locale}.json.gz`);
      try {
        await copyFile(srcGz, destGz);
      } catch {
        /* gzip may not exist if disabled */
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      `[catalog:index] public copy skipped (${message}). Indexes in seeds/catalog/products-index are used at runtime.`,
    );
  }

  void legacyProductsDir;
  return manifest;
}

async function loadExistingListingIndex(
  locale: string,
): Promise<ProductListingIndexFile | null> {
  if (isCloudNativeProduction()) return null;
  const path = join(localeIndexDir(locale), "product-listing-index.json");
  try {
    return JSON.parse(await readFile(path, "utf-8")) as ProductListingIndexFile;
  } catch {
    return null;
  }
}

function computePriceBounds(records: IndexedProductListingRecord[]): {
  min: number;
  max: number;
  currency: string;
} {
  let priceMin = Infinity;
  let priceMax = 0;
  let currency = records[0]?.price.currency ?? "USD";
  for (const record of records) {
    if (record.priceMin < priceMin) priceMin = record.priceMin;
    if (record.priceMax > priceMax) priceMax = record.priceMax;
    currency = record.price.currency;
  }
  if (!Number.isFinite(priceMin)) priceMin = 0;
  if (priceMax < priceMin) priceMax = priceMin;
  return { min: priceMin, max: priceMax, currency };
}

function buildIndexesFromRecords(
  locale: string,
  records: IndexedProductListingRecord[],
  collections: ReturnType<typeof orderCollectionsHierarchy>,
  signature: string,
  slugPaths?: Record<string, string>,
): {
  listingIndex: ProductListingIndexFile;
  facetIndex: FacetIndexFile;
  categoryIndex: CategoryIndexFile;
  collectionIndex: CollectionIndexFile;
  searchIndex: SearchTokenIndexFile;
  invertedFacetIndex: InvertedFacetIndexFile;
  slugPathIndex: SlugPathIndexFile;
} {
  const { min: priceMin, max: priceMax, currency } = computePriceBounds(records);
  const listingIndex: ProductListingIndexFile = {
    version: PRODUCT_INDEX_VERSION,
    semanticVersions: PRODUCT_INDEX_SEMANTIC_VERSIONS,
    locale,
    generatedAt: new Date().toISOString(),
    sourceSignature: signature,
    currency,
    priceBounds: { min: priceMin, max: priceMax },
    records,
  };

  return {
    listingIndex,
    facetIndex: buildFacetIndex(locale, records, collections),
    categoryIndex: {
      version: PRODUCT_INDEX_VERSION,
      semanticVersions: PRODUCT_INDEX_SEMANTIC_VERSIONS,
      locale,
      categories: buildCategoryIndexFromRecords(records),
    },
    collectionIndex: {
      version: PRODUCT_INDEX_VERSION,
      semanticVersions: PRODUCT_INDEX_SEMANTIC_VERSIONS,
      locale,
      collections: buildCollectionIndex(records),
    },
    searchIndex: {
      version: PRODUCT_INDEX_VERSION,
      semanticVersions: PRODUCT_INDEX_SEMANTIC_VERSIONS,
      locale,
      tokens: buildSearchTokens(records),
    },
    invertedFacetIndex: buildInvertedFacetIndex(locale, records),
    slugPathIndex: {
      version: PRODUCT_INDEX_VERSION,
      semanticVersions: PRODUCT_INDEX_SEMANTIC_VERSIONS,
      locale,
      paths: slugPaths ?? {},
    },
  };
}

async function writeBuiltIndexes(
  locale: string,
  built: ReturnType<typeof buildIndexesFromRecords>,
  options?: { gzip?: boolean },
): Promise<void> {
  if (!(await canWriteProductIndexes())) {
    const { applyProductIndexCaches } = await import(
      "@/features/products/index/product-index-loader"
    );
    applyProductIndexCaches(locale, built);
    return;
  }

  const dir = localeIndexDir(locale);
  await writeJsonAtomic(dir, "product-listing-index.json", built.listingIndex);
  await writeJsonAtomic(dir, "facet-index.json", built.facetIndex);
  await writeJsonAtomic(dir, "category-index.json", built.categoryIndex);
  await writeJsonAtomic(dir, "collection-index.json", built.collectionIndex);
  await writeJsonAtomic(dir, "search-token-index.json", built.searchIndex);
  await writeJsonAtomic(dir, "inverted-facet-index.json", built.invertedFacetIndex);
  await writeJsonAtomic(dir, "slug-path-index.json", built.slugPathIndex);
  if (options?.gzip !== false) {
    await writeGzipCopy(dir, "product-listing-index.json");
  }
}

export type PatchLocaleProductIndexOptions = {
  /** Full rebuild when listing index is missing or corrupt. */
  forceFull?: boolean;
  gzip?: boolean;
  /** Relative path under seeds/catalog for slug-path index (on save). */
  relPath?: string;
  mtimeMs?: number;
};

export type PatchLocaleProductIndexResult = {
  count: number;
  signature: string;
  mode: "patch" | "full";
};

/**
 * Incrementally update locale product indexes for a single product save or delete.
 * Falls back to full locale rebuild when no listing index exists.
 */
export async function patchLocaleProductIndex(
  locale: string,
  localePrefix: string,
  action: "save" | "delete",
  slug: string,
  product?: Product,
  options?: PatchLocaleProductIndexOptions,
): Promise<PatchLocaleProductIndexResult> {
  const prefix = localePrefix ?? "en";

  if (options?.forceFull || (action === "save" && !product)) {
    const result = await writeLocaleProductIndexes(locale, prefix, { gzip: options?.gzip });
    return { ...result, mode: "full" };
  }

  const existing = await loadExistingListingIndex(locale);
  if (!existing?.records || options?.forceFull) {
    const result = await writeLocaleProductIndexes(locale, prefix, { gzip: options?.gzip });
    return { ...result, mode: "full" };
  }

  const collections = orderCollectionsHierarchy(
    (await loadCollectionsFromFs(prefix)).filter((c) => c.visible !== false),
  );
  const site = await readSiteSettings(prefix);

  let records = [...existing.records];
  const slugKey = slug.toLowerCase();
  records = records.filter((r) => r.slug.toLowerCase() !== slugKey);

  if (action === "save" && product) {
    const record = recordFromProduct(product, slug, collections, { site });
    records.push({
      ...record,
      updatedAt: new Date(options?.mtimeMs ?? Date.now()).toISOString(),
    });
  }

  records.sort((a, b) => a.slug.localeCompare(b.slug, undefined, { sensitivity: "base" }));

  const slugPathFile = join(localeIndexDir(locale), "slug-path-index.json");
  let paths: Record<string, string> = {};
  if (!isCloudNativeProduction()) {
    try {
      const parsed = JSON.parse(await readFile(slugPathFile, "utf-8")) as SlugPathIndexFile;
      paths = { ...parsed.paths };
    } catch {
      /* fresh paths */
    }
  }

  if (action === "delete") {
    delete paths[slug];
  } else if (action === "save" && options?.relPath) {
    paths[slug] = options.relPath;
  }

  const signature = await computeLocaleSignature(locale);
  const built = buildIndexesFromRecords(locale, records, collections, signature, paths);
  await writeBuiltIndexes(locale, built, { gzip: options?.gzip });

  return { count: records.length, signature, mode: "patch" };
}

/** True when product index JSON can be written under seeds/catalog/products-index. */
export async function canWriteProductIndexes(): Promise<boolean> {
  if (process.env.VERCEL === "1") return false;
  if (useCatalogProductsDb()) return false;
  if (isCloudNativeProduction()) return false;
  try {
    const dir = productsIndexRoot();
    await mkdir(dir, { recursive: true });
    const probe = join(dir, ".write-probe");
    await writeFile(probe, "ok", "utf-8");
    const { unlink } = await import("node:fs/promises");
    await unlink(probe);
    return true;
  } catch {
    return false;
  }
}

/** Build in-memory product indexes from DB rows (no disk write). */
export async function warmDbProductIndexCaches(
  locale: string,
  localePrefix?: string,
): Promise<void> {
  const built = await buildLocaleProductIndex(locale, localePrefix);
  const { applyProductIndexCaches } = await import(
    "@/features/products/index/product-index-loader"
  );
  applyProductIndexCaches(locale, built);
}
