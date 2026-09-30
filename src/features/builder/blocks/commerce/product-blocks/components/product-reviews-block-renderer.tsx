import type { Locale } from "@/i18n/routing";
import { SectionHeader } from "@/components/marketing/section";
import { getLocalizedField } from "@/lib/utils";
import { productsDataService } from "@/features/products/products-data.service";
import { ProductReviewsSection } from "@/features/products/components/pdp/product-reviews-section";
import { parseProductReviewsProps } from "@/features/builder/blocks/commerce/product-blocks/lib/parse-block-props";
import type { BlockNode } from "@/types/builder";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";
import { getShortLanguageLocale } from "@/shared/layout/direction/direction-utils";

type Props = {
  locale: Locale;
  props: Record<string, unknown>;
  previewMode?: boolean;
  block?: BlockNode;
  overflow?: BlockOverflowContext;
};

export async function ProductReviewsBlockRenderer({
  locale,
  props: raw,
  previewMode,
  block: _block,
  overflow: _overflow,
}: Props) {
  const p = parseProductReviewsProps(raw);
  const slug = p.productSlug.trim();

  if (!slug) {
    if (previewMode) {
      return (
        <p className="text-center text-sm text-muted-foreground py-8">
          Set a product slug to display reviews.
        </p>
      );
    }
    return null;
  }

  const loaded = await productsDataService.getProduct(locale, slug);
  if (!loaded?.product) {
    if (previewMode) {
      return (
        <p className="text-center text-sm text-muted-foreground py-8">Product not found.</p>
      );
    }
    return null;
  }

  const title = getLocalizedField(p, "title", locale);

  return (
    <div>
      {title ? <SectionHeader title={title} /> : null}
      <div className={title ? "mt-8" : undefined}>
        <ProductReviewsSection
          product={loaded.product}
          dateLocale={getShortLanguageLocale(locale)}
        />
      </div>
    </div>
  );
}
