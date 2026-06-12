import type { Locale } from "@/i18n/routing";
import { SectionHeader } from "@/components/marketing/section";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getLocalizedField } from "@/lib/utils";
import { paginateListing } from "@/features/products/listing/filter";
import { ProductListingGrid } from "@/features/products/components/listing/product-listing-grid";
import { resolveProductsForBlock } from "@/features/product-blocks/lib/resolve-products-for-block";
import { parseProductGridProps } from "@/features/product-blocks/lib/parse-block-props";
import { ProductGridBlockIsland } from "@/features/product-blocks/components/product-grid-block-island";
import { ProductRecordsOverflowLayout } from "@/features/product-blocks/components/product-records-overflow-layout";
import { ProductBlockCardShell } from "@/features/product-blocks/components/product-block-card-shell";
import { blockPropsToCardDisplayOverrides } from "@/features/products/lib/product-card-display";
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

export async function ProductGridBlockRenderer({
  locale,
  props: raw,
  previewMode,
  block,
  previewDevice,
}: Props) {
  const p = parseProductGridProps(raw);
  const displayOverrides = blockPropsToCardDisplayOverrides(p);
  const selection = {
    source: p.source,
    collectionSlug: p.collectionSlug,
    productSlugs: p.productSlugs,
    tags: p.tags,
    limit: p.showToolbar ? Math.max(p.limit, p.pageSize * 3) : p.limit,
    sortBy: p.sortBy,
  };

  const records = await resolveProductsForBlock(locale, selection);
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
  const badge = getLocalizedField(p, "badge", locale);

  const gridContent = p.showToolbar ? (
    <ProductGridBlockIsland
      localePrefix={locale}
      initialRecords={records}
      pageSize={p.pageSize}
      viewMode={p.viewMode}
      sortBy={p.sortBy}
      emptyMessage={emptyMessage || "No products match your filters."}
    />
  ) : block ? (
    <ProductRecordsOverflowLayout
      products={paginateListing(records, 1, p.limit as 12).items}
      localePrefix={locale}
      flags={resolveContentOverflowCssFlags(block)}
      previewDevice={previewDevice}
      columns={3}
    />
  ) : (
    <ProductListingGrid
      products={paginateListing(records, 1, p.limit as 12).items}
      localePrefix={locale}
      viewMode={p.viewMode}
      numberLocale={locale.startsWith("ar") ? "ar" : "en-US"}
      emptyMessage={emptyMessage || "No products."}
    />
  );

  return (
    <ProductBlockCardShell locale={locale} displayOverrides={displayOverrides}>
      <div>
        {(title || subtitle || badge) && (
          <SectionHeader title={title || ""} subtitle={subtitle} badge={badge} />
        )}
        <div className={title || subtitle || badge ? "mt-8" : undefined}>
          {gridContent}
        </div>
        {p.viewAllHref ? (
          <div className="mt-8 text-center">
            <Button asChild variant="outline">
              <Link href={p.viewAllHref}>View all</Link>
            </Button>
          </div>
        ) : null}
      </div>
    </ProductBlockCardShell>
  );
}
