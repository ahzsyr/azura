import "server-only";

import { localeService } from "@/features/i18n/locale.service";
import { routing } from "@/i18n/routing";
import {
  PRIORITY_INDEXABLE_PAGE_KEYS,
  getStaticSeoPage,
} from "@/features/seo/constants";
import { resolveSiteOrigin } from "@/features/seo/resolve-site-origin";

export async function resolveDefaultLocalePrefix(): Promise<string> {
  try {
    const locales = await localeService.listEnabled();
    return locales.find((locale) => locale.isDefault)?.urlPrefix ?? routing.defaultLocale;
  } catch {
    return routing.defaultLocale;
  }
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/$/, "");
}

function pathHasLocalePrefix(pathname: string, prefixes: string[]): boolean {
  const segments = pathname.split("/").filter(Boolean);
  return segments.length > 0 && prefixes.includes(segments[0]!);
}

/**
 * Build the canonical indexable URL for a public marketing path.
 * Bare `/` and locale-less paths resolve under the default locale prefix (e.g. `/en`).
 */
export function buildIndexableUrl(
  siteOrigin: string,
  path = "",
  localePrefix = routing.defaultLocale,
): string {
  const origin = stripTrailingSlash(siteOrigin);
  const normalizedPath = path.trim().replace(/\/$/, "");
  if (!normalizedPath || normalizedPath === "/") {
    return `${origin}/${localePrefix}`;
  }
  const withSlash = normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`;
  if (withSlash.startsWith(`/${localePrefix}/`) || withSlash === `/${localePrefix}`) {
    return `${origin}${withSlash}`;
  }
  return `${origin}/${localePrefix}${withSlash}`;
}

/**
 * Normalize any public URL to its canonical indexable form (default locale prefix, apex origin).
 */
export async function resolveIndexableUrl(
  url: string,
  siteOrigin?: string,
): Promise<string> {
  const origin = stripTrailingSlash(siteOrigin ?? (await resolveSiteOrigin("public")));
  const defaultPrefix = await resolveDefaultLocalePrefix();
  let prefixes = [defaultPrefix];
  try {
    const locales = await localeService.listEnabled();
    prefixes = locales.map((locale) => locale.urlPrefix);
  } catch {
    /* use default */
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return buildIndexableUrl(origin, "", defaultPrefix);
  }

  try {
    const parsed = new URL(trimmed.startsWith("http") ? trimmed : `${origin}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`);
    const pathname = parsed.pathname.replace(/\/$/, "") || "/";
    if (pathname === "/") {
      return buildIndexableUrl(origin, "", defaultPrefix);
    }
    if (pathHasLocalePrefix(pathname, prefixes)) {
      return `${origin}${pathname}`;
    }
    return buildIndexableUrl(origin, pathname, defaultPrefix);
  } catch {
    return buildIndexableUrl(origin, trimmed, defaultPrefix);
  }
}

/** Priority marketing URLs that should be submitted to search engines. */
export async function listPriorityIndexableUrls(siteOrigin?: string): Promise<string[]> {
  const origin = stripTrailingSlash(siteOrigin ?? (await resolveSiteOrigin("public")));
  const defaultPrefix = await resolveDefaultLocalePrefix();
  const urls = PRIORITY_INDEXABLE_PAGE_KEYS.map((pageKey) => {
    const page = getStaticSeoPage(pageKey);
    return buildIndexableUrl(origin, page?.path ?? "", defaultPrefix);
  });
  return [...new Set(urls)];
}

/** Canonical homepage URL (`https://example.com/en`). */
export async function resolveCanonicalHomeUrl(siteOrigin?: string): Promise<string> {
  return resolveIndexableUrl("/", siteOrigin);
}
