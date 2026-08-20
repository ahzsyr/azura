/** Known template IDs — extend when registering new layouts in registry-meta.ts */
export const PRODUCT_PAGE_LAYOUT_TEMPLATE_IDS = ["default", "unifi"] as const;

export type ProductPageLayoutTemplateId = (typeof PRODUCT_PAGE_LAYOUT_TEMPLATE_IDS)[number];

export type LayoutAssignmentSource = "product" | "category" | "brand" | "site" | "default";

export interface ResolvedProductPageLayout {
  templateId: ProductPageLayoutTemplateId;
  assignmentSource: LayoutAssignmentSource;
  /** Entity slug or label for admin inheritance display, e.g. category or brand slug */
  assignmentDetail?: string;
}

export interface ProductPageLayoutTemplateMeta {
  id: ProductPageLayoutTemplateId;
  label: string;
  description: string;
}
