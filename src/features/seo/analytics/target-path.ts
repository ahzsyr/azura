import { getStaticSeoPage, isStaticSeoPageKey } from "@/features/seo/constants";
import type { PageSearchTarget } from "@/features/search-intelligence/content-intelligence/page-search-target";

/** Derive public path for a page search target via the SEO URL layer (never free-text targetUrl). */
export function pathForPageSearchTarget(target: PageSearchTarget): string {
  const { type, id } = target.entity;
  if (type === "pageKey" && isStaticSeoPageKey(id)) {
    return getStaticSeoPage(id)?.path ?? `/${id}`;
  }
  if (type === "CATEGORY") return `/categories/${id}`;
  if (type === "BRAND") return `/brands/${id}`;
  if (type === "PRODUCT" || type === "CONTENT_ITEM") return `/products/${id}`;
  if (type === "POST") return `/blog/${id}`;
  if (type === "CMS_PAGE") return `/pages/${id}`;
  if (type === "PACKAGE") return `/packages/${id}`;
  if (id.startsWith("category:")) return `/categories/${id.slice("category:".length)}`;
  if (id.startsWith("brand:")) return `/brands/${id.slice("brand:".length)}`;
  return `/${id}`;
}
