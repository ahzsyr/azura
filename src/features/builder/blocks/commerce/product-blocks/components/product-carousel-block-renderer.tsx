import type { Locale } from "@/i18n/routing";
import { SectionHeader } from "@/components/marketing/section";
import { getLocalizedField } from "@/lib/utils";
import { resolveProductCardViewModelsForBlock } from "@/features/builder/blocks/commerce/product-blocks/lib/resolve-product-card-view-models-for-block";
import { parseProductCarouselProps } from "@/features/builder/blocks/commerce/product-blocks/lib/parse-block-props";
import { ProductRecordsOverflowLayout } from "@/features/builder/blocks/commerce/product-blocks/components/product-records-overflow-layout";
import { ProductBlockCardShell } from "@/features/builder/blocks/commerce/product-blocks/components/product-block-card-shell";
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
  const templateId = p.templateId ?? "product-card";
  const viewModels = await resolveProductCardViewModelsForBlock(
    locale,
    {
      source: p.source,
      collectionSlug: p.collectionSlug,
      productSlugs: p.productSlugs,
      tags: p.tags,
      limit: p.limit,
      sortBy: p.sortBy,
    },
    { templateId },
  );

  const emptyMessage =
    getLocalizedField(p, "emptyMessage", locale) ||
    (previewMode ? "No products to display." : "");

  if (viewModels.length === 0) {
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
    <ProductBlockCardShell locale={locale} cardVariant={p.cardVariant}>
      <div>
        {(title || subtitle) && (
          <SectionHeader title={title || ""} subtitle={subtitle} />
        )}
        <div className={title || subtitle ? "mt-8" : undefined}>
          <ProductRecordsOverflowLayout
            viewModels={viewModels}
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
    </ProductBlockCardShell>
  );
}
