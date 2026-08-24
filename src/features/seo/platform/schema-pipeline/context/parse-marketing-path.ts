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

export function parseMarketingPath(
  pathname: string,
  enabledPrefixes: string[],
): ParsedMarketingPath | null {
  const normalized = pathname.split("?")[0]?.replace(/\/$/, "") || "/";
  const segments = normalized.split("/").filter(Boolean);
  if (!segments.length) return null;

  const localePrefix = segments[0] ?? "en";
  if (enabledPrefixes.length && !enabledPrefixes.includes(localePrefix)) {
    return null;
  }

  const rest = segments.slice(1);
  const path = rest.length ? `/${rest.join("/")}` : "/";

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

  return {
    localePrefix,
    path,
    pageType: "cms",
    slug: rest.join("/"),
  };
}

export function toLocaleCode(localePrefix: string): Locale {
  return localePrefix as Locale;
}
