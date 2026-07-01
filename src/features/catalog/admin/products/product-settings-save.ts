import { serializeProductCtaForSite } from "@/features/products/lib/product-cta";
import { serializeProductBuyNowForSite } from "@/features/products/lib/product-buy-now";
import type { ResolvedProductBuyNow } from "@/features/products/lib/product-buy-now";
import type { ResolvedProductCtaConfig } from "@/features/products/lib/product-cta";
import type { ResolvedProductPromo, ResolvedProductTrust } from "@/features/products/lib/product-page-display";
import {
  buildProductPageSettingsFromSite,
  enforceDesktopDisplayFloors,
  serializeProductPageElementsDesktopForSite,
  serializeProductPageElementsResponsiveForSite,
  serializeProductPageLayoutDesktopForSite,
  serializeProductPageLayoutResponsiveForSite,
  type ProductPageElementsRules,
  type ProductPageLayoutRules,
} from "@/features/products/lib/product-page-responsive";
import {
  serializeProductPageOverflowForSite,
  type ResolvedProductPageOverflow,
} from "@/features/products/lib/product-page-overflow";
import {
  serializeProductCardLayoutForSite,
  type ResolvedProductCardLayout,
} from "@/features/products/lib/product-storefront-layout";
import {
  serializeProductCardDesignForSite,
  type ResolvedProductCardDesign,
} from "@/features/products/card-design";
import { designToLegacyLayoutPatch } from "@/features/products/card-design/migrate-legacy-card-layout";
import { appearanceConfigToSiteSettings } from "@/features/products/card-appearance/product-card-appearance-adapter";
import type { ProductCardAppearanceConfig } from "@/features/products/card-appearance/product-card-appearance.types";

const API: RequestInit = { credentials: "include", headers: { "Content-Type": "application/json" } };

type SaveSettingsResponse = {
  error?: string;
  settings?: Record<string, unknown>;
};

async function postSettings(
  locale: string,
  key: string,
  value: unknown,
): Promise<Record<string, unknown> | undefined> {
  const res = await fetch("/api/save-settings", {
    ...API,
    method: "POST",
    body: JSON.stringify({ locale, key, value }),
  });
  const json = (await res.json()) as SaveSettingsResponse;
  if (!res.ok) throw new Error(json.error || `Save ${key} failed`);
  return json.settings;
}

async function postSettingsBatch(
  locale: string,
  patches: Array<{ key: string; value: unknown }>,
): Promise<Record<string, unknown> | undefined> {

  const res = await fetch("/api/save-settings", {
    ...API,
    method: "POST",
    body: JSON.stringify({ locale, patches }),
  });
  const json = (await res.json()) as SaveSettingsResponse;

  if (!res.ok) throw new Error(json.error || "Batch save failed");
  return json.settings;
}

export async function saveProductBuyNowSettings(
  locale: string,
  buyNow: ResolvedProductBuyNow,
): Promise<void> {
  await postSettings(locale, "productBuyNow", serializeProductBuyNowForSite(buyNow));
}

export async function saveProductCtaSettings(
  locale: string,
  cta: ResolvedProductCtaConfig,
): Promise<void> {
  await postSettings(locale, "productCta", serializeProductCtaForSite(cta));
}

/** @deprecated Use saveProductCtaSettings */
export const saveProductQuoteCtaSettings = saveProductCtaSettings;

export async function saveProductPageElementsOnlySettings(
  locale: string,
  rules: ProductPageElementsRules,
  allLocales: readonly string[] = [locale],
): Promise<ProductPageElementsRules> {
  const sanitizedRules = enforceDesktopDisplayFloors(rules);
  const desktop = serializeProductPageElementsDesktopForSite(sanitizedRules.desktop);
  const responsive = serializeProductPageElementsResponsiveForSite(sanitizedRules);

  const patches: Array<{ key: string; value: unknown }> = [
    { key: "productPageDisplay", value: desktop.productPageDisplay },
    { key: "productPageElementOrder", value: desktop.productPageElementOrder },
    { key: "productPageCompactDisplay", value: desktop.productPageCompactDisplay },
    { key: "productPageElementsResponsive", value: responsive ?? null },
  ];

  const targetLocales = Array.from(
    new Set([locale, ...allLocales].map((code) => code.trim().toLowerCase()).filter(Boolean)),
  );
  const [primarySettings] = await Promise.all(
    targetLocales.map((targetLocale) => postSettingsBatch(targetLocale, patches)),
  );
  const settings = primarySettings;
  return buildProductPageSettingsFromSite(settings ?? {}).elementsRules;
}

export async function saveProductPageLayoutOnlySettings(
  locale: string,
  rules: ProductPageLayoutRules,
  overflow?: ResolvedProductPageOverflow,
): Promise<void> {
  await postSettingsBatch(locale, buildProductPageLayoutPatches(rules, overflow));
}

export async function saveProductPageBuilderSettings(
  locale: string,
  snapshot: {
    layoutRules: ProductPageLayoutRules;
    elementsRules: ProductPageElementsRules;
    overflow: ResolvedProductPageOverflow;
  },
  allLocales: readonly string[] = [locale],
): Promise<ProductPageElementsRules> {
  const sanitizedElementsRules = enforceDesktopDisplayFloors(snapshot.elementsRules);
  const desktop = serializeProductPageElementsDesktopForSite(sanitizedElementsRules.desktop);
  const elementsResponsive = serializeProductPageElementsResponsiveForSite(sanitizedElementsRules);

  const patches: Array<{ key: string; value: unknown }> = [
    ...buildProductPageLayoutPatches(snapshot.layoutRules, snapshot.overflow),
    { key: "productPageDisplay", value: desktop.productPageDisplay },
    { key: "productPageElementOrder", value: desktop.productPageElementOrder },
    { key: "productPageCompactDisplay", value: desktop.productPageCompactDisplay },
    { key: "productPageElementsResponsive", value: elementsResponsive ?? null },
  ];

  const targetLocales = Array.from(
    new Set([locale, ...allLocales].map((code) => code.trim().toLowerCase()).filter(Boolean)),
  );
  const [primarySettings] = await Promise.all(
    targetLocales.map((targetLocale) => postSettingsBatch(targetLocale, patches)),
  );
  return buildProductPageSettingsFromSite(primarySettings ?? {}).elementsRules;
}

function buildProductPageLayoutPatches(
  rules: ProductPageLayoutRules,
  overflow?: ResolvedProductPageOverflow,
): Array<{ key: string; value: unknown }> {
  const responsive = serializeProductPageLayoutResponsiveForSite(rules);
  const patches: Array<{ key: string; value: unknown }> = [
    {
      key: "productPageLayout",
      value: serializeProductPageLayoutDesktopForSite(rules.desktop),
    },
  ];
  if (responsive) {
    patches.push({ key: "productPageLayoutResponsive", value: responsive });
  }
  if (overflow) {
    const serialized = serializeProductPageOverflowForSite(overflow);
    if (serialized) {
      patches.push({ key: "productPageOverflow", value: serialized });
    }
  }
  return patches;
}

export async function saveProductCardLayoutOnlySettings(
  locale: string,
  cardLayout: ResolvedProductCardLayout,
): Promise<void> {
  await postSettings(locale, "productCardLayout", serializeProductCardLayoutForSite(cardLayout));
}

/** Save unified card appearance (dual-writes design, layout, responsive). */
export async function saveProductCardAppearanceSettings(
  locale: string,
  config: ProductCardAppearanceConfig,
): Promise<void> {
  const { productCardDesign, productCardLayout, productCardDesignResponsive } =
    appearanceConfigToSiteSettings(config);
  await postSettingsBatch(locale, [
    { key: "productCardDesign", value: productCardDesign },
    { key: "productCardLayout", value: productCardLayout },
    { key: "productCardDesignResponsive", value: productCardDesignResponsive },
  ]);
}

/** @deprecated Use saveProductCardAppearanceSettings */
export async function saveProductCardDesignSettings(
  locale: string,
  design: ResolvedProductCardDesign,
  cardLayout: ResolvedProductCardLayout,
): Promise<void> {
  const legacyPatch = designToLegacyLayoutPatch(design, cardLayout);
  const mergedLegacy = { ...cardLayout, ...legacyPatch };
  await postSettingsBatch(locale, [
    { key: "productCardDesign", value: serializeProductCardDesignForSite(design) },
    { key: "productCardLayout", value: serializeProductCardLayoutForSite(mergedLegacy) },
  ]);
}

export async function saveProductPromoSettings(
  locale: string,
  promo: ResolvedProductPromo,
): Promise<void> {
  await postSettings(locale, "productPagePromo", {
    enabled: promo.enabled,
    eyebrow: promo.eyebrow,
    title: promo.title,
    subtitle: promo.subtitle,
    ctaLabel: promo.ctaLabel,
    ctaHref: promo.ctaHref,
    openInNewTab: promo.openInNewTab,
  });
}

export async function saveProductTrustSettings(
  locale: string,
  trust: ResolvedProductTrust,
): Promise<void> {
  await postSettings(locale, "productPageTrust", {
    enabled: trust.enabled,
    provider: trust.provider,
    label: trust.label,
    rating: trust.rating,
    reviewCount: trust.reviewCount,
    href: trust.href,
  });
}
