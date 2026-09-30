import type { PublicLocale } from "@/features/i18n/locale.service";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";
import { RESERVED_MARKETING_SLUGS } from "@/i18n/reserved-slugs";

/** Default locale urlPrefix from fallback config (sync). Server code may pass DB default. */
export function getFallbackDefaultLocalePrefix(): string {
  return FALLBACK_LOCALES.find((l) => l.isDefault)?.urlPrefix ?? FALLBACK_LOCALES[0]!.urlPrefix;
}

/**
 * Public marketing path for a locale. Default locale omits the prefix (as-needed).
 * en + "/" → "/"; en + "/about" → "/about"; ar + "/about" → "/ar/about"
 */
export function publicLocalePath(
  urlPrefix: string,
  path: string,
  defaultPrefix: string = getFallbackDefaultLocalePrefix(),
): string {
  const normalizedPath = path.trim();
  const withLeading =
    !normalizedPath || normalizedPath === "/"
      ? "/"
      : normalizedPath.startsWith("/")
        ? normalizedPath
        : `/${normalizedPath}`;

  if (urlPrefix === defaultPrefix) {
    return withLeading === "/" ? "/" : withLeading;
  }
  if (withLeading === "/") return `/${urlPrefix}`;
  return `/${urlPrefix}${withLeading}`;
}

/** Absolute public URL for sitemap, canonical, OG, and IndexNow. */
export function publicLocaleAbsoluteUrl(
  siteOrigin: string,
  urlPrefix: string,
  path: string,
  defaultPrefix?: string,
): string {
  const origin = siteOrigin.replace(/\/$/, "");
  const publicPath = publicLocalePath(urlPrefix, path, defaultPrefix);
  return publicPath === "/" ? `${origin}/` : `${origin}${publicPath}`;
}

/** Legacy /en public path → unprefixed path for the default locale. */
export function stripDefaultLocalePublicPrefix(
  pathname: string,
  defaultPrefix: string = getFallbackDefaultLocalePrefix(),
): string {
  return publicLocalePath(
    defaultPrefix,
    stripAnyLocalePrefix(pathname, [defaultPrefix]),
    defaultPrefix,
  );
}

/**
 * Strips any known locale URL prefix from a pathname.
 * Returns "/" when the path is only a locale root (e.g. "/en").
 */
export function stripAnyLocalePrefix(
  pathname: string,
  urlPrefixes: string[] = FALLBACK_LOCALES.map((l) => l.urlPrefix)
): string {
  const path =
    typeof pathname === "string" ? pathname : pathname == null ? "/" : String(pathname);
  const normalized = path.startsWith("/") ? path : `/${path}`;
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

/**
 * Canonical storefront routes use `/categories`. Rewrite leftover `/collections`
 * listing paths (index or single slug). Nested asset paths are left unchanged.
 */
export function rewriteLegacyCollectionRoute(path: string): string {
  if (path === "/collections" || path === "/collections/") return "/categories";
  const match = /^\/collections\/([^/]+)\/?$/.exec(path);
  if (match) return `/categories/${match[1]}`;
  return path;
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
  knownPrefixes: string[],
  defaultPrefix?: string,
): string {
  const defaultLoc = defaultPrefix ?? getFallbackDefaultLocalePrefix();
  const prefixSet = new Set(knownPrefixes);
  let path = fullPathname.startsWith("/") ? fullPathname : `/${fullPathname}`;
  const segments = path.split("/").filter(Boolean);

  // Unprefixed default-locale URLs may use slugs that match locale codes (e.g. /id).
  if (
    currentPrefix === defaultLoc &&
    segments.length === 1 &&
    prefixSet.has(segments[0]!) &&
    path !== `/${currentPrefix}` &&
    !path.startsWith(`/${currentPrefix}/`)
  ) {
    return path;
  }

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
  knownPrefixes: string[] = FALLBACK_LOCALES.map((l) => l.urlPrefix),
  defaultPrefix?: string,
): string {
  const defaultLoc = defaultPrefix ?? getFallbackDefaultLocalePrefix();
  const prefixes = Array.from(new Set([...knownPrefixes, urlPrefix]));
  const stripped = rewriteLegacyCollectionRoute(stripAnyLocalePrefix(path, prefixes));
  return publicLocalePath(urlPrefix, stripped, defaultLoc);
}

/**
 * Switches the locale prefix while preserving the rest of the path (including slugs).
 */
export function switchLocalePath(
  currentPath: string,
  currentPrefix: string,
  targetUrlPrefix: string,
  knownPrefixes: string[] = FALLBACK_LOCALES.map((l) => l.urlPrefix),
  defaultPrefix?: string,
): string {
  const defaultLoc = defaultPrefix ?? getFallbackDefaultLocalePrefix();
  const neutral = rewriteLegacyCollectionRoute(
    getNeutralPathnameForSwitch(currentPath, currentPrefix, knownPrefixes, defaultLoc),
  );
  return publicLocalePath(targetUrlPrefix, neutral, defaultLoc);
}

/**
 * Builds href for locale switcher: locale-neutral pathname + target prefix + optional query.
 */
export function buildLocaleSwitchHref(
  pathnameWithoutLocale: string,
  targetUrlPrefix: string,
  searchParams?: string | null,
  defaultPrefix?: string,
): string {
  const defaultLoc = defaultPrefix ?? getFallbackDefaultLocalePrefix();
  const path = rewriteLegacyCollectionRoute(
    pathnameWithoutLocale.startsWith("/")
      ? pathnameWithoutLocale
      : `/${pathnameWithoutLocale}`,
  );
  const href = publicLocalePath(targetUrlPrefix, path, defaultLoc);
  if (!searchParams) return href;
  const query = searchParams.startsWith("?") ? searchParams.slice(1) : searchParams;
  return query ? `${href}?${query}` : href;
}

export function getKnownPrefixesFromLocales(locales: PublicLocale[]): string[] {
  return locales.map((l) => l.urlPrefix);
}

/** Ensure middleware/next-intl knows about locale segments present in the URL (e.g. /ar). */
export function augmentLocalesFromPathname(pathname: string, locales: string[]): string[] {
  const merged = new Set(locales.map((l) => l.toLowerCase()));
  for (const seg of pathname.split("/").filter(Boolean).slice(0, 2)) {
    if (/^[a-z]{2}(?:-[a-z]{2})?$/i.test(seg)) {
      merged.add(seg.toLowerCase());
    }
  }
  return [...merged];
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

  if (segments.length === 2) {
    const first = segments[0];
    const second = segments[1];
    if (first && second && prefixSet.has(first) && first === second) {
      return `/${first}`;
    }
    if (
      first &&
      second &&
      prefixSet.has(first) &&
      first !== second &&
      /^[a-z]{2}$/.test(second) &&
      RESERVED_MARKETING_SLUGS.has(second)
    ) {
      return `/${second}`;
    }
    if (
      first &&
      second &&
      prefixSet.has(first) &&
      prefixSet.has(second) &&
      first !== second &&
      RESERVED_MARKETING_SLUGS.has(second)
    ) {
      return `/${second}`;
    }
    return null;
  }

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
