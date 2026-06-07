import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { gzip } from "node:zlib";
import { promisify } from "node:util";
import {
  CATALOG_LOCALES,
  DEFAULT_CATALOG_LOCALE,
  type CatalogLocale,
} from "@/features/catalog/locales";
import { orderCollectionsHierarchy } from "@/features/collections/collection-hierarchy";
import { loadCollectionsFromFs } from "@/features/collections/collections-fs";
import { localeProductsDir, legacyProductsDir, walkProductJsonFiles } from "@/features/products/fs/product-fs-scan";
import { aggregateFacets } from "@/features/products/listing/aggregate-facets";
import { recordFromProduct } from "@/features/products/listing/record-from-product";
import type { Product } from "@/features/products/types";
import type {
  CategoryIndexFile,
  CollectionIndexFile,
  FacetIndexFile,
  IndexedProductListingRecord,
  ProductIndexManifest,
  ProductListingIndexFile,
  SearchTokenIndexFile,
  SlugPathIndexFile,
  SlugRegistryFile,
} from "./product-index-types";
import { PRODUCT_INDEX_VERSION } from "./product-index-types";

const gzipAsync = promisify(gzip);

export function productsIndexRoot(): string {
  return join(process.cwd(), "src", "data", "products-index");
}

export function localeIndexDir(locale: CatalogLocale): string {
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

function normalizeSearchToken(term: string): string {
  return term
    .trim()
    .toLowerCase()
    .replace(/[^-\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
}

function buildSearchTokens(records: IndexedProductListingRecord[]): Record<string, string[]> {
  const tokenToSlugs = new Map<string, Set<string>>();

  const addToken = (token: string, slug: string) => {
    const normalized = normalizeSearchToken(token);
    if (!normalized || normalized.length < 2) return;
    for (const part of normalized.split(/\s+/)) {
      if (part.length < 2) continue;
      if (!tokenToSlugs.has(part)) tokenToSlugs.set(part, new Set());
      tokenToSlugs.get(part)!.add(slug);
    }
  };

  for (const record of records) {
    addToken(record.name, record.slug);
    addToken(record.searchText, record.slug);
    if (record.brand) addToken(record.brand, record.slug);
    if (record.mpn) addToken(record.mpn, record.slug);
    for (const tag of record.tags) addToken(tag, record.slug);
  }

  const tokens: Record<string, string[]> = {};
  for (const [token, slugs] of tokenToSlugs) {
    tokens[token] = [...slugs].sort();
  }
  return tokens;
}

function buildCategoryIndex(records: IndexedProductListingRecord[]): Record<string, string[]> {
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
  locale: CatalogLocale,
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
    locale,
    generatedAt: new Date().toISOString(),
    global,
    byCollection,
  };
}

async function computeLocaleSignature(locale: CatalogLocale): Promise<string> {
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

export async function scanLocaleProducts(locale: CatalogLocale): Promise<ScannedProduct[]> {
  const productsRoot = localeProductsDir(locale);
  const dataRoot = join(process.cwd(), "src", "data");
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
  locale: CatalogLocale,
  localePrefix?: string,
): Promise<{
  listingIndex: ProductListingIndexFile;
  facetIndex: FacetIndexFile;
  categoryIndex: CategoryIndexFile;
  collectionIndex: CollectionIndexFile;
  searchIndex: SearchTokenIndexFile;
  slugPathIndex: SlugPathIndexFile;
  signature: string;
}> {
  const prefix = localePrefix ?? (locale === "ar-ae" ? "ar" : "en");
  const collections = orderCollectionsHierarchy(
    (await loadCollectionsFromFs(prefix)).filter((c) => c.visible !== false),
  );
  const scanned = await scanLocaleProducts(locale);
  const signature = await computeLocaleSignature(locale);

  const records: IndexedProductListingRecord[] = scanned.map(({ slug, product, mtimeMs }) => {
    const record = recordFromProduct(product, slug, collections);
    return {
      ...record,
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
    locale,
    categories: buildCategoryIndex(records),
  };
  const collectionIndex: CollectionIndexFile = {
    version: PRODUCT_INDEX_VERSION,
    locale,
    collections: buildCollectionIndex(records),
  };
  const searchIndex: SearchTokenIndexFile = {
    version: PRODUCT_INDEX_VERSION,
    locale,
    tokens: buildSearchTokens(records),
  };
  const paths: Record<string, string> = {};
  for (const item of scanned) {
    paths[item.slug] = item.relPath;
  }
  const slugPathIndex: SlugPathIndexFile = {
    version: PRODUCT_INDEX_VERSION,
    locale,
    paths,
  };

  return {
    listingIndex,
    facetIndex,
    categoryIndex,
    collectionIndex,
    searchIndex,
    slugPathIndex,
    signature,
  };
}

export async function writeLocaleProductIndexes(
  locale: CatalogLocale,
  localePrefix?: string,
  options?: { gzip?: boolean },
): Promise<{ count: number; signature: string }> {
  const built = await buildLocaleProductIndex(locale, localePrefix);
  const dir = localeIndexDir(locale);

  await writeJsonAtomic(dir, "product-listing-index.json", built.listingIndex);
  await writeJsonAtomic(dir, "facet-index.json", built.facetIndex);
  await writeJsonAtomic(dir, "category-index.json", built.categoryIndex);
  await writeJsonAtomic(dir, "collection-index.json", built.collectionIndex);
  await writeJsonAtomic(dir, "search-token-index.json", built.searchIndex);
  await writeJsonAtomic(dir, "slug-path-index.json", built.slugPathIndex);

  if (options?.gzip !== false) {
    await writeGzipCopy(dir, "product-listing-index.json");
  }

  return { count: built.listingIndex.records.length, signature: built.signature };
}

export async function buildSlugRegistry(): Promise<SlugRegistryFile> {
  const products: SlugRegistryFile["products"] = {};

  for (const locale of CATALOG_LOCALES) {
    const scanned = await scanLocaleProducts(locale);
    for (const { slug, product } of scanned) {
      const key = slug.toLowerCase();
      if (!products[key]) {
        products[key] = {
          id: product.id,
          locales: [locale],
          canonicalLocale: locale === DEFAULT_CATALOG_LOCALE ? locale : DEFAULT_CATALOG_LOCALE,
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
  locales?: CatalogLocale[];
  force?: boolean;
  gzip?: boolean;
}): Promise<ProductIndexManifest> {
  const locales = options?.locales ?? [...CATALOG_LOCALES];
  const root = productsIndexRoot();
  await mkdir(root, { recursive: true });

  const manifestPath = join(root, "manifest.json");
  let existingManifest: ProductIndexManifest | null = null;
  try {
    existingManifest = JSON.parse(await readFile(manifestPath, "utf-8")) as ProductIndexManifest;
  } catch {
    /* fresh build */
  }

  const counts: Record<string, number> = {};
  const signatures: Record<string, string> = {};

  for (const locale of locales) {
    const scanned = await scanLocaleProducts(locale);
    const signature = await computeLocaleSignature(locale);
    const previousCount = existingManifest?.counts[locale] ?? 0;

    if (scanned.length === 0 && previousCount > 0 && !options?.force) {
      console.warn(
        `[catalog:index] ${locale}: no product JSON found under src/data/${locale}/products — keeping existing index (${previousCount} products). Include catalog source in deploy zip.`,
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

    const prefix = locale === "ar-ae" ? "ar" : "en";
    const result = await writeLocaleProductIndexes(locale, prefix, { gzip: options?.gzip });
    counts[locale] = result.count;
    signatures[locale] = result.signature;
  }

  const slugRegistry = await buildSlugRegistry();
  await writeJsonAtomic(root, "slug-registry.json", slugRegistry);

  const manifest: ProductIndexManifest = {
    version: PRODUCT_INDEX_VERSION,
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
      `[catalog:index] public copy skipped (${message}). Indexes in src/data/products-index are used at runtime.`,
    );
  }

  void legacyProductsDir;
  return manifest;
}
