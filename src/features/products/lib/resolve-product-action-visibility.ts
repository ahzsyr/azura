/**
 * Single source of truth for product action visibility diagnostics (admin, previews, tooling).
 * Pure business logic — no React or admin imports.
 */
import type { ResolvedProductCardDesign } from "@/features/products/card-design/product-card-design.types";
import { buildBuyNowHref, type ResolvedProductBuyNow } from "./product-buy-now";
import { buildProductCtaHref, type ResolvedProductCtaConfig } from "./product-cta";
import type { LocaleConfig } from "./i18n/types";
import {
  PRODUCT_PAGE_SIDE_ORDER_KEYS,
  type ProductPageSideOrderKey,
  type ResolvedProductPageDisplay,
  type ResolvedProductPageElementOrder,
} from "./product-page-display";

export type ProductActionId = "buyNow" | "cta" | "quickView" | "wishlist" | "compare";

export type ProductActionSurfaceId =
  | "pdpBuyBox"
  | "pdpInlineCta"
  | "pdpFloatingCta"
  | "card"
  | "table"
  | "quickView";

export type ProductActionVisibilityGate = {
  id: string;
  label: string;
  pass: boolean;
  detail?: string;
  fixHref?: string;
};

export type ProductActionVisibilityDiagnostic = {
  action: ProductActionId;
  surface: ProductActionSurfaceId;
  visible: boolean;
  gates: ProductActionVisibilityGate[];
};

export type ResolveProductActionVisibilityInput = {
  buyNow: ResolvedProductBuyNow;
  productCta: ResolvedProductCtaConfig;
  pageDisplay: ResolvedProductPageDisplay;
  cardDesign: ResolvedProductCardDesign;
  elementOrder?: ResolvedProductPageElementOrder;
  sampleSlug?: string;
  locale?: LocaleConfig;
};

const DEFAULT_SAMPLE_SLUG = "sample-product";
const DEFAULT_LOCALE: LocaleConfig = { code: "en", urlPrefix: "en", label: "English" };

const FIX = {
  buyNow: "#buy-now",
  cta: "#cta",
  productPage: "#product-page",
  productCards: "#product-cards",
} as const;

function gate(
  id: string,
  label: string,
  pass: boolean,
  opts?: { detail?: string; fixHref?: string },
): ProductActionVisibilityGate {
  return { id, label, pass, ...opts };
}

function finishDiagnostic(
  action: ProductActionId,
  surface: ProductActionSurfaceId,
  gates: ProductActionVisibilityGate[],
): ProductActionVisibilityDiagnostic {
  return {
    action,
    surface,
    visible: gates.every((g) => g.pass),
    gates,
  };
}

function finishBuyNowDiagnostic(
  surface: ProductActionSurfaceId,
  gates: ProductActionVisibilityGate[],
): ProductActionVisibilityDiagnostic {
  const diag = finishDiagnostic("buyNow", surface, gates);
  const blocking = diag.gates.filter((g) => g.id !== "shopUrl" && g.id !== "whatsappPhone");
  return { ...diag, visible: blocking.every((g) => g.pass) };
}

function sideOrderIncludes(
  order: ResolvedProductPageElementOrder | undefined,
  key: ProductPageSideOrderKey,
): boolean {
  const side = order?.side ?? [...PRODUCT_PAGE_SIDE_ORDER_KEYS];
  return side.includes(key);
}

function actionTypeEnabled(design: ResolvedProductCardDesign, type: string): boolean {
  return design.actions.enabledTypes.includes(
    type as (typeof design.actions.enabledTypes)[number],
  );
}

function resolveBuyNowPdpBuyBox(input: ResolveProductActionVisibilityInput): ProductActionVisibilityDiagnostic {
  const { buyNow, pageDisplay, elementOrder, sampleSlug } = input;
  const slug = sampleSlug ?? DEFAULT_SAMPLE_SLUG;
  const href = buildBuyNowHref(buyNow, slug, null, {
    productTitle: "Sample Product",
    productSlug: slug,
  });

  const destinationGate =
    buyNow.destinationType === "whatsapp"
      ? gate("whatsappPhone", "WhatsApp phone configured", Boolean(buyNow.whatsappPhone.replace(/\D/g, "")), {
          detail: "Set WhatsApp phone number on the Buy Now tab",
          fixHref: FIX.buyNow,
        })
      : gate("shopUrl", "Valid shop URL configured", Boolean(href), {
          detail: buyNow.shopBaseUrl.trim()
            ? "Check slug path prefix and product slug"
            : "Set shop domain on the Buy Now tab",
          fixHref: FIX.buyNow,
        });

  const gates = [
    gate("sideBuyBox", "Buy box column visible", pageDisplay.sideBuyBox.enabled, {
      detail: "Enable the buy box column on the product page",
      fixHref: FIX.productPage,
    }),
    gate("sideOrderBuyNow", "Buy Now in buy box order", sideOrderIncludes(elementOrder, "buyNow"), {
      detail: "Include Buy Now in the buy box block order",
      fixHref: FIX.productPage,
    }),
    gate("pageElementBuyNow", "Buy Now page element enabled", pageDisplay.buyNow.enabled, {
      detail: "Turn on the Buy Now page element",
      fixHref: FIX.productPage,
    }),
    gate("buyNowEnabled", "Buy Now enabled", buyNow.enabled, { fixHref: FIX.buyNow }),
    gate("pagePlacement", "Product page placement enabled", buyNow.placements.page, {
      detail: "Enable the product page placement on the Buy Now tab",
      fixHref: FIX.buyNow,
    }),
    destinationGate,
  ];

  return finishBuyNowDiagnostic("pdpBuyBox", gates);
}

function resolveBuyNowCardSurfaces(
  input: ResolveProductActionVisibilityInput,
  surface: "card" | "table" | "quickView",
): ProductActionVisibilityDiagnostic {
  const { buyNow, pageDisplay, cardDesign, sampleSlug } = input;
  const slug = sampleSlug ?? DEFAULT_SAMPLE_SLUG;
  const href = buildBuyNowHref(buyNow, slug, null, {
    productTitle: "Sample Product",
    productSlug: slug,
  });

  const destinationGate =
    buyNow.destinationType === "whatsapp"
      ? gate("whatsappPhone", "WhatsApp phone configured", Boolean(buyNow.whatsappPhone.replace(/\D/g, "")), {
          detail: "Set WhatsApp phone number on the Buy Now tab",
          fixHref: FIX.buyNow,
        })
      : gate("shopUrl", "Valid shop URL configured", Boolean(href), {
          detail: buyNow.shopBaseUrl.trim()
            ? "Check slug path prefix and product slug"
            : "Set shop domain on the Buy Now tab",
          fixHref: FIX.buyNow,
        });

  const gates = [
    gate("pageElementBuyNow", "Buy Now page element enabled", pageDisplay.buyNow.enabled, {
      detail: "Controls Buy Now on cards and Quick View visibility",
      fixHref: FIX.productPage,
    }),
    gate("buyNowEnabled", "Buy Now enabled", buyNow.enabled, { fixHref: FIX.buyNow }),
    gate("cardPlacement", "Card placement enabled", buyNow.placements.card, {
      detail: "Enable product cards placement on the Buy Now tab",
      fixHref: FIX.buyNow,
    }),
    gate("cardActionType", "Card action type enabled", actionTypeEnabled(cardDesign, "buy_now"), {
      detail: "Allow Buy Now in Product Cards → Actions",
      fixHref: FIX.productCards,
    }),
    destinationGate,
  ];

  return finishBuyNowDiagnostic(surface, gates);
}

function cardLayoutShowsCta(cardLayout: ResolvedProductCtaConfig["cardLayout"]): boolean {
  return cardLayout !== "quick_action";
}

function resolveCtaPdpInline(input: ResolveProductActionVisibilityInput): ProductActionVisibilityDiagnostic {
  const { productCta, pageDisplay, elementOrder, locale } = input;
  const loc = locale ?? DEFAULT_LOCALE;
  const href = productCta.enabled
    ? buildProductCtaHref(productCta, loc, { productTitle: "Sample Product", productSlug: DEFAULT_SAMPLE_SLUG })
    : null;

  const gates = [
    gate("sideOrderInlineCta", "Inline CTA in buy box order", sideOrderIncludes(elementOrder, "inlineCta"), {
      detail: "Include Inline CTA in the buy box block order",
      fixHref: FIX.productPage,
    }),
    gate("pageElementInlineCta", "Inline CTA page element enabled", pageDisplay.inlineCta.enabled, {
      detail: "Turn on the Inline CTA page element",
      fixHref: FIX.productPage,
    }),
    gate("ctaEnabled", "CTA Button enabled", productCta.enabled, { fixHref: FIX.cta }),
    gate("inlinePlacement", "Inline placement enabled", productCta.placements.inline, {
      detail: "Enable inline placement on the CTA Button tab",
      fixHref: FIX.cta,
    }),
    gate("ctaLabel", "Button label set", Boolean(productCta.label?.trim()), {
      detail: "Enter button text on the CTA Button tab",
      fixHref: FIX.cta,
    }),
    gate("ctaHref", "Valid destination URL", Boolean(href), {
      detail:
        productCta.linkType === "whatsapp"
          ? "Set WhatsApp phone and message template on the CTA Button tab"
          : productCta.linkType === "external"
            ? "Set a valid external URL (https, mailto, tel, or wa.me)"
            : "Pick an internal page or path",
      fixHref: FIX.cta,
    }),
  ];

  return finishDiagnostic("cta", "pdpInlineCta", gates);
}

function resolveCtaPdpFloating(input: ResolveProductActionVisibilityInput): ProductActionVisibilityDiagnostic {
  const { productCta, pageDisplay, locale } = input;
  const loc = locale ?? DEFAULT_LOCALE;
  const href = productCta.enabled
    ? buildProductCtaHref(productCta, loc, { productTitle: "Sample Product", productSlug: DEFAULT_SAMPLE_SLUG })
    : null;

  const gates = [
    gate("pageElementFloatingCta", "Floating CTA page element enabled", pageDisplay.floatingCta.enabled, {
      detail: "Turn on the Floating CTA page element (Product Page or per-product Page Display)",
      fixHref: FIX.productPage,
    }),
    gate("ctaEnabled", "CTA Button enabled", productCta.enabled, { fixHref: FIX.cta }),
    gate("floatingPlacement", "Floating placement enabled", productCta.placements.floating, {
      detail: "Enable floating placement on the CTA Button tab",
      fixHref: FIX.cta,
    }),
    gate("ctaLabel", "Button label set", Boolean(productCta.label?.trim()), {
      fixHref: FIX.cta,
    }),
    gate("ctaHref", "Valid destination URL", Boolean(href), {
      fixHref: FIX.cta,
    }),
  ];

  return finishDiagnostic("cta", "pdpFloatingCta", gates);
}

function resolveCtaCardSurfaces(
  input: ResolveProductActionVisibilityInput,
  surface: "card" | "table" | "quickView",
): ProductActionVisibilityDiagnostic {
  const { productCta, cardDesign, locale } = input;
  const loc = locale ?? DEFAULT_LOCALE;
  const href = productCta.enabled
    ? buildProductCtaHref(productCta, loc, { productTitle: "Sample Product", productSlug: DEFAULT_SAMPLE_SLUG })
    : null;

  const gates = [
    gate("ctaEnabled", "CTA Button enabled", productCta.enabled, { fixHref: FIX.cta }),
    gate("cardPlacement", "Card placement enabled", productCta.placements.card, {
      detail: "Enable product cards placement on the CTA Button tab",
      fixHref: FIX.cta,
    }),
    gate("ctaLabel", "Button label set", Boolean(productCta.label?.trim()), {
      fixHref: FIX.cta,
    }),
    gate("cardActionType", "Card action type enabled", actionTypeEnabled(cardDesign, "cta"), {
      detail: "Allow CTA in Product Cards → Actions",
      fixHref: FIX.productCards,
    }),
    gate("ctaHref", "Valid destination URL", Boolean(href), {
      fixHref: FIX.cta,
    }),
  ];

  if (surface === "card") {
    gates.push(
      gate("cardLayoutSlot", "Card layout shows CTA", cardLayoutShowsCta(productCta.cardLayout), {
        detail:
          cardLayoutShowsCta(productCta.cardLayout)
            ? `Card layout "${productCta.cardLayout}" supports CTA`
            : 'CTA is hidden when card layout is "quick action" (that slot is Buy Now only)',
        fixHref: FIX.cta,
      }),
    );
  }

  return finishDiagnostic("cta", surface, gates);
}

function resolveQuickView(input: ResolveProductActionVisibilityInput): ProductActionVisibilityDiagnostic {
  const { pageDisplay, cardDesign } = input;

  const gates = [
    gate("pageElementQuickView", "Quick View page element enabled", pageDisplay.quickView.enabled, {
      detail: "Enable Quick View under Product Page → Page visibility",
      fixHref: FIX.productPage,
    }),
    gate("cardActionType", "Quick View action type enabled", actionTypeEnabled(cardDesign, "quick_view"), {
      detail: "Allow Quick View in Product Cards → Actions",
      fixHref: FIX.productCards,
    }),
  ];

  return finishDiagnostic("quickView", "card", gates);
}

function resolveWishlist(input: ResolveProductActionVisibilityInput): ProductActionVisibilityDiagnostic {
  const { pageDisplay, cardDesign } = input;

  const gates = [
    gate("pageElementSaveToList", "Wishlist page element enabled", pageDisplay.saveToList.enabled, {
      detail: "Enable Save to list / Wishlist on the Product Page tab",
      fixHref: FIX.productPage,
    }),
    gate("cardActionType", "Wishlist action type enabled", actionTypeEnabled(cardDesign, "wishlist"), {
      fixHref: FIX.productCards,
    }),
  ];

  return finishDiagnostic("wishlist", "card", gates);
}

function resolveCompare(input: ResolveProductActionVisibilityInput): ProductActionVisibilityDiagnostic {
  const { pageDisplay, cardDesign } = input;

  const gates = [
    gate("pageElementCompare", "Compare page element enabled", pageDisplay.compare.enabled, {
      detail: "Enable Compare on cards in Product Page → Product cards visibility",
      fixHref: FIX.productPage,
    }),
    gate("cardActionType", "Compare action type enabled", actionTypeEnabled(cardDesign, "compare"), {
      fixHref: FIX.productCards,
    }),
  ];

  return finishDiagnostic("compare", "card", gates);
}

/** Full diagnostic tree for all actions and surfaces. */
export function resolveProductActionVisibility(
  input: ResolveProductActionVisibilityInput,
): ProductActionVisibilityDiagnostic[] {
  return [
    resolveBuyNowPdpBuyBox(input),
    resolveBuyNowCardSurfaces(input, "card"),
    resolveBuyNowCardSurfaces(input, "table"),
    resolveBuyNowCardSurfaces(input, "quickView"),
    resolveCtaPdpInline(input),
    resolveCtaPdpFloating(input),
    resolveCtaCardSurfaces(input, "card"),
    resolveCtaCardSurfaces(input, "table"),
    resolveCtaCardSurfaces(input, "quickView"),
    resolveQuickView(input),
    resolveWishlist(input),
    resolveCompare(input),
  ];
}

export function diagnosticsForAction(
  diagnostics: ProductActionVisibilityDiagnostic[],
  action: ProductActionId,
): ProductActionVisibilityDiagnostic[] {
  return diagnostics.filter((d) => d.action === action);
}

export function diagnosticsForSurface(
  diagnostics: ProductActionVisibilityDiagnostic[],
  action: ProductActionId,
  surface: ProductActionSurfaceId,
): ProductActionVisibilityDiagnostic | undefined {
  return diagnostics.find((d) => d.action === action && d.surface === surface);
}

export const PRODUCT_ACTION_SURFACE_LABELS: Record<ProductActionSurfaceId, string> = {
  pdpBuyBox: "Product page — buy box",
  pdpInlineCta: "Product page — inline CTA",
  pdpFloatingCta: "Product page — floating CTA",
  card: "Product cards",
  table: "Table view",
  quickView: "Quick View",
};
