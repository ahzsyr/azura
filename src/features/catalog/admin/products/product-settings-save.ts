import { serializeProductCtaForSite } from "@/features/products/lib/product-cta";
import { serializeProductBuyNowForSite } from "@/features/products/lib/product-buy-now";
import type { ResolvedProductBuyNow } from "@/features/products/lib/product-buy-now";
import type { ResolvedProductCtaConfig } from "@/features/products/lib/product-cta";
import type { ResolvedProductPromo, ResolvedProductTrust } from "@/features/products/lib/product-page-display";
import {
  buildProductPageSettingsFromSite,
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

export async function saveProductQuoteCtaSettings(
  locale: string,
  cta: ResolvedProductCtaConfig,
): Promise<void> {
  await postSettings(locale, "productCta", serializeProductCtaForSite(cta));
}

export async function saveProductPageElementsOnlySettings(
  locale: string,
  rules: ProductPageElementsRules,
  allLocales: readonly string[] = [locale],
): Promise<ProductPageElementsRules> {
  const desktop = serializeProductPageElementsDesktopForSite(rules.desktop);
  const responsive = serializeProductPageElementsResponsiveForSite(rules);

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
  await postSettingsBatch(locale, patches);
}

export async function saveProductCardLayoutOnlySettings(
  locale: string,
  cardLayout: ResolvedProductCardLayout,
): Promise<void> {
  await postSettings(locale, "productCardLayout", serializeProductCardLayoutForSite(cardLayout));
}

/** Save v2 card design + dual-write legacy productCardLayout subset for compat. */
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
