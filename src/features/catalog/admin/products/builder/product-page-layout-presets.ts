import type { ProductPageElementsRules, ProductPageLayoutRules } from "@/features/products/lib/product-page-responsive";
import type { ResolvedProductPageLayout } from "@/features/products/lib/product-storefront-layout";

export type ProductPageLayoutPresetId =
  | "classic_store"
  | "modern_commerce"
  | "luxury_brand"
  | "mobile_first"
  | "marketplace_style"
  | "fashion_style";

export interface ProductPageLayoutPreset {
  id: ProductPageLayoutPresetId;
  label: string;
  description: string;
  apply: (current: {
    layoutRules: ProductPageLayoutRules;
    elementsRules: ProductPageElementsRules;
  }) => {
    layoutRules: ProductPageLayoutRules;
    elementsRules: ProductPageElementsRules;
  };
}

function patchDesktopLayout(
  rules: ProductPageLayoutRules,
  patch: Partial<ResolvedProductPageLayout>,
): ProductPageLayoutRules {
  return {
    ...rules,
    desktop: { ...rules.desktop, ...patch },
  };
}

export const PRODUCT_PAGE_LAYOUT_PRESETS: ProductPageLayoutPreset[] = [
  {
    id: "classic_store",
    label: "Classic Store",
    description: "Gallery left, content right",
    apply: ({ layoutRules, elementsRules }) => ({
      layoutRules: patchDesktopLayout(layoutRules, {
        galleryLayout: "classic",
        mediaPosition: "start",
        galleryThumbPlacement: "left",
      }),
      elementsRules,
    }),
  },
  {
    id: "modern_commerce",
    label: "Modern Commerce",
    description: "Large gallery with sticky buy box",
    apply: ({ layoutRules, elementsRules }) => ({
      layoutRules: patchDesktopLayout(layoutRules, {
        galleryLayout: "wide_gallery",
        mediaPosition: "start",
        stickyBuyBox: true,
        fixedBuyColumn: true,
      }),
      elementsRules,
    }),
  },
  {
    id: "luxury_brand",
    label: "Luxury Brand",
    description: "Full-width hero gallery",
    apply: ({ layoutRules, elementsRules }) => ({
      layoutRules: {
        ...patchDesktopLayout(layoutRules, {
          galleryLayout: "stacked",
          surfaceStyle: "elevated",
        }),
        mobile: { ...layoutRules.mobile, galleryMobileLayout: "immersive" },
      },
      elementsRules,
    }),
  },
  {
    id: "mobile_first",
    label: "Mobile First",
    description: "Optimized for mobile conversion",
    apply: ({ layoutRules, elementsRules }) => ({
      layoutRules: {
        ...layoutRules,
        mobile: {
          ...layoutRules.mobile,
          galleryMobileLayout: "immersive",
          galleryLayout: "stacked",
          tabletColumnMode: "single",
        },
      },
      elementsRules: {
        ...elementsRules,
        desktop: {
          ...elementsRules.desktop,
          compactDisplay: { ...elementsRules.desktop.compactDisplay, enabled: true },
        },
      },
    }),
  },
  {
    id: "marketplace_style",
    label: "Marketplace Style",
    description: "Dense tabs and merchandising blocks",
    apply: ({ layoutRules, elementsRules }) => ({
      layoutRules: patchDesktopLayout(layoutRules, {
        tabsMode: "tabs",
        galleryLayout: "classic",
      }),
      elementsRules: {
        ...elementsRules,
        desktop: {
          ...elementsRules.desktop,
          elementOrder: {
            main: ["tabs", "frequentlyBought", "crossLinks", "promo", "servicesBar", "trust", "gallery"],
            side: elementsRules.desktop.elementOrder.side,
          },
        },
      },
    }),
  },
  {
    id: "fashion_style",
    label: "Fashion Style",
    description: "Large imagery focus",
    apply: ({ layoutRules, elementsRules }) => ({
      layoutRules: patchDesktopLayout(layoutRules, {
        galleryLayout: "wide_gallery",
        titleFontSize: "1.35rem",
        heroGap: "1.5rem",
        surfaceStyle: "plain",
      }),
      elementsRules: {
        ...elementsRules,
        desktop: {
          ...elementsRules.desktop,
          display: {
            ...elementsRules.desktop.display,
            keySpecs: { enabled: false },
            linkedTags: { enabled: false },
          },
        },
      },
    }),
  },
];
