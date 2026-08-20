/**
 * Product page layout template registry — single source of truth.
 *
 * Adding a layout:
 * 1. Add the id to PRODUCT_PAGE_LAYOUT_TEMPLATE_IDS in types.ts
 * 2. Add metadata in registry-meta.ts
 * 3. Add a TemplateComponent branch in product-detail-layout-router.tsx
 *
 * Admin selects and the resolver must import from this module (or registry-meta
 * for server-safe metadata). Do not hardcode template ids in UI.
 */
export {
  DEFAULT_PRODUCT_PAGE_LAYOUT_TEMPLATE_ID,
  formatLayoutAssignmentLabel,
  getProductPageLayoutTemplateMeta,
  listProductPageLayoutTemplateMeta,
  validateTemplateId,
} from "./registry-meta";

export {
  PRODUCT_PAGE_LAYOUT_TEMPLATE_IDS,
  type LayoutAssignmentSource,
  type ProductPageLayoutTemplateId,
  type ProductPageLayoutTemplateMeta,
  type ResolvedProductPageLayout,
} from "./types";

import { listProductPageLayoutTemplateMeta } from "./registry-meta";
import type { ProductPageLayoutTemplateMeta } from "./types";

/** Alias used by admin selectors. */
export function listProductPageLayoutTemplates(): ProductPageLayoutTemplateMeta[] {
  return listProductPageLayoutTemplateMeta();
}
