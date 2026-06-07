import type { Locale } from "@/i18n/routing";
import { SectionHeader } from "@/components/marketing/section";
import { getLocalizedField } from "@/lib/utils";
import { resolveProductsForBlock } from "@/features/product-blocks/lib/resolve-products-for-block";
import { parseProductCarouselProps } from "@/features/product-blocks/lib/parse-block-props";
import { ProductRecordsOverflowLayout } from "@/features/product-blocks/components/product-records-overflow-layout";
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

export async function ProductCarouselBlockRenderer({
  locale,
  props: raw,
  previewMode,
  block,
  previewDevice,
}: Props) {
  const p = parseProductCarouselProps(raw);
  const records = await resolveProductsForBlock(locale, {
    source: p.source,
    collectionSlug: p.collectionSlug,
    productSlugs: p.productSlugs,
    tags: p.tags,
    limit: p.limit,
    sortBy: p.sortBy,
  });

  const emptyMessage =
    getLocalizedField(p, "emptyMessage", locale) ||
    (previewMode ? "No products to display." : "");

  if (records.length === 0) {
    if (previewMode) {
      return (
        <p className="text-center text-sm text-muted-foreground py-8">{emptyMessage}</p>
      );
    }
    return null;
  }

  const title = getLocalizedField(p, "title", locale);
  const subtitle = getLocalizedField(p, "subtitle", locale);

  return (
    <div>
      {(title || subtitle) && (
        <SectionHeader title={title || ""} subtitle={subtitle} />
      )}
      <div className={title || subtitle ? "mt-8" : undefined}>
        <ProductRecordsOverflowLayout
          products={records}
          localePrefix={locale}
          flags={
            block
              ? resolveContentOverflowCssFlags(block)
              : resolveContentOverflowCssFlags({
                  id: "carousel-fallback",
                  type: "productCarousel",
                  props: raw,
                })
          }
          previewDevice={previewDevice}
          columns={p.slidesPerView as 2 | 3 | 4}
          autoplay={p.autoplay}
          autoplayIntervalMs={p.autoplayIntervalMs}
        />
      </div>
    </div>
  );
}
