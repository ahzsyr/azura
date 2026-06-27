import "server-only";

import type { Collection, CollectionRule } from "./types";
import { normalizeSlug } from "./normalization";
import {
  loadCollectionsFromDisk,
  saveCollectionsToDisk,
  writeLocaleCollectionFilesForImport,
} from "./collection-sync.service";
import { normalizeCollectionForExport } from "./collection-export-document";

export type CollectionImportDuplicatePolicy = "skip" | "overwrite" | "merge";

export type CollectionImportOptions = {
  dryRun?: boolean;
  duplicatePolicy?: CollectionImportDuplicatePolicy;
  syncLocales?: boolean;
  replaceAll?: boolean;
  /** All slugs from the full import file — used for parent validation across chunks. */
  knownSlugs?: string[];
  /** First chunk of replace-all: wipe existing rows before upserting. */
  clearExisting?: boolean;
  /** Last chunk of replace-all: remove DB rows not present in the full file. */
  finalizeReplaceAll?: boolean;
};

export type CollectionImportRowResult = {
  slug: string;
  name: string;
  status: "created" | "updated" | "skipped" | "error";
  errors: string[];
  warnings: string[];
};

export type CollectionImportResult = {
  dryRun: boolean;
  aggregate: { created: number; updated: number; skipped: number; error: number; total: number };
  rows: CollectionImportRowResult[];
  collections: Collection[];
};

function parseImportItems(raw: unknown): Collection[] {
  if (Array.isArray(raw)) {
    return raw.filter((item) => item && typeof item === "object") as Collection[];
  }
  if (raw && typeof raw === "object" && "collections" in raw) {
    const list = (raw as { collections: unknown }).collections;
    if (Array.isArray(list)) {
      return list.filter((item) => item && typeof item === "object") as Collection[];
    }
    // Recover from accidental double-wrap: { collections: { collections: [...] } }
    if (list && typeof list === "object" && list !== null && "collections" in list) {
      const nested = (list as { collections: unknown }).collections;
      if (Array.isArray(nested)) {
        return nested.filter((item) => item && typeof item === "object") as Collection[];
      }
    }
  }
  throw new Error("Expected { collections: [...] } or a collections array");
}

function normalizeImportCollection(raw: Collection, now: string): Collection | null {
  const slug = normalizeSlug(String(raw.slug ?? raw.name ?? ""));
  const name = String(raw.name ?? "").trim();
  if (!slug || !name) return null;

  const rawConditions =
    raw.conditions ??
    (typeof raw === "object" && raw !== null && "rules" in raw
      ? (raw as Collection & { rules?: Collection["conditions"] }).rules
      : undefined);

  const rules: CollectionRule[] = Array.isArray(rawConditions?.rules)
    ? rawConditions.rules
        .filter((r) => r && typeof r === "object" && String(r.value ?? "").trim())
        .map((r) => ({
          field: r.field,
          operator: r.operator,
          value: String(r.value),
        }))
    : [];

  return normalizeCollectionForExport({
    ...raw,
    id: String(raw.id ?? slug),
    slug,
    name,
    description: String(raw.description ?? ""),
    parentSlug: raw.parentSlug?.trim() ? normalizeSlug(raw.parentSlug.trim()) : undefined,
    conditions: {
      match: rawConditions?.match === "all" ? "all" : "any",
      rules,
    },
    createdAt: raw.createdAt ?? now,
    updatedAt: now,
  });
}

function buildSlugContext(
  existing: Collection[],
  incoming: Collection[],
  knownSlugs?: string[],
): Set<string> {
  const slugs = new Set<string>();
  for (const col of existing) slugs.add(col.slug);
  for (const col of incoming) slugs.add(col.slug);
  if (knownSlugs) {
    for (const raw of knownSlugs) {
      const normalized = normalizeSlug(raw);
      if (normalized) slugs.add(normalized);
    }
  }
  return slugs;
}

function buildParentSlugMap(
  existing: Collection[],
  incoming: Collection[],
): Map<string, string | undefined> {
  const map = new Map<string, string | undefined>();
  for (const col of existing) map.set(col.slug, col.parentSlug);
  for (const col of incoming) map.set(col.slug, col.parentSlug);
  return map;
}

function validateParentSlugs(collections: Collection[], contextSlugs: Set<string>): string[] {
  const errors: string[] = [];
  for (const col of collections) {
    if (col.parentSlug && !contextSlugs.has(col.parentSlug)) {
      errors.push(`"${col.slug}" references missing parent "${col.parentSlug}"`);
    }
    if (col.parentSlug === col.slug) {
      errors.push(`"${col.slug}" cannot be its own parent`);
    }
  }
  return errors;
}

function detectCycles(
  collections: Collection[],
  parentSlugMap: Map<string, string | undefined>,
): string[] {
  const errors: string[] = [];
  for (const col of collections) {
    const seen = new Set<string>();
    let cur = col.parentSlug?.trim();
    while (cur) {
      if (cur === col.slug || seen.has(cur)) {
        errors.push(`Circular hierarchy detected for "${col.slug}"`);
        break;
      }
      seen.add(cur);
      cur = parentSlugMap.get(cur)?.trim();
    }
  }
  return errors;
}

function mergeCollection(existing: Collection, incoming: Collection): Collection {
  return {
    ...existing,
    ...incoming,
    id: existing.id,
    slug: existing.slug,
    seo: { ...existing.seo, ...incoming.seo },
    conditions: incoming.conditions?.rules?.length ? incoming.conditions : existing.conditions,
    createdAt: existing.createdAt ?? incoming.createdAt,
    updatedAt: incoming.updatedAt,
  };
}

export async function runCollectionImportPipeline(
  raw: unknown,
  options: CollectionImportOptions = {},
): Promise<CollectionImportResult> {
  const dryRun = options.dryRun === true;
  const duplicatePolicy = options.duplicatePolicy ?? "overwrite";
  const syncLocales = options.syncLocales !== false;
  const replaceAll = options.replaceAll === true;
  const now = new Date().toISOString();

  const incomingRaw = parseImportItems(raw);
  const incoming = incomingRaw
    .map((item) => normalizeImportCollection(item, now))
    .filter((item): item is Collection => item !== null);

  const slugSet = new Set<string>();
  const duplicateSlugs = new Set<string>();
  for (const col of incoming) {
    if (slugSet.has(col.slug)) duplicateSlugs.add(col.slug);
    slugSet.add(col.slug);
  }

  const existing =
    replaceAll && options.clearExisting ? [] : await loadCollectionsFromDisk();
  const bySlug = new Map(existing.map((c) => [c.slug, c]));
  const slugContext = buildSlugContext(existing, incoming, options.knownSlugs);
  const parentSlugMap = buildParentSlugMap(existing, incoming);
  const rows: CollectionImportRowResult[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let error = 0;

  const structureErrors = [
    ...validateParentSlugs(incoming, slugContext),
    ...detectCycles(incoming, parentSlugMap),
    ...[...duplicateSlugs].map((slug) => `Duplicate slug in import file: "${slug}"`),
  ];

  if (structureErrors.length) {
    return {
      dryRun,
      aggregate: { created: 0, updated: 0, skipped: 0, error: structureErrors.length, total: incoming.length },
      rows: structureErrors.map((message) => ({
        slug: "",
        name: "",
        status: "error" as const,
        errors: [message],
        warnings: [],
      })),
      collections: existing,
    };
  }

  const next = replaceAll && !options.clearExisting && !options.finalizeReplaceAll ? [] : [...existing];

  for (const col of incoming) {
    const prev = bySlug.get(col.slug);
    if (prev) {
      if (duplicatePolicy === "skip") {
        skipped += 1;
        rows.push({
          slug: col.slug,
          name: col.name,
          status: "skipped",
          errors: [],
          warnings: ["Collection already exists — skipped"],
        });
        continue;
      }

      const merged = duplicatePolicy === "merge" ? mergeCollection(prev, col) : col;
      const index = next.findIndex((c) => c.slug === col.slug);
      if (index >= 0) next[index] = merged;
      bySlug.set(col.slug, merged);
      updated += 1;
      rows.push({ slug: col.slug, name: col.name, status: "updated", errors: [], warnings: [] });
      continue;
    }

    next.push(col);
    bySlug.set(col.slug, col);
    created += 1;
    rows.push({ slug: col.slug, name: col.name, status: "created", errors: [], warnings: [] });
  }

  if (!dryRun) {
    const touched = incoming.filter((col) => {
      const row = rows.find((r) => r.slug === col.slug);
      return row?.status === "created" || row?.status === "updated";
    });
    const { catalogCollectionRepository } = await import(
      "@/repositories/catalog-collection.repository"
    );

    const singleShotReplace =
      replaceAll && !options.clearExisting && !options.finalizeReplaceAll;

    if (singleShotReplace) {
      await saveCollectionsToDisk(next);
    } else {
      if (options.clearExisting) {
        await catalogCollectionRepository.deleteAll();
      }
      for (let i = 0; i < touched.length; i += 1) {
        await catalogCollectionRepository.upsert(touched[i], i);
      }
      if (options.finalizeReplaceAll && options.knownSlugs?.length) {
        const normalizedKnown = options.knownSlugs
          .map((slug) => normalizeSlug(slug))
          .filter(Boolean);
        if (normalizedKnown.length > 0) {
          await catalogCollectionRepository.deleteNotInSlugs(normalizedKnown);
        }
      }
    }

    if (syncLocales) {
      const touched = incoming.filter((col) => {
        const row = rows.find((r) => r.slug === col.slug);
        return row?.status === "created" || row?.status === "updated";
      });
      if (touched.length) {
        await writeLocaleCollectionFilesForImport(touched);
      }
    }
  }

  return {
    dryRun,
    aggregate: { created, updated, skipped, error, total: incoming.length },
    rows,
    collections: next,
  };
}
