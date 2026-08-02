import "server-only";

import { cache } from "react";
import { catalogCollectionRepository } from "@/repositories/catalog-collection.repository";
import { loadPublicLocaleContext } from "@/features/i18n/public-locale-context";
import { translationService } from "@/features/translation/translation.service";
import { getLocalizedField } from "@/lib/utils";
import type { Collection } from "./types";

const CATALOG_COLLECTION_ENTITY = "CatalogCollection";

type ReadOptions = {
  /** Next locale param (urlPrefix), e.g. "en" / "ar". */
  localePrefix: string;
};

async function applyCollectionTranslations(
  collections: Collection[],
  localePrefix: string,
): Promise<Collection[]> {
  if (collections.length === 0) return collections;

  const ctx = await loadPublicLocaleContext(localePrefix);
  const ids = collections.map((c) => c.id);
  const translationsMap = await translationService.getForEntities(
    CATALOG_COLLECTION_ENTITY,
    ids,
  );

  return collections.map((col) => {
    const translations = translationsMap.get(col.id) ?? [];
    const options = {
      enabledLocales: ctx.enabledLocales,
      defaultCode: ctx.defaultCode,
      translations,
    };
    const legacy = { name: col.name, description: col.description };
    return {
      ...col,
      name: getLocalizedField(legacy, "name", localePrefix, options) || col.slug,
      description: getLocalizedField(legacy, "description", localePrefix, options),
    };
  });
}

const loadAllCached = cache(async (localePrefix: string): Promise<Collection[]> => {
  const global = await catalogCollectionRepository.findAllGlobal();
  return applyCollectionTranslations(global, localePrefix);
});

export const collectionsDataService = {
  async loadAll(opts: ReadOptions): Promise<Collection[]> {
    return loadAllCached(opts.localePrefix);
  },

  async loadBySlug(opts: ReadOptions, slug: string): Promise<Collection | null> {
    const normalizedSlug = slug.trim();
    if (!normalizedSlug) return null;

    const all = await loadAllCached(opts.localePrefix);
    const found = all.find((c) => c.slug === normalizedSlug);
    if (!found) return null;
    if (found.visible === false) return null;
    return found;
  },

  async listIndex(opts: ReadOptions): Promise<Collection[]> {
    const all = await loadAllCached(opts.localePrefix);
    return all.filter((c) => c.visible !== false);
  },
};
