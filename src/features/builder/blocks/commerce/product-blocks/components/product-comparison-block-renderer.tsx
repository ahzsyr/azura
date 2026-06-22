import type { Locale } from "@/i18n/routing";
import { SectionHeader } from "@/components/marketing/section";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getLocalizedField } from "@/lib/utils";
import { ComparisonTable } from "@/features/comparison/components/comparison-table";
import { compareSpecificationsLabel } from "@/features/comparison/lib/compare-locale";
import { PRODUCT_COMPARE_MAX, PRODUCT_COMPARE_SLUG } from "@/features/comparison/product-comparison.constants";
import { fetchProductCompareBundle } from "@/features/comparison/product-comparison.service";
import { queryListingRecordsBySlugs } from "@/features/products/listing/query-listing";
import { parseProductComparisonProps } from "@/features/builder/blocks/commerce/product-blocks/lib/parse-block-props";
import { ComparisonCatalogOverflow } from "@/features/builder/blocks/content/components/comparison-catalog-overflow";
import type { BlockNode } from "@/types/builder";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";

type Props = {
  locale: Locale;
  props: Record<string, unknown>;
  previewMode?: boolean;
  block?: BlockNode;
  overflow?: BlockOverflowContext;
};

export async function ProductComparisonBlockRenderer({
  locale,
  props: raw,
  previewMode,
  block,
  overflow,
}: Props) {
  const p = parseProductComparisonProps(raw);
  const slugs = p.productSlugs.slice(0, PRODUCT_COMPARE_MAX);

  if (slugs.length === 0) {
    if (previewMode) {
      return (
        <p className="text-center text-sm text-muted-foreground py-8">
          Select product slugs to compare.
        </p>
      );
    }
    return null;
  }

  const records = await queryListingRecordsBySlugs(locale, slugs);
  const productIds = records.map((r) => r.id).filter(Boolean);
  const mode = p.highlightDifferences ? p.compareMode : "all";
  const bundle = await fetchProductCompareBundle(productIds, locale, mode);

  if (bundle.items.length === 0) {
    if (previewMode) {
      return (
        <p className="text-center text-sm text-muted-foreground py-8">
          No valid products found for comparison.
        </p>
      );
    }
    return null;
  }

  const title = getLocalizedField(p, "title", locale);
  const compareHref = `/${locale}/compare/${PRODUCT_COMPARE_SLUG}?ids=${productIds.join(",")}`;

  return (
    <div>
      {title ? <SectionHeader title={title} /> : null}
      <div className={title ? "mt-8" : undefined}>
        {block && overflow ? (
          <ComparisonCatalogOverflow
            items={bundle.items}
            locale={locale}
            block={block}
            overflow={overflow}
          />
        ) : (
          <ComparisonTable
            items={bundle.items}
            entries={bundle.specEntries}
            locale={locale}
            specificationsLabel={compareSpecificationsLabel(locale)}
          />
        )}
      </div>
      {p.showCompareLink && productIds.length > 0 ? (
        <div className="mt-6 text-center">
          <Button asChild variant="outline" size="sm">
            <Link href={compareHref}>Open full comparison</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
