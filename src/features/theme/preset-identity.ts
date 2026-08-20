/** Canonical site-default preset id — single source of truth for resolution. */
export function canonicalSiteDefaultPresetId(
  siteDefaultPresetId: string | null | undefined,
): string | null {
  if (siteDefaultPresetId == null) return null;
  const trimmed = siteDefaultPresetId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Keep legacy `activePresetId` in sync with canonical `siteDefaultPresetId` on writes.
 * Both columns receive the same value until `activePresetId` is removed from the schema.
 */
export function syncPresetIdentityFields(siteDefaultPresetId: string | null | undefined): {
  siteDefaultPresetId: string | null;
  activePresetId: string | null;
} {
  const canonical = canonicalSiteDefaultPresetId(siteDefaultPresetId);
  return {
    siteDefaultPresetId: canonical,
    activePresetId: canonical,
  };
}
