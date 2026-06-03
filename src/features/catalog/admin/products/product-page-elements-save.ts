import type {
  ResolvedProductAddToCart,
  ResolvedProductPageDisplay,
  ResolvedProductPageElementOrder,
  ResolvedProductPromo,
  ResolvedProductTrust,
} from "@/features/products/lib/product-page-display";
import { serializeProductPageDisplayForSite } from "@/features/products/lib/product-page-display";
import {
  serializeProductPageCompactDisplayForSite,
  type ResolvedProductPageCompactDisplay,
} from "@/features/products/lib/product-page-compact-display";

const API = { headers: { "Content-Type": "application/json" } };

export async function saveProductPageElementsSettings(
  locale: string,
  data: {
    pageDisplay: ResolvedProductPageDisplay;
    elementOrder: ResolvedProductPageElementOrder;
    addToCart: ResolvedProductAddToCart;
    promo: ResolvedProductPromo;
    trust: ResolvedProductTrust;
    compactDisplay: ResolvedProductPageCompactDisplay;
  },
): Promise<void> {
  const partial = serializeProductPageDisplayForSite(data.pageDisplay);
  const payloads = [
    { key: "productPageDisplay", value: partial },
    { key: "productPageElementOrder", value: data.elementOrder },
    {
      key: "productPageCompactDisplay",
      value: serializeProductPageCompactDisplayForSite(data.compactDisplay),
    },
    {
      key: "productPageAddToCart",
      value: {
        label: data.addToCart.label,
        href: data.addToCart.href,
        openInNewTab: data.addToCart.openInNewTab,
        behavior: data.addToCart.behavior,
        enabled: data.addToCart.enabled,
        variant: data.addToCart.variant,
        size: data.addToCart.size,
        fullWidth: data.addToCart.fullWidth,
      },
    },
    {
      key: "productPagePromo",
      value: {
        enabled: data.promo.enabled,
        eyebrow: data.promo.eyebrow,
        title: data.promo.title,
        subtitle: data.promo.subtitle,
        ctaLabel: data.promo.ctaLabel,
        ctaHref: data.promo.ctaHref,
        openInNewTab: data.promo.openInNewTab,
      },
    },
    {
      key: "productPageTrust",
      value: {
        enabled: data.trust.enabled,
        provider: data.trust.provider,
        label: data.trust.label,
        rating: data.trust.rating,
        reviewCount: data.trust.reviewCount,
        href: data.trust.href,
      },
    },
  ];

  for (const body of payloads) {
    const res = await fetch("/api/save-settings", {
      ...API,
      method: "POST",
      body: JSON.stringify({ ...body, locale }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(json.error || `Save ${body.key} failed`);
  }
}
