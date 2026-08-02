import "server-only";

import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Collection } from "@/features/collections/types";
import {
  isCatalogFsWriteError,
  loadCollections,
  listChildCollections,
  preferCatalogJsonStore,
  safeMkdirCatalogDir,
  upsertCatalogCollection,
  deleteCatalogCollection,
} from "@/features/collections/collections-persistence";
import { isCloudNativeProduction } from "@/lib/cloud-native-guard";
import {
  syncCollections,
  validateSync,
} from "@/features/collections/collection-sync.service";
import { getCatalogLocaleCodes, normalizeCatalogLocaleCode } from "@/features/catalog/locales";
import { catalogSyncOrchestrator } from "@/features/catalog/sync/catalog-sync-orchestrator";
import { removeCatalogCollection } from "@/capabilities/search/engine/indexer/catalog-index-sync";
import { frameworkSearchIndexer } from "@/capabilities/search/engine";
import { getIndexerLocales } from "@/i18n/indexer-locales";
import { applyPatch, flattenPatchPaths, isEmptyPatch } from "@/lib/patch";
import { catalogSeedRoot } from "@/lib/catalog-seed-paths";

const DATA_DIR = catalogSeedRoot();
const COLLECTION_SYNC_PATHS = ["rules", "parentSlug", "slug", "matchMode", "productRules"];

async function rebuildProductIndexesAfterCollectionChange(): Promise<void> {
  try {
    const result = await catalogSyncOrchestrator.onCollectionChanged(true);
    if (result.jobId) {
      const { after } = await import("next/server");
      after(async () => {
        await catalogSyncOrchestrator.runDeferredJob(result.jobId!);
      });
    }
  } catch (err) {
    console.warn("[collections] product index rebuild after collection change failed", err);
  }
}

async function removeCollectionFromSearch(slug: string): Promise<void> {
  try {
    const locales = await getIndexerLocales();
    for (const { urlPrefix } of locales) {
      await removeCatalogCollection(frameworkSearchIndexer, urlPrefix, slug);
    }
    await frameworkSearchIndexer.syncCatalogIndexes();
  } catch (err) {
    console.warn("[collections] search remove after collection delete failed", err);
  }
}

function slugSet(cols: Array<{ slug?: string }>): Set<string> {
  return new Set(cols.map((c) => c.slug).filter(Boolean) as string[]);
}

function resolveParentSlug(
  cols: Array<{ slug: string; parentSlug?: string }>,
  selfSlug: string,
  parentRaw: unknown,
): string | undefined {
  if (parentRaw == null || parentRaw === "") return undefined;
  const p = String(parentRaw).trim();
  if (!p) return undefined;
  if (p === selfSlug) throw new Error("Collection cannot be its own parent");
  if (!slugSet(cols).has(p)) throw new Error(`Parent collection "${p}" does not exist`);
  let cur: string | undefined = p;
  const seen = new Set<string>();
  while (cur) {
    if (cur === selfSlug) throw new Error("Invalid parent: would create a cycle");
    if (seen.has(cur)) break;
    seen.add(cur);
    const row = cols.find((c) => c.slug === cur);
    cur = row?.parentSlug?.trim() || undefined;
  }
  return p;
}

async function syncLocaleCollectionFile(col: Collection): Promise<void> {
  if (preferCatalogJsonStore() || isCloudNativeProduction()) return;

  const locales = await getCatalogLocaleCodes();
  for (const locale of locales) {
    const dir = join(DATA_DIR, locale, "collections");
    try {
      const ready = await safeMkdirCatalogDir(dir);
      if (!ready) return;
      const filePath = join(dir, `${col.slug}.json`);
      await writeFile(
        filePath,
        JSON.stringify({ ...col, _locale: locale }, null, 2),
        "utf-8",
      );
    } catch (error) {
      if (isCatalogFsWriteError(error)) return;
      throw error;
    }
  }
}

export const collectionsApiService = {
  async listCollections() {
    const collections = await loadCollections();
    return { collections };
  },

  async handlePost(body: Record<string, unknown>) {
    if (body.action === "rebuild") {
      const locale = await normalizeCatalogLocaleCode(String(body.locale || "en-us"));
      const report = await syncCollections({
        locale,
        autoCreate: body.autoCreate === true,
      });
      return { report };
    }

    if (body.action === "validate") {
      const locale = await normalizeCatalogLocaleCode(String(body.locale || "en-us"));
      const report = await validateSync(locale);
      return { report };
    }

    if (!body.slug || !body.name) {
      return { error: "slug and name are required", status: 400 as const };
    }

    const cols = await loadCollections();
    if (cols.find((c) => c.slug === body.slug)) {
      return { error: "A collection with this slug already exists", status: 400 as const };
    }

    const parentSlug = resolveParentSlug(
      cols.map((c) => ({ slug: c.slug, parentSlug: c.parentSlug })),
      String(body.slug),
      body.parentSlug,
    );

    const now = new Date().toISOString();
    const col: Collection = {
      id: String(body.slug),
      slug: String(body.slug),
      name: String(body.name),
      description: String(body.description ?? ""),
      badge: String(body.badge ?? ""),
      coverImage: String(body.coverImage ?? ""),
      iconImage: body.iconImage ? String(body.iconImage) : undefined,
      parentSlug,
      seo: (body.seo as Collection["seo"]) ?? {},
      conditions: (body.conditions as Collection["conditions"]) ?? { match: "any", rules: [] },
      cardTemplate: (body.cardTemplate as Collection["cardTemplate"]) ?? "default",
      sortBy: (body.sortBy as Collection["sortBy"]) ?? "name-asc",
      visible: body.visible !== false,
      showInNav: Boolean(body.showInNav),
      featured: Boolean(body.featured),
      tags: (body.tags as string[]) ?? [],
      createdAt: String(body.createdAt ?? now),
      updatedAt: now,
    };

    cols.push(col);
    await upsertCatalogCollection(col);
    await syncLocaleCollectionFile(col);
    await rebuildProductIndexesAfterCollectionChange();
    return { collection: col };
  },

  async updateCollection(body: Record<string, unknown> & {
    originalSlug?: string;
    slug?: string;
    id?: string;
  }) {
    if (!body.slug && !body.id && !body.originalSlug) {
      return { error: "slug or id required", status: 400 as const };
    }

    const cols = await loadCollections();
    const key = body.originalSlug ?? body.id ?? body.slug;
    const idx = cols.findIndex((c) => c.slug === key || c.id === key);
    if (idx === -1) {
      return { error: "Collection not found", status: 404 as const };
    }

    const nextSlug = String(body.slug ?? cols[idx].slug);
    const duplicate = cols.find((c, i) => i !== idx && (c.slug === nextSlug || c.id === nextSlug));
    if (duplicate) {
      return { error: "A collection with this slug already exists", status: 400 as const };
    }

    const now = new Date().toISOString();
    const roster = cols.map((c, i) => ({
      slug: i === idx ? nextSlug : c.slug,
      parentSlug:
        i === idx && body.parentSlug !== undefined
          ? (body.parentSlug == null || body.parentSlug === ""
            ? undefined
            : String(body.parentSlug).trim())
          : c.parentSlug,
    }));
    const parentSlug =
      body.parentSlug !== undefined
        ? resolveParentSlug(roster, nextSlug, body.parentSlug)
        : cols[idx].parentSlug;

    const merged = {
      ...cols[idx],
      ...body,
      id: nextSlug,
      slug: nextSlug,
      parentSlug,
      updatedAt: now,
    } as Collection;
    delete (merged as { originalSlug?: string }).originalSlug;

    const originalSlug = String(body.originalSlug ?? cols[idx].slug);
    const { reparentedChildren } = await upsertCatalogCollection(merged, {
      sortOrder: idx,
      originalSlug,
    });
    await syncLocaleCollectionFile(merged);
    if (originalSlug !== nextSlug && reparentedChildren > 0) {
      const children = await listChildCollections(nextSlug);
      for (const child of children) {
        await syncLocaleCollectionFile(child);
      }
    }
    await rebuildProductIndexesAfterCollectionChange();
    return { collection: merged, reparentedChildren };
  },

  async patchCollection(body: {
    slug?: string;
    id?: string;
    changes?: Record<string, unknown>;
  }) {
    if (!body.slug && !body.id) {
      return { error: "slug or id required", status: 400 as const };
    }
    if (!body.changes || isEmptyPatch(body.changes)) {
      return { ok: true, noop: true };
    }

    const cols = await loadCollections();
    const key = body.id ?? body.slug;
    const idx = cols.findIndex((c) => c.slug === key || c.id === key);
    if (idx === -1) {
      return { error: "Collection not found", status: 404 as const };
    }

    const merged = applyPatch(
      cols[idx] as unknown as Record<string, unknown>,
      body.changes,
    ) as Record<string, unknown>;

    const putBody = {
      ...merged,
      originalSlug: cols[idx].slug,
      slug: String(merged.slug ?? cols[idx].slug),
      id: String(merged.id ?? cols[idx].id),
    };

    const appliedPaths = flattenPatchPaths(body.changes);
    const needsFullSync = appliedPaths.some((p) =>
      COLLECTION_SYNC_PATHS.some((prefix) => p === prefix || p.startsWith(`${prefix}.`)),
    );

    const putResult = await collectionsApiService.updateCollection(putBody);
    if ("status" in putResult) {
      return putResult;
    }

    if (!needsFullSync) {
      return { ...putResult, appliedPaths, scopedSync: true };
    }

    return { ...putResult, appliedPaths };
  },

  async deleteCollection(body: { slug?: string; id?: string }) {
    const key = body.slug ?? body.id;
    if (!key) {
      return { error: "slug or id required", status: 400 as const };
    }

    const cols = await loadCollections();
    if (!cols.find((c) => c.slug === key || c.id === key)) {
      return { error: "Collection not found", status: 404 as const };
    }

    const childRefs = cols.filter(
      (c) => c.slug !== key && c.id !== key && (c.parentSlug ?? "").trim() === String(key).trim(),
    );
    if (childRefs.length > 0) {
      return {
        error: `Cannot delete: ${childRefs.length} child collection(s) reference this parent (${childRefs.map((c) => c.slug).join(", ")})`,
        status: 400 as const,
      };
    }

    await deleteCatalogCollection(String(key));
    await removeCollectionFromSearch(String(key));
    await rebuildProductIndexesAfterCollectionChange();
    return { removedSlug: key };
  },
};
