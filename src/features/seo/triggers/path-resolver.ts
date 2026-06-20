import "server-only";
import { localeService } from "@/features/i18n/locale.service";

async function localePrefixes() {
  const locales = await localeService.listEnabled().catch(() => []);
  return locales.length ? locales.map((locale) => locale.urlPrefix) : ["en"];
}

export async function cmsPagePaths(slug: string) {
  const prefixes = await localePrefixes();
  const clean = slug.replace(/^\/+/, "");
  return prefixes.flatMap((prefix) => [`/${prefix}/pages/${clean}`, `/${prefix}/${clean}`]);
}

export async function postPaths(slug: string) {
  const prefixes = await localePrefixes();
  const clean = slug.replace(/^\/+/, "");
  return prefixes.map((prefix) => `/${prefix}/blog/${clean}`);
}

export async function contentItemPaths(routePrefix: string | null | undefined, slug: string | null | undefined) {
  if (!routePrefix || !slug) return [];
  const prefixes = await localePrefixes();
  const cleanPrefix = routePrefix.replace(/^\/+|\/+$/g, "");
  const cleanSlug = slug.replace(/^\/+/, "");
  return prefixes.map((prefix) => `/${prefix}/${cleanPrefix}/${cleanSlug}`);
}

export function productPath(locale: string, slug: string) {
  return `/${locale}/products/${slug.replace(/^\/+/, "")}`;
}
