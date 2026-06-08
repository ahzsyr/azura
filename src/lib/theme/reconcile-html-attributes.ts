import { PRESET_STORAGE_KEY } from "@/features/theme/engine/constants";

/** Re-apply SSR site defaults when no visitor preset override is stored. */
export function reconcileSiteHtmlAttributes(
  ssrAttributes: Record<string, string> | undefined,
): void {
  if (typeof document === "undefined" || !ssrAttributes) return;

  try {
    if (localStorage.getItem(PRESET_STORAGE_KEY)) return;
  } catch {
    return;
  }

  const html = document.documentElement;
  for (const [key, value] of Object.entries(ssrAttributes)) {
    if (!key.startsWith("data-")) continue;
    const datasetKey = key
      .slice(5)
      .replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    html.dataset[datasetKey] = value;
  }
}
