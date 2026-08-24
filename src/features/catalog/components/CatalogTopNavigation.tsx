import { Suspense } from "react";
import { categoriesDataService } from "@/features/categories/categories-data.service";
import type {
  CatalogNavigationAppearance,
  CatalogNavigationLayout,
  CatalogNavigationResponsive,
  CatalogNavigationSurface,
} from "@/features/catalog/navigation/types";
import {
  isCatalogNavigationEnabledForSurface,
  resolveCatalogNavigationFull,
} from "@/features/catalog/navigation/resolve";
import { getCatalogNavigation } from "@/features/catalog/navigation/repository";
import {
  buildFallbackNavFromCategories,
  resolveNavItemIcon,
} from "@/features/catalog/navigation/fallback";
import { buildCatalogNavItemHref } from "@/features/catalog/navigation/item-href";
import {
  CatalogTopNavigationBar,
  type CatalogTopNavigationBarItem,
} from "@/features/catalog/components/catalog-top-navigation-bar";

function listingBasePathForSurface(
  locale: string,
  surface: CatalogNavigationSurface,
  categorySlug?: string | null,
  brandSlug?: string | null,
): string {
  switch (surface) {
    case "brandDetail":
      return brandSlug ? `/${locale}/brands/${brandSlug}` : `/${locale}/brands`;
    case "categoryDetail":
      return categorySlug ? `/${locale}/categories/${categorySlug}` : `/${locale}/categories`;
    case "brands":
      return `/${locale}/brands`;
    case "categories":
      return `/${locale}/categories`;
    case "productDetail":
    case "products":
    default:
      return `/${locale}/products`;
  }
}

export type ResolvedCatalogTopNavigation = {
  items: CatalogTopNavigationBarItem[];
  appearance?: CatalogNavigationAppearance;
  layout?: CatalogNavigationLayout;
  responsive?: CatalogNavigationResponsive;
};

export async function resolveCatalogTopNavigationItems(input: {
  locale: string;
  surface: CatalogNavigationSurface;
  categorySlug?: string | null;
  brandSlug?: string | null;
}): Promise<ResolvedCatalogTopNavigation | null> {
  const global = await getCatalogNavigation("GLOBAL", null);

  // GLOBAL JsonStore is the single source of truth for enable + surfaces.
  if (!isCatalogNavigationEnabledForSurface(global, input.surface)) {
    return null;
  }

  const [page, category, brand, collections] = await Promise.all([
    getCatalogNavigation("PAGE", input.surface),
    input.categorySlug
      ? getCatalogNavigation("CATEGORY", input.categorySlug)
      : Promise.resolve(null),
    input.brandSlug
      ? getCatalogNavigation("BRAND", input.brandSlug)
      : Promise.resolve(null),
    categoriesDataService.loadAllProduct({ localePrefix: input.locale }).catch(() => []),
  ]);

  // Skip empty INHERIT-only docs that would no-op (emptyCatalogNavigation defaults).
  const pageDoc = page.mode === "INHERIT" && page.items.length === 0 ? null : page;
  const categoryDoc =
    category && !(category.mode === "INHERIT" && category.items.length === 0) ? category : null;
  const brandDoc =
    brand && !(brand.mode === "INHERIT" && brand.items.length === 0) ? brand : null;

  const resolved = resolveCatalogNavigationFull({
    global,
    page: pageDoc ?? undefined,
    category: categoryDoc ?? undefined,
    brand: brandDoc ?? undefined,
  });

  let items = resolved.items;

  // Fallback only when resolved visible items are empty.
  if (items.length === 0) {
    items = buildFallbackNavFromCategories(collections);
  }

  const listingBasePath = listingBasePathForSurface(
    input.locale,
    input.surface,
    input.categorySlug,
    input.brandSlug,
  );

  return {
    items: items.map((item) => {
      const icon = resolveNavItemIcon(item);
      return {
        ...item,
        icon: icon.icon,
        iconType: icon.iconType,
        href: buildCatalogNavItemHref({
          locale: input.locale,
          item,
          listingBasePath,
        }),
      };
    }),
    appearance: resolved.appearance,
    layout: resolved.layout,
    responsive: resolved.responsive,
  };
}

/**
 * Catalog strip — typically placed in the catalog hero beside the page title.
 * Resolves GLOBAL + PAGE(surface) + entity with entity → PAGE → GLOBAL precedence.
 */
export async function CatalogTopNavigation({
  locale,
  surface,
  className,
  categorySlug,
  brandSlug,
  activeCategorySlug,
  activeBrandSlug,
  pathBrandName,
  pathCategoryName,
}: {
  locale: string;
  surface: CatalogNavigationSurface;
  className?: string;
  categorySlug?: string | null;
  brandSlug?: string | null;
  /** Pathname active overrides (e.g. product PDP category). */
  activeCategorySlug?: string | null;
  activeBrandSlug?: string | null;
  /** Display name for path-scoped brand pages (active filter matching). */
  pathBrandName?: string | null;
  pathCategoryName?: string | null;
}) {
  const resolved = await resolveCatalogTopNavigationItems({
    locale,
    surface,
    categorySlug,
    brandSlug,
  });
  if (!resolved || resolved.items.length === 0) return null;

  return (
    <Suspense fallback={null}>
      <CatalogTopNavigationBar
        items={resolved.items}
        className={className}
        appearance={resolved.appearance}
        layout={resolved.layout}
        responsive={resolved.responsive}
        activeCategorySlug={activeCategorySlug ?? categorySlug}
        activeBrandSlug={activeBrandSlug ?? brandSlug}
        pathBrandName={pathBrandName}
        pathCategoryName={pathCategoryName}
        pathCollectionScope={surface === "categoryDetail" ? categorySlug : null}
      />
    </Suspense>
  );
}
