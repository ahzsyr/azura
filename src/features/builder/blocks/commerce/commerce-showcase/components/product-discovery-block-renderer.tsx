import type { Locale } from "@/i18n/routing";
import { buildProductListingCatalog } from "@/features/products/listing/catalog";
import { coerceListingPerPage } from "@/features/builder/blocks/commerce/commerce-showcase/lib/coerce-listing-per-page";
import { parseProductDiscoveryProps } from "@/features/builder/blocks/commerce/commerce-showcase/lib/parse-block-props";
import { ProductDiscoveryIsland } from "@/features/builder/blocks/commerce/commerce-showcase/components/product-discovery-island";

type Props = {
  locale: Locale;
  props: Record<string, unknown>;
  previewMode?: boolean;
};

export async function ProductDiscoveryBlockRenderer({ locale, props: raw, previewMode }: Props) {
  const p = parseProductDiscoveryProps(raw);

  const per = coerceListingPerPage(p.pageSize);
  const filterState = {
    q: "",
    categories: [],
    brands: [],
    collections: p.collectionSlug.trim() ? [p.collectionSlug.trim()] : [],
    collectionScope: p.collectionSlug.trim(),
    tags: [],
    conditions: [],
    variations: {},
    priceMin: null,
    priceMax: null,
    stockOnly: false,
    page: 1,
    per,
  };

  const catalog = await buildProductListingCatalog(locale, filterState);
  const total = catalog.total ?? catalog.records.length;
  const totalPages = catalog.totalPages ?? Math.max(1, Math.ceil(total / per));

  if (catalog.records.length === 0 && !previewMode) {
    return null;
  }

  return (
    <ProductDiscoveryIsland
      locale={locale}
      blockProps={raw}
      initialRecords={catalog.records}
      initialFacets={catalog.facets}
      initialTotal={total}
      initialTotalPages={totalPages}
      collectionSlug={p.collectionSlug.trim() || undefined}
    />
  );
}
