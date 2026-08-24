import type { ProductCtaVariant } from "@/features/products/lib/product-cta";
import type { ProductCtaAppearanceResolved } from "@/features/products/lib/product-cta-appearance";

export type CtaStylePresetId = "solid" | "outline" | "soft" | "gradient";

export const CTA_STYLE_PRESETS: ReadonlyArray<{
  id: CtaStylePresetId;
  label: string;
  variant: ProductCtaVariant;
  patch: Partial<ProductCtaAppearanceResolved>;
}> = [
  {
    id: "solid",
    label: "Solid primary",
    variant: "solid",
    patch: { shadow: "md", hoverAnimation: "lift", textTransform: "uppercase", buttonSize: "md" },
  },
  {
    id: "outline",
    label: "Outline",
    variant: "outline",
    patch: { shadow: "none", hoverAnimation: "glow", textTransform: "uppercase", buttonSize: "md" },
  },
  {
    id: "soft",
    label: "Soft",
    variant: "soft",
    patch: { shadow: "sm", hoverAnimation: "scale", textTransform: "none", buttonSize: "md" },
  },
  {
    id: "gradient",
    label: "Gradient",
    variant: "gradient",
    patch: { shadow: "lg", hoverAnimation: "lift", textTransform: "uppercase", buttonSize: "lg" },
  },
];
