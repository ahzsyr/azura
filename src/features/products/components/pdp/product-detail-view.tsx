import { stripAnyLocalePrefix } from "@/i18n/url-helpers";
import { catalogProductToCollectionProduct } from "@/features/collections/engine";
import { buildCollectionTrail, collectionMapFromList } from "@/features/collections/collection-navigation";
import type { Collection } from "@/features/collections/types";
import {
  buildProductTagLinks,
  getDeepestMatchingCollectionSlug,
} from "@/features/products/product-collections";
import type { Product } from "../../types";
import type { ProductCardTheme } from "@/features/products/lib/product-card-theme";
import type { ResolvedProductCtaConfig } from "@/features/products/lib/product-cta";
import { resolveProductPageContext } from "@/features/products/lib/product-page-display";
import { buildDisplayPrices, resolveShopperCurrencyContext } from "@/features/products/lib/currency";
import {
  buildProductPriceMatrix,
  buildVariationDimensions,
} from "@/features/products/lib/product-variation-pricing";
import { normalizeProductDeliveryOptions } from "@/features/products/lib/product-delivery";
import { normalizeProductCtaGlobal, resolveProductCta } from "@/features/products/lib/product-cta";
import { resolveProductPromo, resolveProductTrust } from "@/features/products/lib/product-page-display";
import { buildBuyNowHref } from "@/features/products/lib/product-buy-now";
import { loadPdpLabels } from "../../pdp/load-pdp-labels";
import { resolveActiveLocale } from "@/i18n/resolve-active-locale";
import type {
  ProductPageElementsRules,
  ProductPageLayoutRules,
} from "@/features/products/lib/product-page-responsive";
import type { ResolvedProductPageOverflow } from "@/features/products/lib/product-page-overflow";
import { ProductDetailViewBody } from "./product-detail-view-body";
import { buildDeferredSectionBlocks } from "./product-deferred-sections";
import { agentLog, agentLogError } from "@/lib/debug/agent-log";
import { brandHref } from "@/features/catalog/brand-tag-pages.service";

type Props = {
  locale: string;
  slug: string;
  product: Product;
  layoutRules: ProductPageLayoutRules;
  elementsRules: ProductPageElementsRules;
  overflow: ResolvedProductPageOverflow;
  siteProductCta?: unknown;
  allCollections: Collection[];
  cardTheme?: ProductCardTheme;
  quoteCta?: ResolvedProductCtaConfig;
  site: Record<string, unknown>;
};

function resolveLocalizedHref(href: string, localePrefix: string): string {
  const h = href.trim();
  if (!h || /^https?:\/\//i.test(h)) return h;
  const path = h.startsWith("/") ? h : `/${h}`;
  const prefix = `/${localePrefix}`;
  if (path.startsWith(prefix)) return stripAnyLocalePrefix(path);
  return path;
}

export async function ProductDetailView({
  locale,
  slug,
  product,
  layoutRules,
  elementsRules,
  overflow,
  siteProductCta,
  allCollections,
  cardTheme,
  quoteCta,
  site,
}: Props) {
  agentLog({
    location: "product-detail-view.tsx:ProductDetailView",
    message: "start",
    hypothesisId: "H3",
    data: { locale, slug },
  });
  try {
    const labels = await loadPdpLabels(locale);
    const localeCtx = await resolveActiveLocale(locale);
    const activeLocaleConfig =
      localeCtx.enabledLocales.find((entry) => entry.urlPrefix === locale) ??
      localeCtx.enabledLocales.find((entry) => entry.code === localeCtx.languageCode);
    const localeConfig = {
      code: activeLocaleConfig?.code ?? localeCtx.languageCode,
      urlPrefix: activeLocaleConfig?.urlPrefix ?? localeCtx.urlPrefix,
      label: activeLocaleConfig?.label ?? localeCtx.languageCode,
    };

    const currencyCtx = resolveShopperCurrencyContext(
      new Request("http://localhost"),
      null,
      localeConfig,
    );
    const displayPrices = buildDisplayPrices(currencyCtx, product.price, product.old_price);
    const priceMatrix = buildProductPriceMatrix(
      currencyCtx,
      product as Parameters<typeof buildProductPriceMatrix>[1],
    );
    const variationDims = buildVariationDimensions(product);
    const conditionInVariations = variationDims.some((d) => d.type.toLowerCase() === "condition");
    const deliveryOptions = normalizeProductDeliveryOptions(product);

    const pageCtxDesktop = resolveProductPageContext(
      {
        ...site,
        productPageDisplay: elementsRules.desktop.display,
        productPageElementOrder: elementsRules.desktop.elementOrder,
      },
      product as Parameters<typeof resolveProductPageContext>[1],
    );

    const globalCta = normalizeProductCtaGlobal(siteProductCta);
    const productCtaEffective = resolveProductCta(globalCta, product.product_cta);
    const buyNowHref = buildBuyNowHref(
      pageCtxDesktop.buyNow,
      slug,
      pageCtxDesktop.buyNowSlugOverride,
    );

    const promoResolvedRaw = resolveProductPromo(
      site.productPagePromo as Parameters<typeof resolveProductPromo>[0],
      product.promo as Parameters<typeof resolveProductPromo>[1],
    );
    const promoResolved = {
      ...promoResolvedRaw,
      ctaHref: promoResolvedRaw.ctaHref
        ? resolveLocalizedHref(promoResolvedRaw.ctaHref, locale)
        : "/about",
    };

    const trustResolvedRaw = resolveProductTrust(
      site.productPageTrust as Parameters<typeof resolveProductTrust>[0],
      product.trust as Parameters<typeof resolveProductTrust>[1],
      product.reviews,
    );
    const trustResolved = {
      ...trustResolvedRaw,
      href: trustResolvedRaw.href ? resolveLocalizedHref(trustResolvedRaw.href, locale) : "",
    };

    const bySlug = collectionMapFromList(allCollections);
    const engine = catalogProductToCollectionProduct(slug, product);
    const deepestColSlug = getDeepestMatchingCollectionSlug(engine, allCollections);
    const collectionTrail = deepestColSlug
      ? buildCollectionTrail(locale, deepestColSlug, bySlug)
      : [];

    const tagLinks = buildProductTagLinks({
      catalogProduct: product,
      productSlug: slug,
      localePrefix: locale,
      allCollections,
    });
    const productBrandHref = product.brand?.trim()
      ? brandHref(locale, product.brand.trim())
      : null;

    const title = product.productTitle || product.name || product.title || slug;
    const productId = product.id || product.mpn || product.productTitle || slug;

    const tagHalf = Math.ceil(tagLinks.length / 2);
    const crossLinkGroups = [
      {
        title: labels.crossMainCategories,
        links: [
          ...collectionTrail.map((item) => ({
            label: item.name,
            href: stripAnyLocalePrefix(item.href),
          })),
          ...(product.categories ?? []).map((cat) => {
            const match = tagLinks.find((tag) => tag.label === cat);
            return {
              label: cat,
              href: match?.href ? stripAnyLocalePrefix(match.href) : "/collections",
            };
          }),
        ].filter((link, idx, arr) => arr.findIndex((l) => l.label === link.label) === idx),
      },
      {
        title: labels.crossEquipment,
        links: tagLinks
          .slice(0, tagHalf)
          .filter((l): l is { label: string; href: string } => Boolean(l.href))
          .map((l) => ({ label: l.label, href: stripAnyLocalePrefix(l.href) })),
      },
      {
        title: labels.crossDevices,
        links: tagLinks
          .slice(tagHalf)
          .filter((l): l is { label: string; href: string } => Boolean(l.href))
          .map((l) => ({ label: l.label, href: stripAnyLocalePrefix(l.href) })),
      },
    ];

    const purchasePrices = {
      sale: displayPrices.sale,
      compare: displayPrices.compare,
      displayCode: displayPrices.displayCode,
      numberLocale: displayPrices.numberLocale,
    };

    const deferredSectionBlocks = buildDeferredSectionBlocks({
      locale,
      slug,
      product,
      crossLinkGroups,
      promoResolved,
      trustResolved,
      labels: {
        frequentlyBought: labels.frequentlyBought,
        servicesDelivery: labels.servicesDelivery,
        servicesDeliveryDesc: labels.servicesDeliveryDesc,
        servicesPayment: labels.servicesPayment,
        servicesPaymentDesc: labels.servicesPaymentDesc,
        servicesWarranty: labels.servicesWarranty,
        servicesWarrantyDesc: labels.servicesWarrantyDesc,
      },
      cardTheme,
    });

    agentLog({
      location: "product-detail-view.tsx:ProductDetailView",
      message: "render tree ready",
      hypothesisId: "H5",
      data: {
        slug,
        variationDims: variationDims.length,
        priceMatrixEntries: priceMatrix.entries.length,
      },
    });

    return (
      <ProductDetailViewBody
        locale={locale}
        slug={slug}
        product={product}
        layoutRules={layoutRules}
        elementsRules={elementsRules}
        pageCtx={pageCtxDesktop}
        labels={labels}
        productCtaEffective={productCtaEffective}
        buyNowHref={buyNowHref}
        promoResolved={promoResolved}
        trustResolved={trustResolved}
        collectionTrail={collectionTrail}
        tagLinks={tagLinks}
        brandHref={productBrandHref}
        title={title}
        productId={productId}
        crossLinkGroups={crossLinkGroups}
        purchasePrices={purchasePrices}
        priceMatrix={priceMatrix}
        deliveryOptions={deliveryOptions}
        conditionInVariations={conditionInVariations}
        currencyCtx={currencyCtx}
        allCollections={allCollections}
        cardTheme={cardTheme}
        quoteCta={quoteCta}
        deferredSectionBlocks={deferredSectionBlocks}
        overflow={overflow}
      />
    );
  } catch (error) {
    agentLogError("product-detail-view.tsx:ProductDetailView", error, "H3", { locale, slug });
    throw error;
  }
}
