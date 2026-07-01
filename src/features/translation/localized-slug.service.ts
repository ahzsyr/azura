import "server-only";

import { translationService } from "./translation.service";

/** Unified localized slug API — use instead of bundle/service duplicates. */
export const localizedSlugService = {
  resolve(
    entityType: string,
    entityId: string,
    localeCode: string,
    fallbackSlug?: string
  ): Promise<string> {
    return translationService.getLocalizedSlug(entityType, entityId, localeCode, fallbackSlug);
  },

  upsert(entityType: string, entityId: string, localeCode: string, slug: string) {
    return translationService.upsertSlug(entityType, entityId, localeCode, slug);
  },
};
