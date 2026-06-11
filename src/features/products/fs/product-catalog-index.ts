import "server-only";

import { readFile } from "node:fs/promises";
import { join, sep } from "node:path";
import {
  DEFAULT_CATALOG_LOCALE,
  urlPrefixToCatalogLocale,
  type CatalogLocale,
} from "@/features/catalog/locales";
import {
  legacyProductsDir,
  localeProductsDir,
  walkProductJsonFiles,
} from "./product-fs-scan";
import {
  hasProductListingIndex,
  invalidateProductIndexLoaderCache,
  loadListingRecords,
  loadSlugPathIndex,
} from "@/features/products/index/product-index-loader";
import { listingRecordToRuleMeta } from "@/features/products/listing/record-from-product";

/** Lightweight fields for collection rule matching without full product parse. */
export type ProductRuleMatchMeta = {
  slug: string;
  id: string;
  name: string;
  brand: string;
  category: string;
  categories: string[];
  tags: string[];
  status: string;
  stock: string;
};

export type ProductIndexEntry = {
  absPath: string;
  /** Canonical URL slug (from JSON `slug` when present). */
  slug: string;
  fileSlug: string;
  localeKey: string;
  catalogLocale: CatalogLocale | null;
  ruleMeta: ProductRuleMatchMeta;
};

export type ProductCatalogIndex = Map<string, ProductIndexEntry>;

function localeCandidatesFromPrefix(urlPrefix: string): string[] {
  const p = urlPrefix.trim().toLowerCase();
  if (!p) return [DEFAULT_CATALOG_LOCALE];
  if (p === "en") return ["en-us", "en"];
  if (p === "ar") return ["ar-ae", "ar"];
  if (p === "en-us" || p === "ar-ae") return [p];
  return [p, DEFAULT_CATALOG_LOCALE];
}

function extractSlugFromJsonRaw(raw: string, fileSlug: string): string {
  try {
    const parsed = JSON.parse(raw) as { slug?: string };
    const fromJson = typeof parsed.slug === "string" ? parsed.slug.trim() : "";
    if (fromJson) return fromJson;
  } catch {
    /* fall through */
  }
  return fileSlug;
}

function normalizeStockLabel(stockStatus?: string, availability?: string): string {
  if (stockStatus === "out_of_stock" || availability === "OutOfStock") return "out-of-stock";
  if (stockStatus === "preorder" || availability === "PreOrder") return "low-stock";
  return "in-stock";
}

function buildRuleMeta(
  canonicalSlug: string,
  raw: Record<string, unknown>,
): ProductRuleMatchMeta {
  const name = String(
    raw.productTitle ?? raw.name ?? raw.title ?? canonicalSlug,
  ).trim();
  const category = raw.category != null ? String(raw.category).trim() : "";
  const catSet = new Set<string>();
  if (category) catSet.add(category);
  for (const c of (raw.categories as string[] | undefined) ?? []) {
    const s = typeof c === "string" ? c.trim() : "";
    if (s) catSet.add(s);
  }
  const categories = [...catSet];
  const tagSet = new Set<string>(categories);
  for (const t of (raw.tags as string[] | undefined) ?? []) {
    const s = typeof t === "string" ? t.trim() : "";
    if (s) tagSet.add(s);
  }

  return {
    slug: canonicalSlug,
    id: String(raw.id ?? canonicalSlug).trim() || canonicalSlug,
    name,
    brand: String(raw.brand ?? "").trim(),
    category,
    categories,
    tags: [...tagSet],
    status: String(raw.availability ?? "").trim(),
    stock: normalizeStockLabel(
      raw.stock_status as string | undefined,
      raw.availability as string | undefined,
    ),
  };
}

type CacheRow = {
  index: ProductCatalogIndex;
  uniqueEntries: ProductIndexEntry[];
  signature: string;
};

const indexCache = new Map<string, CacheRow>();

async function dirSignature(paths: string[]): Promise<string> {
  const { stat } = await import("node:fs/promises");
  const parts: string[] = [];
  for (const dir of paths) {
    try {
      const s = await stat(dir);
      parts.push(`${dir}:${s.mtimeMs}`);
    } catch {
      parts.push(`${dir}:missing`);
    }
  }
  return parts.join("|");
}

function registerAlias(
  index: ProductCatalogIndex,
  key: string,
  entry: ProductIndexEntry,
): void {
  const k = key.trim().toLowerCase();
  if (!k || index.has(k)) return;
  index.set(k, entry);
}

async function buildIndexFromListingFiles(
  urlPrefix: string,
  catalogLocale: CatalogLocale,
): Promise<{ index: ProductCatalogIndex; uniqueEntries: ProductIndexEntry[]; signature: string }> {
  const records = await loadListingRecords(urlPrefix);
  const pathIndex = await loadSlugPathIndex(urlPrefix);
  const dataRoot = join(process.cwd(), "src", "data");

  const index: ProductCatalogIndex = new Map();
  const uniqueEntries: ProductIndexEntry[] = [];

  for (const record of records) {
    const relPath =
      pathIndex?.paths[record.slug] ?? `${catalogLocale}/products/${record.slug}.json`;
    const absPath = join(dataRoot, relPath.replace(/\//g, sep));
    const entry: ProductIndexEntry = {
      absPath,
      slug: record.slug,
      fileSlug: record.slug,
      localeKey: catalogLocale,
      catalogLocale,
      ruleMeta: listingRecordToRuleMeta(record),
    };
    uniqueEntries.push(entry);
    registerAlias(index, record.slug, entry);
  }

  uniqueEntries.sort((a, b) =>
    a.slug.localeCompare(b.slug, undefined, { sensitivity: "base" }),
  );

  const signature = pathIndex
    ? `index:${pathIndex.version}:${records.length}`
    : `listing:${records.length}`;

  return { index, uniqueEntries, signature };
}

async function buildProductCatalogIndexLegacy(urlPrefix: string): Promise<{
  index: ProductCatalogIndex;
  uniqueEntries: ProductIndexEntry[];
  signature: string;
}> {
  const catalogLocale = urlPrefixToCatalogLocale(urlPrefix);
  const localeDirs = localeCandidatesFromPrefix(urlPrefix).map((lc) =>
    join(process.cwd(), "src", "data", lc, "products"),
  );
  const legacyDir = legacyProductsDir();
  const signature = await dirSignature([...localeDirs, legacyDir]);

  const index: ProductCatalogIndex = new Map();
  const uniqueByPath = new Map<string, ProductIndexEntry>();
  const seenCanonical = new Set<string>();

  const addFile = async (
    absPath: string,
    fileSlug: string,
    localeKey: string,
    entryCatalogLocale: CatalogLocale | null,
  ) => {
    let rawText = "";
    let parsed: Record<string, unknown> = {};
    try {
      rawText = await readFile(absPath, "utf-8");
      parsed = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      return;
    }

    const canonicalSlug = extractSlugFromJsonRaw(rawText, fileSlug);
    const canonKey = canonicalSlug.toLowerCase();
    if (seenCanonical.has(canonKey)) return;
    seenCanonical.add(canonKey);

    const entry: ProductIndexEntry = {
      absPath,
      slug: canonicalSlug,
      fileSlug,
      localeKey,
      catalogLocale: entryCatalogLocale,
      ruleMeta: buildRuleMeta(canonicalSlug, parsed),
    };

    uniqueByPath.set(absPath, entry);
    registerAlias(index, canonicalSlug, entry);
    if (fileSlug.toLowerCase() !== canonKey) {
      registerAlias(index, fileSlug, entry);
    }
  };

  const addFromDir = async (
    productsRoot: string,
    localeKey: string,
    entryCatalogLocale: CatalogLocale | null,
  ) => {
    for await (const { absPath, slug: fileSlug } of walkProductJsonFiles(productsRoot)) {
      await addFile(absPath, fileSlug, localeKey, entryCatalogLocale);
    }
  };

  for (const lc of localeCandidatesFromPrefix(urlPrefix)) {
    const isCatalog = lc === "en-us" || lc === "ar-ae";
    await addFromDir(
      localeProductsDir(isCatalog ? (lc as CatalogLocale) : catalogLocale),
      lc,
      isCatalog ? (lc as CatalogLocale) : null,
    );
  }

  await addFromDir(legacyDir, "default", null);

  const uniqueEntries = [...uniqueByPath.values()].sort((a, b) =>
    a.slug.localeCompare(b.slug, undefined, { sensitivity: "base" }),
  );

  return { index, uniqueEntries, signature };
}

async function buildProductCatalogIndex(urlPrefix: string): Promise<{
  index: ProductCatalogIndex;
  uniqueEntries: ProductIndexEntry[];
}> {
  const catalogLocale = urlPrefixToCatalogLocale(urlPrefix);
  const cacheKey = `${urlPrefix}:${catalogLocale}`;

  if (await hasProductListingIndex(urlPrefix)) {
    const cached = indexCache.get(cacheKey);
    const built = await buildIndexFromListingFiles(urlPrefix, catalogLocale);
    if (cached?.signature === built.signature) {
      return { index: cached.index, uniqueEntries: cached.uniqueEntries };
    }
    indexCache.set(cacheKey, built);
    return { index: built.index, uniqueEntries: built.uniqueEntries };
  }

  const legacy = await buildProductCatalogIndexLegacy(urlPrefix);
  const cached = indexCache.get(cacheKey);
  if (cached?.signature === legacy.signature) {
    return { index: cached.index, uniqueEntries: cached.uniqueEntries };
  }
  indexCache.set(cacheKey, legacy);
  return { index: legacy.index, uniqueEntries: legacy.uniqueEntries };
}

export async function getProductCatalogIndex(urlPrefix: string): Promise<ProductCatalogIndex> {
  const { index } = await buildProductCatalogIndex(urlPrefix);
  return index;
}

export async function getUniqueProductIndexEntries(
  urlPrefix: string,
): Promise<ProductIndexEntry[]> {
  const { uniqueEntries } = await buildProductCatalogIndex(urlPrefix);
  return uniqueEntries;
}

export function resolveIndexEntry(
  index: ProductCatalogIndex,
  slug: string,
): ProductIndexEntry | null {
  const key = slug.trim().toLowerCase();
  if (!key) return null;
  return index.get(key) ?? null;
}

export async function resolveIndexEntryForLocale(
  urlPrefix: string,
  slug: string,
): Promise<ProductIndexEntry | null> {
  const index = await getProductCatalogIndex(urlPrefix);
  return resolveIndexEntry(index, slug);
}

export async function listIndexSlugs(urlPrefix: string): Promise<string[]> {
  const entries = await getUniqueProductIndexEntries(urlPrefix);
  return entries.map((e) => e.slug);
}

export function invalidateProductCatalogIndex(): void {
  indexCache.clear();
  invalidateProductIndexLoaderCache();
}
