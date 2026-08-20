/**
 * Server-safe layout template registry metadata.
 * No React imports — safe for resolver, save validation, and admin option lists.
 */
import {
  PRODUCT_PAGE_LAYOUT_TEMPLATE_IDS,
  type ProductPageLayoutTemplateId,
  type ProductPageLayoutTemplateMeta,
  type ResolvedProductPageLayout,
} from "./types";

export const DEFAULT_PRODUCT_PAGE_LAYOUT_TEMPLATE_ID: ProductPageLayoutTemplateId = "default";

const TEMPLATE_META: Record<ProductPageLayoutTemplateId, ProductPageLayoutTemplateMeta> = {
  default: {
    id: "default",
    label: "Default",
    description: "Standard product detail layout with configurable elements and regions",
  },
  unifi: {
    id: "unifi",
    label: "UniFi Store",
    description: "Sticky purchase bar, anchor tabs, and left thumbnail rail",
  },
};

/** All registered template metadata entries. */
export function listProductPageLayoutTemplateMeta(): ProductPageLayoutTemplateMeta[] {
  return PRODUCT_PAGE_LAYOUT_TEMPLATE_IDS.map((id) => TEMPLATE_META[id]);
}

export function getProductPageLayoutTemplateMeta(
  id: ProductPageLayoutTemplateId,
): ProductPageLayoutTemplateMeta {
  return TEMPLATE_META[id];
}

function isRegisteredTemplateId(value: string): value is ProductPageLayoutTemplateId {
  return (PRODUCT_PAGE_LAYOUT_TEMPLATE_IDS as readonly string[]).includes(value);
}

/**
 * Stored template ID → registry lookup → valid template → fallback to default.
 */
export function validateTemplateId(
  id: string | null | undefined,
): ProductPageLayoutTemplateId {
  if (id == null || id === "") return DEFAULT_PRODUCT_PAGE_LAYOUT_TEMPLATE_ID;
  const trimmed = String(id).trim();
  if (!trimmed || !isRegisteredTemplateId(trimmed)) {
    return DEFAULT_PRODUCT_PAGE_LAYOUT_TEMPLATE_ID;
  }
  return trimmed;
}

/** Format inheritance for admin UI, e.g. "UniFi — inherited from Brand (ubiquiti)" */
export function formatLayoutAssignmentLabel(
  templateId: ProductPageLayoutTemplateId,
  source: ResolvedProductPageLayout["assignmentSource"],
  detail?: string,
): string {
  const meta = getProductPageLayoutTemplateMeta(templateId);
  if (source === "default") return `${meta.label} — system default`;
  if (source === "site") return `${meta.label} — site default`;
  if (source === "product") return `${meta.label} — product override`;
  const entity =
    source === "category" ? "Category" : source === "brand" ? "Brand" : "Source";
  const suffix = detail ? ` (${detail})` : "";
  return `${meta.label} — inherited from ${entity}${suffix}`;
}
