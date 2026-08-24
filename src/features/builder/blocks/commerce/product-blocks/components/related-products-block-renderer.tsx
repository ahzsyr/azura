import type { Locale } from "@/i18n/routing";
import { SectionHeader } from "@/components/marketing/section";
import { getLocalizedField } from "@/lib/utils";
import { ProductListingGrid } from "@/features/products/components/listing/product-listing-grid";
import { resolveRelatedForBlock } from "@/features/builder/blocks/commerce/product-blocks/lib/resolve-related-for-block";
import { parseRelatedProductsProps } from "@/features/builder/blocks/commerce/product-blocks/lib/parse-block-props";
import { ProductRecordsOverflowLayout } from "@/features/builder/blocks/commerce/product-blocks/components/product-records-overflow-layout";
import { ProductBlockCardShell } from "@/features/builder/blocks/commerce/product-blocks/components/product-block-card-shell";
import { getNumberLocale } from "@/shared/layout/direction/direction-utils";
import type { BlockNode } from "@/types/builder";
import type { DeviceBreakpoint } from "@/types/block-system";
import { resolveContentOverflowCssFlags } from "@/features/builder/styles/content-overflow-resolver";

type Props = {
  locale: Locale;
  props: Record<string, unknown>;
  previewMode?: boolean;
  block?: BlockNode;
  previewDevice?: DeviceBreakpoint;
};

export async function RelatedProductsBlockRenderer({
  locale,
  props: raw,
  previewMode,
  block,
  previewDevice,
}: Props) {
  const p = parseRelatedProductsProps(raw);
  const records = await resolveRelatedForBlock(locale, {
    rule: p.rule,
    anchorSlug: p.anchorSlug,
    collectionSlug: p.collectionSlug,
    brand: p.brand,
    tags: p.tags,
    productSlugs: p.productSlugs,
    limit: p.limit,
  });

  if (records.length === 0) {
    if (previewMode) {
      return (
        <p className="text-center text-sm text-muted-foreground py-8">
          No related products found for the current rules.
        </p>
      );
    }
    return null;
  }

  const title = getLocalizedField(p, "title", locale);

  return (
    <ProductBlockCardShell locale={locale}>
      <div>
        {title ? <SectionHeader title={title} /> : null}
        <div className={title ? "mt-8" : undefined}>
          {block ? (
            <ProductRecordsOverflowLayout
              products={records}
              localePrefix={locale}
              flags={resolveContentOverflowCssFlags(block)}
              previewDevice={previewDevice}
              columns={p.slidesPerView as 2 | 3 | 4}
              autoplay={p.autoplay}
              autoplayIntervalMs={p.autoplayIntervalMs}
            />
          ) : p.layout === "carousel" ? (
            <ProductRecordsOverflowLayout
              products={records}
              localePrefix={locale}
              flags={resolveContentOverflowCssFlags({
                id: "related-fallback",
                type: "relatedProducts",
                props: raw,
              })}
              columns={p.slidesPerView as 2 | 3 | 4}
              autoplay={p.autoplay}
              autoplayIntervalMs={p.autoplayIntervalMs}
            />
          ) : (
            <ProductListingGrid
              products={records}
              localePrefix={locale}
              viewMode="grid"
              numberLocale={getNumberLocale(locale)}
              emptyMessage=""
            />
          )}
        </div>
      </div>
    </ProductBlockCardShell>
  );
}
