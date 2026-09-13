import type { SchemaContext } from "../types";
import { entityUrl } from "./canonical-url.service";

/** Semantic entity keys — no URL construction here. */
export type EntityKey =
  | "organization"
  | "brand"
  | "website"
  | "logo"
  | `image-${string}`
  | "webpage"
  | "breadcrumb"
  | "faqpage"
  | `product-${string}`
  | "offer"
  | `video-${string}`
  | "article";

export function entityRef(key: EntityKey, ctx: SchemaContext): { "@id": string } {
  return { "@id": entityUrl(key, ctx) };
}
