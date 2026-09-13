import { routing } from "@/i18n/routing";
import { getStaticSeoPage, isStaticSeoPageKey } from "@/features/seo/constants";

const LOCALE_PREFIXES = new Set(
  routing.locales.map((locale) => String(locale).replace(/^\//, "").toLowerCase()),
);

/**
 * Normalize a stored canonical so relative product/static paths include the default locale prefix.
 * Absolute URLs that already include a locale path are left unchanged.
 */
export function normalizeCanonicalUrlForPageKey(
  pageKey: string | null | undefined,
  canonicalUrl: string | null | undefined,
): string | null {
  const raw = canonicalUrl?.trim();
  if (!raw) return null;

  if (pageKey?.startsWith("product:")) {
    const slug = pageKey.slice("product:".length).trim();
    if (!slug) return raw;
    const expectedPath = `/${routing.defaultLocale}/products/${slug}`;

    if (/^https?:\/\//i.test(raw)) {
      try {
        const url = new URL(raw);
        const path = url.pathname.replace(/\/$/, "") || "/";
        if (
          path === `/products/${slug}` ||
          path === `/${slug}` ||
          (!hasLocalePrefix(path) && path.endsWith(`/products/${slug}`))
        ) {
          url.pathname = expectedPath;
          return url.href.replace(/\/$/, "");
        }
        return raw.replace(/\/$/, "");
      } catch {
        return raw;
      }
    }

    if (raw === `/products/${slug}` || raw === `products/${slug}`) {
      return expectedPath;
    }
    if (raw.startsWith("/") && !hasLocalePrefix(raw) && raw.includes(`/products/${slug}`)) {
      return expectedPath;
    }
    return raw.startsWith("/") ? raw : `/${raw}`;
  }

  if (pageKey && isStaticSeoPageKey(pageKey)) {
    const page = getStaticSeoPage(pageKey);
    const expectedPath = `/${routing.defaultLocale}${page?.path || ""}` || `/${routing.defaultLocale}`;
    if (raw.startsWith("/") && !hasLocalePrefix(raw) && !/^https?:\/\//i.test(raw)) {
      const withoutSlash = raw === "/" ? "" : raw;
      if (withoutSlash === (page?.path || "") || raw === (page?.path || "/")) {
        return expectedPath === `/${routing.defaultLocale}` ? `/${routing.defaultLocale}` : expectedPath;
      }
    }
  }

  return raw;
}

function hasLocalePrefix(path: string): boolean {
  const segment = path.replace(/^\//, "").split("/")[0]?.toLowerCase();
  return Boolean(segment && LOCALE_PREFIXES.has(segment));
}

/** True when a relative or absolute canonical is missing a locale prefix for a product page. */
export function isLocaleLessProductCanonical(pageKey: string, canonicalUrl: string): boolean {
  if (!pageKey.startsWith("product:")) return false;
  const slug = pageKey.slice("product:".length).trim();
  if (!slug) return false;
  const raw = canonicalUrl.trim();
  if (/^https?:\/\//i.test(raw)) {
    try {
      const path = new URL(raw).pathname.replace(/\/$/, "");
      return path === `/products/${slug}` || (!hasLocalePrefix(path) && path.endsWith(`/products/${slug}`));
    } catch {
      return false;
    }
  }
  return raw === `/products/${slug}` || raw === `products/${slug}`;
}
