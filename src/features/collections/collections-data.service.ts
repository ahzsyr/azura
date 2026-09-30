import "server-only";

import { categoriesDataService } from "@/features/categories/categories-data.service";
import type { Collection } from "./types";

type ReadOptions = {
  /** Next locale param (urlPrefix), e.g. "en" / "ar". */
  localePrefix: string;
};

/**
 * Public catalog taxonomy reads.
 * Stage 7: delegates to categoriesDataService (Category SoT + CatalogCollection fallback).
 */
export const collectionsDataService = {
  async loadAll(opts: ReadOptions): Promise<Collection[]> {
    return categoriesDataService.loadAllProduct(opts);
  },

  async loadBySlug(opts: ReadOptions, slug: string): Promise<Collection | null> {
    return categoriesDataService.loadBySlug(opts, slug);
  },

  async listIndex(opts: ReadOptions): Promise<Collection[]> {
    return categoriesDataService.listIndex(opts);
  },
};
