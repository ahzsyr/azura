import "server-only";

import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Collection } from "@/features/collections/types";
import {
  emptyRuleGroup,
  upgradeLegacyRuleSet,
} from "@/features/categories/matching";
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
import { validateTemplateId } from "@/features/products/layout-templates/registry-meta";
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

/** All descendant slugs of `rootSlug` (direct + nested), breadth-first. */
function collectDescendantSlugs(
  cols: Array<{ slug: string; parentSlug?: string }>,
  rootSlug: string,
): string[] {
  const childrenByParent = new Map<string, string[]>();
  for (const c of cols) {
    const p = (c.parentSlug ?? "").trim();
    if (!p) continue;
    const list = childrenByParent.get(p) ?? [];
    list.push(c.slug);
    childrenByParent.set(p, list);
  }
  const out: string[] = [];
  const queue = [...(childrenByParent.get(rootSlug) ?? [])];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const slug = queue.shift()!;
    if (seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
    for (const child of childrenByParent.get(slug) ?? []) queue.push(child);
  }
  return out;
}

function resolveParentSlug(
  cols: Array<{ slug: string; parentSlug?: string }>,
  selfSlug: string,
  parentRaw: unknown,
): string | undefined {
  if (parentRaw == null || parentRaw === "") return undefined;
  const p = String(parentRaw).trim();
  if (!p) return undefined;
  if (p === selfSlug) throw new Error("Category cannot be its own parent");
  if (!slugSet(cols).has(p)) throw new Error(`Parent category "${p}" does not exist`);
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
      // Phase 4: autoCreate remains unreachable — never create categories during sync.
      if (body.autoCreate === true) {
        return {
          status: 400,
          error:
            "Automatic category creation during sync is disabled. Sync existing categories only, then create categories explicitly.",
        };
      }
      const report = await syncCollections({
        locale,
        autoCreate: false,
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
      return { error: "A category with this slug already exists", status: 400 as const };
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
      conditions: upgradeLegacyRuleSet(body.conditions ?? emptyRuleGroup("any")),
      cardTemplate: (body.cardTemplate as Collection["cardTemplate"]) ?? "default",
      sortBy: (body.sortBy as Collection["sortBy"]) ?? "name-asc",
      pageLayoutTemplate:
        body.pageLayoutTemplate == null || body.pageLayoutTemplate === ""
          ? null
          : validateTemplateId(String(body.pageLayoutTemplate)),
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
      return { error: "Category not found", status: 404 as const };
    }

    const nextSlug = String(body.slug ?? cols[idx].slug);
    const duplicate = cols.find((c, i) => i !== idx && (c.slug === nextSlug || c.id === nextSlug));
    if (duplicate) {
      return { error: "A category with this slug already exists", status: 400 as const };
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
      conditions: upgradeLegacyRuleSet(
        body.conditions !== undefined ? body.conditions : cols[idx].conditions,
      ),
      pageLayoutTemplate:
        body.pageLayoutTemplate === undefined
          ? cols[idx].pageLayoutTemplate
          : body.pageLayoutTemplate == null || body.pageLayoutTemplate === ""
            ? null
            : validateTemplateId(String(body.pageLayoutTemplate)),
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
      return { error: "Category not found", status: 404 as const };
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

  async deleteCollection(body: {
    slug?: string;
    id?: string;
    /** How to handle direct child categories when present. */
    childrenMode?: "cascade" | "reparent";
  }) {
    const key = body.slug ?? body.id;
    if (!key) {
      return { error: "slug or id required", status: 400 as const };
    }

    const cols = await loadCollections();
    const target = cols.find((c) => c.slug === key || c.id === key);
    if (!target) {
      return { error: "Category not found", status: 404 as const };
    }

    const parentKey = String(target.slug).trim();
    const childRefs = cols.filter(
      (c) => c.slug !== parentKey && c.id !== parentKey && (c.parentSlug ?? "").trim() === parentKey,
    );

    if (childRefs.length > 0 && !body.childrenMode) {
      return {
        error: `Cannot delete: ${childRefs.length} child category(ies) reference this parent (${childRefs.map((c) => c.slug).join(", ")})`,
        status: 400 as const,
        code: "HAS_CHILDREN" as const,
        children: childRefs.map((c) => ({ slug: c.slug, name: c.name })),
        parentSlug: target.parentSlug?.trim() || null,
      };
    }

    if (body.childrenMode && body.childrenMode !== "cascade" && body.childrenMode !== "reparent") {
      return { error: 'childrenMode must be "cascade" or "reparent"', status: 400 as const };
    }

    let removedChildren: string[] = [];
    let reparentedChildren: string[] = [];

    if (childRefs.length > 0 && body.childrenMode === "reparent") {
      const newParent = target.parentSlug?.trim() || undefined;
      const now = new Date().toISOString();
      for (const child of childRefs) {
        const updated: Collection = {
          ...child,
          parentSlug: newParent,
          updatedAt: now,
        };
        await upsertCatalogCollection(updated);
        await syncLocaleCollectionFile(updated);
        reparentedChildren.push(child.slug);
      }
    }

    if (childRefs.length > 0 && body.childrenMode === "cascade") {
      removedChildren = collectDescendantSlugs(cols, parentKey);
      // Delete deepest first so dual-write Category tree stays consistent.
      for (const slug of [...removedChildren].reverse()) {
        await deleteCatalogCollection(slug);
        await removeCollectionFromSearch(slug);
      }
    }

    await deleteCatalogCollection(parentKey);
    await removeCollectionFromSearch(parentKey);
    await rebuildProductIndexesAfterCollectionChange();
    return {
      removedSlug: parentKey,
      childrenMode: body.childrenMode ?? null,
      removedChildren,
      reparentedChildren,
    };
  },
};
