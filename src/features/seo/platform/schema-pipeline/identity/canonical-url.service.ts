import type { SchemaContext } from "../types";
import type { EntityKey } from "./entity-registry";
import {
  SCHEMA_ID_ARTICLE,
  SCHEMA_ID_BREADCRUMB,
  SCHEMA_ID_BRAND,
  SCHEMA_ID_FAQPAGE,
  SCHEMA_ID_LOGO,
  SCHEMA_ID_ORGANIZATION,
  SCHEMA_ID_PRODUCT,
  SCHEMA_ID_OFFER,
  SCHEMA_ID_WEBPAGE,
  SCHEMA_ID_WEBSITE,
} from "../constants";

/** Site-scoped fragment URI rooted at site origin. */
export function siteHashUrl(ctx: SchemaContext, fragment: string): string {
  const origin = ctx.runtime.siteOrigin.replace(/\/$/, "");
  const id = fragment.startsWith("#") ? fragment.slice(1) : fragment;
  return `${origin}/#${id}`;
}

/** Page-scoped fragment URI rooted at cleaned canonical URL. */
export function pageHashUrl(ctx: SchemaContext, fragment: string): string {
  const canonical = ctx.runtime.canonicalUrl.replace(/\/$/, "");
  const id = fragment.startsWith("#") ? fragment.slice(1) : fragment;
  return `${canonical}/#${id}`;
}

/** Canonical hash URL: `{base}/#{fragment}` */
export function canonicalHashUrl(baseUrl: string, fragment: string): string {
  const base = baseUrl.replace(/\/$/, "");
  const id = fragment.startsWith("#") ? fragment.slice(1) : fragment;
  return `${base}/#${id}`;
}

export function entityUrl(key: EntityKey, ctx: SchemaContext): string {
  switch (key) {
    case "organization":
      return siteHashUrl(ctx, SCHEMA_ID_ORGANIZATION);
    case "brand":
      return siteHashUrl(ctx, SCHEMA_ID_BRAND);
    case "website":
      return siteHashUrl(ctx, SCHEMA_ID_WEBSITE);
    case "logo":
      return siteHashUrl(ctx, SCHEMA_ID_LOGO);
    case "webpage":
      return pageHashUrl(ctx, SCHEMA_ID_WEBPAGE);
    case "breadcrumb":
      return pageHashUrl(ctx, SCHEMA_ID_BREADCRUMB);
    case "faqpage":
      return pageHashUrl(ctx, SCHEMA_ID_FAQPAGE);
    case "article":
      return pageHashUrl(ctx, SCHEMA_ID_ARTICLE);
    case "offer":
      return pageHashUrl(ctx, SCHEMA_ID_OFFER);
    default:
      if (key.startsWith("image-")) {
        return siteHashUrl(ctx, key);
      }
      if (key.startsWith("product-")) {
        return pageHashUrl(ctx, SCHEMA_ID_PRODUCT);
      }
      if (key.startsWith("video-")) {
        return pageHashUrl(ctx, key);
      }
      return siteHashUrl(ctx, key);
  }
}
