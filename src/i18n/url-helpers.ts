import type { PublicLocale } from "@/features/i18n/locale.service";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";

/**
 * Strips any known locale URL prefix from a pathname.
 * Returns "/" when the path is only a locale root (e.g. "/en").
 */
export function stripAnyLocalePrefix(
  pathname: string,
  urlPrefixes: string[] = FALLBACK_LOCALES.map((l) => l.urlPrefix)
): string {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  for (const prefix of urlPrefixes) {
    const segment = `/${prefix}`;
    if (normalized === segment) return "/";
    if (normalized.startsWith(`${segment}/`)) {
      return normalized.slice(segment.length) || "/";
    }
  }
  return normalized;
}

/** Removes only the given locale segment from the start of a pathname. */
export function stripCurrentLocalePrefix(pathname: string, currentPrefix: string): string {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const segment = `/${currentPrefix}`;
  if (normalized === segment) return "/";
  if (normalized.startsWith(`${segment}/`)) {
    return normalized.slice(segment.length) || "/";
  }
  return normalized;
}

function getFirstSegment(pathname: string): string | undefined {
  return pathname.split("/").filter(Boolean)[0];
}

/**
 * Derives a locale-neutral path for language switching.
 * Unwinds stacked locale prefixes from buggy switches; preserves slugs that match locale codes.
 */
export function getNeutralPathnameForSwitch(
  fullPathname: string,
  currentPrefix: string,
  knownPrefixes: string[]
): string {
  const prefixSet = new Set(knownPrefixes);
  let path = fullPathname.startsWith("/") ? fullPathname : `/${fullPathname}`;
  let strippedCount = 0;

  while (strippedCount <= knownPrefixes.length) {
    const first = getFirstSegment(path);
    if (!first || !prefixSet.has(first)) break;

    const segments = path.split("/").filter(Boolean);
    if (strippedCount >= 1 && segments.length === 1 && prefixSet.has(first)) {
      break;
    }

    const next = stripCurrentLocalePrefix(path, first);
    if (next === path) break;
    path = next;
    strippedCount++;
  }

  if (getFirstSegment(path) === currentPrefix) {
    path = stripCurrentLocalePrefix(path, currentPrefix);
  }

  return path;
}

/**
 * Builds a locale-prefixed path from a locale-neutral pathname.
 */
export function localePathFromPrefix(
  path: string,
  urlPrefix: string,
  knownPrefixes: string[] = FALLBACK_LOCALES.map((l) => l.urlPrefix)
): string {
  const stripped = stripAnyLocalePrefix(path, knownPrefixes);
  if (stripped === "/") return `/${urlPrefix}`;
  const suffix = stripped.startsWith("/") ? stripped : `/${stripped}`;
  return `/${urlPrefix}${suffix}`;
}

/**
 * Switches the locale prefix while preserving the rest of the path (including slugs).
 */
export function switchLocalePath(
  currentPath: string,
  currentPrefix: string,
  targetUrlPrefix: string,
  knownPrefixes: string[] = FALLBACK_LOCALES.map((l) => l.urlPrefix)
): string {
  const neutral = getNeutralPathnameForSwitch(currentPath, currentPrefix, knownPrefixes);
  if (neutral === "/") return `/${targetUrlPrefix}`;
  const suffix = neutral.startsWith("/") ? neutral : `/${neutral}`;
  return `/${targetUrlPrefix}${suffix}`;
}

/**
 * Builds href for locale switcher: locale-neutral pathname + target prefix + optional query.
 */
export function buildLocaleSwitchHref(
  pathnameWithoutLocale: string,
  targetUrlPrefix: string,
  searchParams?: string | null
): string {
  const path = pathnameWithoutLocale.startsWith("/")
    ? pathnameWithoutLocale
    : `/${pathnameWithoutLocale}`;
  const href =
    path === "/" ? `/${targetUrlPrefix}` : `/${targetUrlPrefix}${path}`;
  if (!searchParams) return href;
  const query = searchParams.startsWith("?") ? searchParams.slice(1) : searchParams;
  return query ? `${href}?${query}` : href;
}

export function getKnownPrefixesFromLocales(locales: PublicLocale[]): string[] {
  return locales.map((l) => l.urlPrefix);
}

/**
 * Detects stacked locale segments from buggy locale switches (e.g. /en/id/ar)
 * and returns a single-locale canonical path, or null.
 *
 * Bug pattern: next-intl prepends the current locale to an already-prefixed path,
 * producing /{currentLocale}/{targetLocale}/...slug.
 *
 * Two-segment paths like /en/ar are not rewritten — they may be locale + slug.
 */
export function normalizeStackedLocalePathname(
  pathname: string,
  knownPrefixes: string[] = FALLBACK_LOCALES.map((l) => l.urlPrefix)
): string | null {
  const prefixSet = new Set(knownPrefixes);
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const segments = normalized.split("/").filter(Boolean);

  if (segments.length < 3) return null;

  const first = segments[0];
  const second = segments[1];
  if (!first || !second || !prefixSet.has(first) || !prefixSet.has(second)) {
    return null;
  }

  const locale = second;
  const rest = segments.slice(2);
  const canonical = rest.length === 0 ? `/${locale}` : `/${locale}/${rest.join("/")}`;

  if (canonical === normalized || canonical === normalized.replace(/\/$/, "")) {
    return null;
  }

  return canonical;
}
