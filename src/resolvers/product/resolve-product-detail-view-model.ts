import "server-only";

import { stripAnyLocalePrefix } from "@/i18n/url-helpers";
import { catalogProductToCollectionProduct } from "@/features/collections/engine";
import { buildCollectionTrail, collectionMapFromList } from "@/features/collections/collection-navigation";
import type { Collection } from "@/features/collections/types";
import { entityService } from "@/features/entities/entity.service";
import { brandHref } from "@/features/catalog/brand-tag-pages.service";
import {
  buildProductTagLinks,
  getDeepestMatchingCollectionSlug,
} from "@/features/products/product-collections";
import type { Product } from "@/features/products/types";
import { productsDataService } from "@/features/products/products-data.service";
import {
  resolveProductPageContext,
  resolveProductPromo,
  resolveProductTrust,
} from "@/features/products/lib/product-page-display";
import { buildDisplayPrices, resolveShopperCurrencyContext } from "@/features/products/lib/currency";
import {
  buildProductPriceMatrix,
  buildVariationDimensions,
} from "@/features/products/lib/product-variation-pricing";
import { normalizeProductDeliveryOptions } from "@/features/products/lib/product-delivery";
import { normalizeProductCtaGlobal, resolveProductCta } from "@/features/products/lib/product-cta";
import { buildBuyNowHref } from "@/features/products/lib/product-buy-now";
import { loadPdpLabels } from "@/features/products/pdp/load-pdp-labels";
import { resolveActiveLocale } from "@/i18n/resolve-active-locale";
import type {
  ProductPageElementsRules,
  ProductPageLayoutRules,
} from "@/features/products/lib/product-page-responsive";
import type { ResolvedProductPageOverflow } from "@/features/products/lib/product-page-overflow";
import type { ResolvedProductCtaConfig } from "@/features/products/lib/product-cta";
import type { ProductCardTheme } from "@/features/products/lib/product-card-theme";
import { EntityNotFoundError } from "@/resolvers/errors";
import type { ProductDetailViewModel } from "@/view-models/product-detail";
import type { ResolverContext } from "@/view-models/types";

export type ResolveProductDetailInput = {
  slug: string;
  product?: Product;
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

async function loadProductForDetail(
  slug: string,
  localePrefix: string,
  productOverride?: Product,
): Promise<{ product: Product; entityId: string }> {
  if (productOverride) {
    const entityId = String(productOverride.id).trim() || slug;
    return { product: productOverride, entityId };
  }

  const entity = await entityService.getEntity("product", slug, { locale: localePrefix });
  if (entity) {
    const result = await productsDataService.getProduct(localePrefix, entity.ref.slug);
    if (result?.product) {
      return { product: result.product, entityId: entity.ref.id };
    }
  }

  const result = await productsDataService.getProduct(localePrefix, slug);
  if (!result?.product) {
    throw new EntityNotFoundError("product", slug);
  }

  const entityId = String(result.product.id).trim() || slug;
  return { product: result.product, entityId };
}

export async function resolveProductDetailViewModel(
  entityIdOrSlug: string,
  ctx: ResolverContext,
  input: ResolveProductDetailInput,
): Promise<ProductDetailViewModel> {
  const locale = ctx.locale;
  const slug = input.slug.trim() || entityIdOrSlug.trim();
  const { product, entityId } = await loadProductForDetail(slug, ctx.localePrefix, input.product);

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
      ...input.site,
      productPageDisplay: input.elementsRules.desktop.display,
      productPageElementOrder: input.elementsRules.desktop.elementOrder,
    },
    product as Parameters<typeof resolveProductPageContext>[1],
  );

  const globalCta = normalizeProductCtaGlobal(input.siteProductCta);
  const productCtaEffective = resolveProductCta(globalCta, product.product_cta);
  const buyNowHref = buildBuyNowHref(
    pageCtxDesktop.buyNow,
    slug,
    pageCtxDesktop.buyNowSlugOverride,
  );

  const promoResolvedRaw = resolveProductPromo(
    input.site.productPagePromo as Parameters<typeof resolveProductPromo>[0],
    product.promo as Parameters<typeof resolveProductPromo>[1],
  );
  const promoResolved = {
    ...promoResolvedRaw,
    ctaHref: promoResolvedRaw.ctaHref
      ? resolveLocalizedHref(promoResolvedRaw.ctaHref, locale)
      : "/about",
  };

  const trustResolvedRaw = resolveProductTrust(
    input.site.productPageTrust as Parameters<typeof resolveProductTrust>[0],
    product.trust as Parameters<typeof resolveProductTrust>[1],
    product.reviews,
  );
  const trustResolved = {
    ...trustResolvedRaw,
    href: trustResolvedRaw.href ? resolveLocalizedHref(trustResolvedRaw.href, locale) : "",
  };

  const allCollections = input.allCollections;
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

  return {
    templateId: "product-detail",
    entityId,
    slug,
    locale,
    product,
    layoutRules: input.layoutRules,
    elementsRules: input.elementsRules,
    pageCtx: pageCtxDesktop,
    labels,
    productCtaEffective,
    buyNowHref,
    promoResolved,
    trustResolved,
    collectionTrail,
    tagLinks,
    brandHref: productBrandHref,
    title,
    productId,
    crossLinkGroups,
    purchasePrices,
    priceMatrix,
    deliveryOptions,
    conditionInVariations,
    currencyCtx,
    allCollections,
    cardTheme: input.cardTheme,
    quoteCta: input.quoteCta,
    overflow: input.overflow,
  };
}
