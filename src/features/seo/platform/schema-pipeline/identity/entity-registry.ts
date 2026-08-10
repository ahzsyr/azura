import type { SchemaContext } from "../types";
import { entityUrl } from "./canonical-url.service";

/** Semantic entity keys — no URL construction here. */
export type EntityKey =
  | "organization"
  | "website"
  | "local-business"
  | "logo-image"
  | `image-${string}`
  | "webpage"
  | "breadcrumb"
  | "faqpage"
  | `search-action-${string}`
  | `product-${string}`
  | `video-${string}`
  | "article";

export function entityRef(key: EntityKey, ctx: SchemaContext): { "@id": string } {
  return { "@id": entityUrl(key, ctx) };
}
