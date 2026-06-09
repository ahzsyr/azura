import { hasVisitorThemeOverrides } from "@/features/theme/engine/preset-session";

/** Re-apply SSR site defaults when no visitor preset override is stored. */
export function reconcileSiteHtmlAttributes(
  ssrAttributes: Record<string, string> | undefined,
): void {
  if (typeof document === "undefined" || !ssrAttributes) return;

  if (hasVisitorThemeOverrides()) return;

  const html = document.documentElement;
  for (const [key, value] of Object.entries(ssrAttributes)) {
    if (!key.startsWith("data-")) continue;
    const datasetKey = key
      .slice(5)
      .replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    html.dataset[datasetKey] = value;
  }
}
