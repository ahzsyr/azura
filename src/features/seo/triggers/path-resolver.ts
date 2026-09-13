import "server-only";
import { localeService } from "@/features/i18n/locale.service";
import { getCmsPageLocalizedPublicPath } from "@/features/cms/cms-page-path";
import { getFallbackDefaultLocalePrefix, publicLocalePath } from "@/i18n/url-helpers";

async function localePrefixes() {
  const locales = await localeService.listEnabled().catch(() => []);
  return locales.length ? locales.map((locale) => locale.urlPrefix) : ["en"];
}

async function resolveDefaultPrefix(): Promise<string> {
  const locales = await localeService.listEnabled().catch(() => []);
  return (
    locales.find((locale) => locale.isDefault)?.urlPrefix ?? getFallbackDefaultLocalePrefix()
  );
}

/** Canonical public paths for a CMS page (wired hubs use clean URLs, not /pages/{slug}). */
export async function cmsPagePaths(slug: string) {
  const prefixes = await localePrefixes();
  const defaultPrefix = await resolveDefaultPrefix();
  const clean = slug.replace(/^\/+/, "");
  return prefixes.map((prefix) => getCmsPageLocalizedPublicPath(prefix, clean, defaultPrefix));
}

export async function postPaths(slug: string) {
  const prefixes = await localePrefixes();
  const defaultPrefix = await resolveDefaultPrefix();
  const clean = slug.replace(/^\/+/, "");
  return prefixes.map((prefix) =>
    publicLocalePath(prefix, `/blog/${clean}`, defaultPrefix),
  );
}

export async function contentItemPaths(
  routePrefix: string | null | undefined,
  slug: string | null | undefined,
  typeSlug?: string | null,
) {
  const prefix = (routePrefix?.trim() || typeSlug?.trim() || "").replace(/^\/+|\/+$/g, "");
  if (!prefix || !slug) return [];
  const prefixes = await localePrefixes();
  const defaultPrefix = await resolveDefaultPrefix();
  const cleanSlug = slug.replace(/^\/+/, "");
  return prefixes.map((localePrefix) =>
    publicLocalePath(localePrefix, `/${prefix}/${cleanSlug}`, defaultPrefix),
  );
}

export function productPath(locale: string, slug: string, defaultPrefix?: string) {
  const defaultLoc = defaultPrefix ?? getFallbackDefaultLocalePrefix();
  return publicLocalePath(locale, `/products/${slug.replace(/^\/+/, "")}`, defaultLoc);
}
