import type { SchemaContext } from "../types";
import type { EntityKey } from "./entity-registry";

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/$/, "");
}

function pageBaseUrl(ctx: SchemaContext): string {
  const origin = normalizeOrigin(ctx.runtime.siteOrigin);
  const prefix = ctx.runtime.localePrefix;
  const path = ctx.page.path === "/" ? "" : ctx.page.path;
  return `${origin}/${prefix}${path}`;
}

export function entityUrl(key: EntityKey, ctx: SchemaContext): string {
  const origin = normalizeOrigin(ctx.runtime.siteOrigin);

  switch (key) {
    case "organization":
      return `${origin}/#organization`;
    case "website":
      return `${origin}/#website`;
    case "local-business":
      return `${origin}/#local-business`;
    case "logo-image":
      return `${origin}/#logo-image`;
    case "webpage":
      return `${pageBaseUrl(ctx)}/#webpage`;
    case "breadcrumb":
      return `${pageBaseUrl(ctx)}/#breadcrumb`;
    case "faqpage":
      return `${pageBaseUrl(ctx)}/#faqpage`;
    case "article":
      return `${pageBaseUrl(ctx)}/#article`;
    default:
      if (key.startsWith("image-")) {
        return `${origin}/#${key}`;
      }
      if (key.startsWith("search-action-")) {
        const localePrefix = key.replace("search-action-", "");
        return `${origin}/${localePrefix}/#search-action`;
      }
      if (key.startsWith("product-")) {
        return `${ctx.runtime.canonicalUrl}#product`;
      }
      if (key.startsWith("video-")) {
        return `${pageBaseUrl(ctx)}/#${key}`;
      }
      return `${origin}/#${key}`;
  }
}

export function searchTargetUrl(localePrefix: string, ctx: SchemaContext): string {
  const origin = normalizeOrigin(ctx.runtime.siteOrigin);
  return `${origin}/${localePrefix}/search?q={search_term_string}`;
}
