import type {
  ProductCardResponsivePartial,
  ResolvedProductCardDesign,
} from "@/features/products/card-design/product-card-design.types";
import type { ResolvedProductCardLayout } from "@/features/products/lib/product-storefront-layout";

/** Unified admin-facing product card configuration (storage keys are implementation details). */
export type ProductCardAppearanceConfig = {
  design: ResolvedProductCardDesign;
  layout: ResolvedProductCardLayout;
  responsive: ProductCardResponsivePartial;
};

export type ProductCardAppearanceSectionId =
  | "presets"
  | "layout"
  | "content"
  | "style"
  | "spacing"
  | "media"
  | "actions"
  | "motion"
  | "responsive"
  | "advanced";

export const PRODUCT_CARD_APPEARANCE_SECTIONS: Array<{
  id: ProductCardAppearanceSectionId;
  label: string;
  description?: string;
}> = [
  { id: "presets", label: "Presets", description: "Starting templates" },
  { id: "layout", label: "Layout & Structure", description: "Card organization" },
  { id: "content", label: "Content visibility", description: "What appears on cards" },
  { id: "style", label: "Visual Style", description: "Theme and branding" },
  { id: "spacing", label: "Spacing & Dimensions", description: "Sizing and spacing" },
  { id: "media", label: "Media & Badges", description: "Imagery and badges" },
  { id: "actions", label: "Actions & engagement", description: "Buttons and interactions" },
  { id: "motion", label: "Motion & Interactions", description: "Hover and animation" },
  { id: "responsive", label: "Responsive", description: "Per-breakpoint overrides" },
  { id: "advanced", label: "Advanced", description: "Experimental and debug" },
];
