import type { Locale } from "@/i18n/routing";
import type { PageType } from "../types";
import { STATIC_SEO_PAGES } from "@/features/seo/constants";

export type ParsedMarketingPath = {
  localePrefix: string;
  path: string;
  pageType: PageType;
  pageKey?: string;
  slug?: string;
};

function classifyPath(
  localePrefix: string,
  path: string,
  rest: string[],
): ParsedMarketingPath {
  if (path === "/") {
    return { localePrefix, path, pageType: "static", pageKey: "home" };
  }

  const staticPage = STATIC_SEO_PAGES.find((page) => page.path === path);
  if (staticPage) {
    return {
      localePrefix,
      path,
      pageType: "static",
      pageKey: staticPage.pageKey,
    };
  }

  if (rest[0] === "faq" && rest.length >= 2) {
    return {
      localePrefix,
      path,
      pageType: "faq",
      slug: rest[1],
    };
  }

  if (rest[0] === "products" && rest.length >= 2) {
    return {
      localePrefix,
      path,
      pageType: "product",
      slug: rest[1],
    };
  }

  if (rest[0] === "blog" && rest.length >= 2) {
    return {
      localePrefix,
      path,
      pageType: "blog",
      slug: rest[1],
    };
  }

  if (rest[0] === "collections" && rest.length >= 2) {
    return {
      localePrefix,
      path,
      pageType: "collection",
      slug: rest[1],
    };
  }

  if (rest[0] === "categories" && rest.length >= 2) {
    return {
      localePrefix,
      path,
      pageType: "collection",
      slug: rest[1],
    };
  }

  if (rest[0] === "brands" && rest.length >= 2) {
    return {
      localePrefix,
      path,
      pageType: "brand",
      slug: rest[1],
    };
  }

  if (rest[0] === "tags" && rest.length >= 2) {
    return {
      localePrefix,
      path,
      pageType: "tag",
      slug: rest[1],
    };
  }

  if (rest[0] === "pages" && rest.length >= 2) {
    return {
      localePrefix,
      path,
      pageType: "cms",
      slug: rest[1],
    };
  }

  if (rest[0] === "search") {
    return {
      localePrefix,
      path,
      pageType: "search",
      pageKey: "search",
    };
  }

  if (rest[0] === "packages" && rest.length >= 2) {
    return {
      localePrefix,
      path,
      pageType: "package",
      slug: rest[1],
    };
  }

  // Wired marketing hubs without STATIC_SEO_PAGES entry (e.g. /solutions)
  if (rest.length === 1) {
    return {
      localePrefix,
      path,
      pageType: "cms",
      slug: rest[0],
      pageKey: rest[0],
    };
  }

  return {
    localePrefix,
    path,
    pageType: "cms",
    slug: rest.join("/"),
  };
}

/**
 * Parse a public marketing pathname under localePrefix: "as-needed".
 * Unprefixed paths (`/`, `/about`) are English (default locale).
 * Prefixed paths (`/en`, `/ar/about`) keep their locale segment.
 */
export function parseMarketingPath(
  pathname: string,
  enabledPrefixes: string[],
  defaultLocalePrefix = "en",
): ParsedMarketingPath | null {
  const normalized = pathname.split("?")[0]?.replace(/\/$/, "") || "/";
  const segments = normalized.split("/").filter(Boolean);

  const defaultPrefix =
    (enabledPrefixes.length
      ? enabledPrefixes.includes(defaultLocalePrefix)
        ? defaultLocalePrefix
        : enabledPrefixes[0]
      : defaultLocalePrefix) || "en";

  // `/` → default-locale English home
  if (!segments.length) {
    return {
      localePrefix: defaultPrefix,
      path: "/",
      pageType: "static",
      pageKey: "home",
    };
  }

  const first = segments[0]!;
  const knownPrefixes = enabledPrefixes.length
    ? enabledPrefixes
    : [defaultPrefix, "en", "ar"].filter((v, i, arr) => arr.indexOf(v) === i);
  const isLocalePrefixed = knownPrefixes.includes(first);

  if (isLocalePrefixed) {
    const localePrefix = first;
    const rest = segments.slice(1);
    const path = rest.length ? `/${rest.join("/")}` : "/";
    return classifyPath(localePrefix, path, rest);
  }

  // Unprefixed English path: /about, /products/foo, /solutions, …
  const rest = segments;
  const path = `/${rest.join("/")}`;
  return classifyPath(defaultPrefix, path, rest);
}

export function toLocaleCode(localePrefix: string): Locale {
  return localePrefix as Locale;
}
