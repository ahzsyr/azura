import type { Locale } from "@/i18n/routing";
import { getLocalizedField } from "@/lib/utils";
import { resolveProductSource } from "@/features/builder/blocks/commerce/commerce-showcase/lib/resolve-product-source";
import { parseProductShowcaseProps } from "@/features/builder/blocks/commerce/commerce-showcase/lib/parse-block-props";
import { ProductShowcaseBlockIsland } from "@/features/builder/blocks/commerce/commerce-showcase/components/product-showcase-block-island";
import type { BlockNode } from "@/types/builder";
import type { DeviceBreakpoint } from "@/types/block-system";

type Props = {
  locale: Locale;
  props: Record<string, unknown>;
  previewMode?: boolean;
  block?: BlockNode;
  previewDevice?: DeviceBreakpoint;
};

export async function ProductShowcaseBlockRenderer({
  locale,
  props: raw,
  previewMode,
  block,
  previewDevice,
}: Props) {
  const p = parseProductShowcaseProps(raw);

  if (p.mode === "tabs" && p.tabs.length > 0) {
    const tabBundles = await Promise.all(
      p.tabs.map(async (tab) => ({
        id: tab.id,
        label: getLocalizedField(tab, "label", locale) || tab.id,
        source: tab.source,
        records: await resolveProductSource(locale, {
          source: tab.source,
          collectionSlug: tab.collectionSlug,
          productSlugs: tab.productSlugs,
          tags: tab.tags,
          brand: tab.brand,
          category: tab.category,
          limit: tab.limit,
          sortBy: tab.sortBy,
          anchorSlug: p.anchorSlug,
        }),
      })),
    );

    if (tabBundles.every((t) => t.records.length === 0) && !previewMode) return null;

    return (
      <ProductShowcaseBlockIsland
        locale={locale}
        blockProps={raw}
        initialRecords={tabBundles[0]?.records ?? []}
        tabBundles={tabBundles}
        block={block}
        previewDevice={previewDevice}
      />
    );
  }

  if (p.source === "recently_viewed") {
    return (
      <ProductShowcaseBlockIsland
        locale={locale}
        blockProps={raw}
        initialRecords={[]}
        block={block}
        previewDevice={previewDevice}
      />
    );
  }

  const records = await resolveProductSource(locale, {
    source: p.source,
    collectionSlug: p.collectionSlug,
    productSlugs: p.productSlugs,
    tags: p.tags,
    brand: p.brand,
    category: p.category,
    limit: p.limit,
    sortBy: p.sortBy,
    anchorSlug: p.anchorSlug,
  });

  if (records.length === 0) {
    if (previewMode) {
      const emptyMessage =
        getLocalizedField(p, "emptyMessage", locale) || "No products to display.";
      return <p className="text-center text-sm text-muted-foreground py-8">{emptyMessage}</p>;
    }
    return null;
  }

  return (
    <ProductShowcaseBlockIsland
      locale={locale}
      blockProps={raw}
      initialRecords={records}
      block={block}
      previewDevice={previewDevice}
    />
  );
}
