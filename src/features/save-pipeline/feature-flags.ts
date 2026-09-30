export function isFeatureEnabled(name: string, defaultValue = false): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (raw == null || raw === "") return defaultValue;
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

export function isCmsPagePatchSaveEnabled(): boolean {
  return isFeatureEnabled("CMS_PAGE_PATCH_SAVE_ENABLED", true);
}

export function isContentItemPatchSaveEnabled(): boolean {
  return isFeatureEnabled("CONTENT_ITEM_PATCH_SAVE_ENABLED", true);
}

export function isPostPatchSaveEnabled(): boolean {
  return isFeatureEnabled("POST_PATCH_SAVE_ENABLED", false);
}

export function isPostPatchShadowModeEnabled(): boolean {
  return isFeatureEnabled("POST_PATCH_SHADOW_MODE_ENABLED", true);
}

export function isAsyncSearchIndexingEnabled(): boolean {
  return isFeatureEnabled("ASYNC_SEARCH_INDEXING_ENABLED", true);
}
