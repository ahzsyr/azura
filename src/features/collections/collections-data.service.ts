import "server-only";

import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Collection } from "./types";
import { urlPrefixToCatalogLocale } from "@/features/catalog/locales";

type ReadOptions = {
  /** Next locale param (urlPrefix), e.g. "en" / "ar". */
  localePrefix: string;
};

async function readJson<T>(absPath: string): Promise<T | null> {
  try {
    const raw = await readFile(absPath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function loadGlobalCollections(): Promise<Collection[]> {
  const file = join(process.cwd(), "src", "data", "collections.json");
  const raw = await readJson<unknown>(file);
  return Array.isArray(raw) ? (raw as Collection[]) : [];
}

async function loadLocaleOverride(
  catalogLocale: string,
  slug: string,
): Promise<Partial<Collection> | null> {
  const path = join(process.cwd(), "src", "data", catalogLocale, "collections", `${slug}.json`);
  return readJson<Partial<Collection>>(path);
}

function mergeCollection(base: Collection, override: Partial<Collection> | null): Collection {
  if (!override) return base;
  return {
    ...base,
    ...override,
    id: override.id ?? base.id,
    slug: override.slug ?? base.slug,
    seo: { ...base.seo, ...override.seo },
    conditions: override.conditions ?? base.conditions,
  };
}

export const collectionsDataService = {
  async loadAll(opts: ReadOptions): Promise<Collection[]> {
    const catalogLocale = urlPrefixToCatalogLocale(opts.localePrefix);
    const global = await loadGlobalCollections();
    const merged: Collection[] = [];
    for (const col of global) {
      const override = await loadLocaleOverride(catalogLocale, col.slug);
      merged.push(mergeCollection(col, override));
    }
    return merged;
  },

  async loadBySlug(opts: ReadOptions, slug: string): Promise<Collection | null> {
    const normalizedSlug = slug.trim();
    if (!normalizedSlug) return null;

    const all = await this.loadAll(opts);
    const found = all.find((c) => c.slug === normalizedSlug);
    if (!found) return null;
    if (found.visible === false) return null;
    return found;
  },

  async listIndex(opts: ReadOptions): Promise<Collection[]> {
    const all = await this.loadAll(opts);
    return all.filter((c) => c.visible !== false);
  },

  async localeFileExists(catalogLocale: string, slug: string): Promise<boolean> {
    const path = join(process.cwd(), "src", "data", catalogLocale, "collections", `${slug}.json`);
    return fileExists(path);
  },
};
