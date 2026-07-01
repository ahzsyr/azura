import type { ProductCardDesignPartial, ProductCardStylePreset } from "./product-card-design.types";

export interface ProductCardPresetDefinition {
  id: ProductCardStylePreset;
  label: string;
  description: string;
  patch: ProductCardDesignPartial;
}

export const PRODUCT_CARD_PRESETS: ProductCardPresetDefinition[] = [
  {
    id: "modern_commerce",
    label: "Modern Commerce",
    description: "Shopify-inspired elevation and hover lift",
    patch: {
      style: "modern_commerce",
      layout: "classic_grid",
      motion: "premium",
      hoverEffect: "lift",
      pricingMode: "retail",
      effects: { enabled: false, gradientBorder: false, glow: false, glassLayer: false, lightSweep: false, noiseTexture: false },
    },
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Clean borders, light shadows — ideal for B2B",
    patch: {
      style: "minimal",
      layout: "classic_grid",
      motion: "subtle",
      hoverEffect: "none",
      pricingMode: "minimal",
      effects: { enabled: false, gradientBorder: false, glow: false, glassLayer: false, lightSweep: false, noiseTexture: false },
    },
  },
  {
    id: "luxury",
    label: "Luxury",
    description: "Premium spacing, soft shadows, refined typography",
    patch: {
      style: "luxury",
      layout: "luxury_showcase",
      motion: "luxury",
      hoverEffect: "depth",
      pricingMode: "luxury",
      effects: { enabled: true, gradientBorder: false, glow: false, glassLayer: false, lightSweep: true, noiseTexture: false },
    },
  },
  {
    id: "glass",
    label: "Glassmorphism",
    description: "Frosted surface with blur",
    patch: {
      style: "glass",
      layout: "classic_grid",
      motion: "subtle",
      hoverEffect: "glow",
      pricingMode: "retail",
      effects: { enabled: true, gradientBorder: false, glow: false, glassLayer: true, lightSweep: false, noiseTexture: false },
    },
  },
  {
    id: "editorial",
    label: "Editorial",
    description: "Magazine-style, large imagery",
    patch: {
      style: "editorial",
      layout: "editorial",
      motion: "subtle",
      hoverEffect: "scale_image",
      pricingMode: "minimal",
      effects: { enabled: false, gradientBorder: false, glow: false, glassLayer: false, lightSweep: false, noiseTexture: false },
    },
  },
  {
    id: "dark_premium",
    label: "Dark Premium",
    description: "Glow accents for dark storefronts",
    patch: {
      style: "dark_premium",
      layout: "classic_grid",
      motion: "premium",
      hoverEffect: "glow",
      pricingMode: "luxury",
      effects: { enabled: true, gradientBorder: false, glow: true, glassLayer: false, lightSweep: false, noiseTexture: false },
    },
  },
  {
    id: "neon_tech",
    label: "Neon Tech",
    description: "Glow borders, modern SaaS feel",
    patch: {
      style: "neon_tech",
      layout: "compact_store",
      motion: "interactive",
      hoverEffect: "spotlight",
      pricingMode: "enterprise",
      effects: { enabled: true, gradientBorder: true, glow: true, glassLayer: false, lightSweep: false, noiseTexture: false },
    },
  },
  {
    id: "electronics",
    label: "Electronics",
    description: "Info-rich marketplace layout",
    patch: {
      style: "modern_commerce",
      layout: "marketplace",
      motion: "premium",
      hoverEffect: "lift",
      pricingMode: "marketplace",
      showCategory: true,
    },
  },
  {
    id: "fashion",
    label: "Fashion",
    description: "Editorial imagery, minimal chrome",
    patch: {
      style: "editorial",
      layout: "luxury_showcase",
      motion: "luxury",
      hoverEffect: "cinematic",
      pricingMode: "luxury",
    },
  },
  {
    id: "furniture",
    label: "Furniture",
    description: "Spacious luxury presentation",
    patch: {
      style: "luxury",
      layout: "luxury_showcase",
      motion: "luxury",
      hoverEffect: "depth",
      pricingMode: "retail",
    },
  },
  {
    id: "b2b_catalog",
    label: "B2B Catalog",
    description: "Compact, minimal distractions",
    patch: {
      style: "minimal",
      layout: "compact_store",
      motion: "disabled",
      hoverEffect: "none",
      pricingMode: "enterprise",
      showCategory: true,
    },
  },
];

export function getProductCardPreset(id: ProductCardStylePreset): ProductCardPresetDefinition | undefined {
  return PRODUCT_CARD_PRESETS.find((p) => p.id === id);
}

export function applyProductCardPreset(
  id: ProductCardStylePreset,
  base?: ProductCardDesignPartial,
): ProductCardDesignPartial {
  const preset = getProductCardPreset(id);
  if (!preset) return { ...base, presetId: id };
  return deepMergeDesign(base ?? {}, { ...preset.patch, presetId: id });
}

function deepMergeDesign(
  base: ProductCardDesignPartial,
  overlay: ProductCardDesignPartial,
): ProductCardDesignPartial {
  return {
    ...base,
    ...overlay,
    effects: { ...base.effects, ...overlay.effects },
    media: { ...base.media, ...overlay.media },
    actions: { ...base.actions, ...overlay.actions },
    personalization: { ...base.personalization, ...overlay.personalization },
    badgeRules: overlay.badgeRules ?? base.badgeRules,
    contentOrder: overlay.contentOrder ?? base.contentOrder,
  };
}
