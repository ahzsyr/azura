import "server-only";
import { localeService } from "@/features/i18n/locale.service";
import { getCmsPageLocalizedPublicPath } from "@/features/cms/cms-page-path";

async function localePrefixes() {
  const locales = await localeService.listEnabled().catch(() => []);
  return locales.length ? locales.map((locale) => locale.urlPrefix) : ["en"];
}

/** Canonical public paths for a CMS page (wired hubs use clean URLs, not /pages/{slug}). */
export async function cmsPagePaths(slug: string) {
  const prefixes = await localePrefixes();
  const clean = slug.replace(/^\/+/, "");
  return prefixes.map((prefix) => getCmsPageLocalizedPublicPath(prefix, clean));
}

export async function postPaths(slug: string) {
  const prefixes = await localePrefixes();
  const clean = slug.replace(/^\/+/, "");
  return prefixes.map((prefix) => `/${prefix}/blog/${clean}`);
}

export async function contentItemPaths(
  routePrefix: string | null | undefined,
  slug: string | null | undefined,
  typeSlug?: string | null,
) {
  const prefix = (routePrefix?.trim() || typeSlug?.trim() || "").replace(/^\/+|\/+$/g, "");
  if (!prefix || !slug) return [];
  const prefixes = await localePrefixes();
  const cleanSlug = slug.replace(/^\/+/, "");
  return prefixes.map((localePrefix) => `/${localePrefix}/${prefix}/${cleanSlug}`);
}

export function productPath(locale: string, slug: string) {
  return `/${locale}/products/${slug.replace(/^\/+/, "")}`;
}
