export function deepMergeSettings(
  base: Record<string, unknown>,
  overlay: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(overlay)) {
    const existing = out[key];
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      existing &&
      typeof existing === "object" &&
      !Array.isArray(existing)
    ) {
      out[key] = deepMergeSettings(
        existing as Record<string, unknown>,
        value as Record<string, unknown>,
      );
    } else {
      out[key] = value;
    }
  }
  return out;
}

/** Merge locale-specific site settings over the default locale baseline. */
export function mergeLocaleSiteSettingsWithDefault(
  defaultSettings: Record<string, unknown>,
  localeSettings: Record<string, unknown>,
): Record<string, unknown> {
  return deepMergeSettings(defaultSettings, localeSettings);
}
