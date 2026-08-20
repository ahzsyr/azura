import type { ChromeVisibilityMode } from "@/schemas/theme";

export type ChromeVisibilitySettings = {
  enabled?: boolean;
  visibilityMode?: ChromeVisibilityMode;
  pagePaths?: string[];
};

/** Collapse trailing slashes and query strings so `/about/` matches `/about`. */
export function normalizeChromePath(pathname: string): string {
  const withoutQuery = (pathname.split("?")[0] ?? "/").trim();
  const withLeading = withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
  const trimmed = withLeading.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

/**
 * Match a stored page path against the current locale-stripped pathname.
 * Patterns like `/products/[slug]` match a single extra segment.
 */
export function chromePathMatches(pattern: string, pathname: string): boolean {
  const expected = normalizeChromePath(pattern);
  const actual = normalizeChromePath(pathname);
  if (expected === actual) return true;
  if (!expected.includes("[")) return false;
  const withPlaceholders = expected.replace(/\[[^\]]+\]/g, "\0");
  const escaped = withPlaceholders.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const source = escaped.replace(/\0/g, "[^/]+");
  return new RegExp(`^${source}$`).test(actual);
}

/** Whether the site header or footer should render on the current page. */
export function isChromeVisible(
  settings: ChromeVisibilitySettings | null | undefined,
  pathname: string,
): boolean {
  if (settings?.enabled === false) return false;

  const mode = settings?.visibilityMode ?? "all";
  const paths = settings?.pagePaths ?? [];
  if (mode === "all" || paths.length === 0) return true;

  const matched = paths.some((path) => chromePathMatches(path, pathname));
  if (mode === "selected") return matched;
  return !matched;
}
