export type PageKind =
  | "base"
  | "cms"
  | "product-config"
  | "category"
  | "brand"
  | "other";

export type UnifiedPageStatus = "published" | "draft" | "system" | "archived" | "scheduled";

/** Read-only aggregated page row for unified admin — not a persisted entity. */
export interface UnifiedPageEntry {
  id: string;
  kind: PageKind;
  title: string;
  slug: string;
  publicPath: string;
  status?: UnifiedPageStatus;
  pageTypeLabel: string;
  layoutTemplate?: string | null;
  layoutAssignmentSource?: "product" | "category" | "brand" | "site" | "default" | "inherit";
  layoutAssignmentLabel?: string;
  editHref: string;
  viewHref?: string;
  meta?: {
    blockCount?: number;
    templateKey?: string;
    cmsPageId?: string;
  };
}

export type UnifiedPagesTabId =
  | "all"
  | "base"
  | "cms"
  | "product"
  | "category"
  | "brand"
  | "other";

export const UNIFIED_PAGES_TABS: Array<{ id: UnifiedPagesTabId; label: string }> = [
  { id: "all", label: "All Pages" },
  { id: "base", label: "Base Pages" },
  { id: "cms", label: "CMS Pages" },
  { id: "product", label: "Product Page" },
  { id: "category", label: "Category Pages" },
  { id: "brand", label: "Brand Pages" },
  { id: "other", label: "Other" },
];
