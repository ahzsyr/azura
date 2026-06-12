import { serializeProductCtaForSite } from "@/features/products/lib/product-cta";
import { serializeProductBuyNowForSite } from "@/features/products/lib/product-buy-now";
import type { ResolvedProductBuyNow } from "@/features/products/lib/product-buy-now";
import type { ResolvedProductCtaConfig } from "@/features/products/lib/product-cta";
import {
  serializeProductPageDisplayForSite,
  type ResolvedProductPageDisplay,
  type ResolvedProductPageElementOrder,
  type ResolvedProductPromo,
  type ResolvedProductTrust,
} from "@/features/products/lib/product-page-display";
import {
  serializeProductPageCompactDisplayForSite,
  type ResolvedProductPageCompactDisplay,
} from "@/features/products/lib/product-page-compact-display";
import {
  serializeProductPageLayoutForSite,
  type ResolvedProductPageLayout,
} from "@/features/products/lib/product-storefront-layout";
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

async function postSettings(locale: string, key: string, value: unknown): Promise<void> {
  const res = await fetch("/api/save-settings", {
    ...API,
    method: "POST",
    body: JSON.stringify({ locale, key, value }),
  });
  const json = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(json.error || `Save ${key} failed`);
}

async function postSettingsBatch(
  locale: string,
  patches: Array<{ key: string; value: unknown }>,
): Promise<void> {
  const res = await fetch("/api/save-settings", {
    ...API,
    method: "POST",
    body: JSON.stringify({ locale, patches }),
  });
  const json = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(json.error || "Batch save failed");
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
  data: {
    pageDisplay: ResolvedProductPageDisplay;
    elementOrder: ResolvedProductPageElementOrder;
    compactDisplay: ResolvedProductPageCompactDisplay;
  },
): Promise<void> {
  await postSettingsBatch(locale, [
    { key: "productPageDisplay", value: serializeProductPageDisplayForSite(data.pageDisplay) },
    { key: "productPageElementOrder", value: data.elementOrder },
    {
      key: "productPageCompactDisplay",
      value: serializeProductPageCompactDisplayForSite(data.compactDisplay),
    },
  ]);
}

export async function saveProductPageLayoutOnlySettings(
  locale: string,
  pageLayout: ResolvedProductPageLayout,
): Promise<void> {
  await postSettings(locale, "productPageLayout", serializeProductPageLayoutForSite(pageLayout));
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
