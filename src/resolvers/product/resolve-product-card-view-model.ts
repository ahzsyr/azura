import "server-only";

import { entityService } from "@/features/entities/entity.service";
import { queryListingRecordsBySlugs } from "@/features/products/listing/query-listing";
import {
  mergeProductCardDisplayOverrides,
  type ProductCardDisplayOverrides,
} from "@/features/products/lib/product-card-display";
import {
  mergeDesignTokens,
  productCardDesignDataAttrs,
} from "@/features/products/card-design";
import { productCardLayoutCssVars } from "@/features/products/lib/product-storefront-layout";
import { EntityNotFoundError } from "@/resolvers/errors";
import { mergeListingRecord } from "@/resolvers/product/map-entity-to-listing";
import { resolveProductCardFields } from "@/resolvers/product/product-card-fields";
import type { ProductCardViewModel } from "@/view-models/product-card";
import type { ResolverContext } from "@/view-models/types";
import type { ProductListingRecord } from "@/features/products/listing/types";

export type ResolveProductCardOptions = {
  href?: string;
  displayOverrides?: ProductCardDisplayOverrides;
};

function resolveCardTheme(ctx: ResolverContext) {
  const theme = ctx.cardTheme;
  if (!theme) {
    throw new Error("resolveProductCardViewModel requires cardTheme in ResolverContext");
  }
  return theme;
}

export function resolveProductCardViewModelFromListing(
  entityId: string,
  product: ProductListingRecord,
  ctx: ResolverContext,
  options?: ResolveProductCardOptions,
): ProductCardViewModel {
  const theme = resolveCardTheme(ctx);
  const localePrefix = ctx.localePrefix;
  const href =
    options?.href?.trim() ||
    product.slug
      ? `/${localePrefix}/products/${product.slug}`
      : `/${localePrefix}/products/${entityId}`;

  const cardDisplay = mergeProductCardDisplayOverrides(
    theme.cardDisplay,
    options?.displayOverrides,
  );

  const design = theme.responsive.desktop;

  return resolveProductCardFields({
    entityId,
    product,
    href,
    numberLocale: ctx.numberLocale ?? "en-US",
    localePrefix,
    priority: ctx.priority ?? false,
    cardLayout: theme.cardLayout,
    cardDisplay,
    design,
    buyNow: theme.buyNow,
    productCta: theme.productCta,
    cardVariant: "default",
    layoutTokens: mergeDesignTokens(
      productCardLayoutCssVars(theme.cardLayout),
      design,
      theme.cardLayout,
    ),
    designDataAttrs: productCardDesignDataAttrs(design),
    personalizationFlags: ctx.personalizationFlags,
    linkPrefetch: ctx.linkPrefetch,
  });
}

export async function resolveProductCardViewModel(
  entityId: string,
  ctx: ResolverContext,
  options?: ResolveProductCardOptions,
): Promise<ProductCardViewModel> {
  const key = entityId.trim();
  const entity = await entityService.getEntity("product", key, { locale: ctx.localePrefix });
  if (!entity) {
    throw new EntityNotFoundError("product", key);
  }

  const slug = entity.ref.slug;
  const [listing] = slug
    ? await queryListingRecordsBySlugs(ctx.localePrefix, [slug])
    : [];
  const product = mergeListingRecord(entity, listing);

  return resolveProductCardViewModelFromListing(entity.ref.id, product, ctx, {
    ...options,
    href: options?.href ?? entity.href,
  });
}
