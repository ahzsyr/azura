import type { Locale } from "@/i18n/routing";
import { resolveCategoryShowcaseNodes } from "@/features/commerce-showcase/lib/resolve-category-showcase-nodes";
import { resolveBrandShowcaseNodes } from "@/features/commerce-showcase/lib/resolve-brand-profiles";
import { resolveProductSource, resolveProductsForShowcaseTab } from "@/features/commerce-showcase/lib/resolve-product-source";
import { parseMegaCollectionShowcaseProps } from "@/features/commerce-showcase/lib/parse-block-props";
import { MegaCollectionIsland } from "@/features/commerce-showcase/components/mega-collection-island";
import type { BlockNode } from "@/types/builder";
import type { DeviceBreakpoint } from "@/types/block-system";

type Props = {
  locale: Locale;
  props: Record<string, unknown>;
  previewMode?: boolean;
  block?: BlockNode;
  previewDevice?: DeviceBreakpoint;
};

export async function MegaCollectionBlockRenderer({
  locale,
  props: raw,
  previewMode,
  block,
  previewDevice,
}: Props) {
  const p = parseMegaCollectionShowcaseProps(raw);

  const navNodes = await resolveCategoryShowcaseNodes(locale, {
    source: p.leftNavSource,
    selection: "auto",
    manualSlugs: [],
    featuredSlugs: [],
    manualNodes: [],
    maxDepth: p.leftNavMaxDepth,
    limit: 24,
    sort: "name",
  });

  const navKey =
    p.centerCategory.trim() ||
    navNodes[0]?.slug ||
    "";

  let records: Awaited<ReturnType<typeof resolveProductSource>> = [];
  let total = 0;

  if (p.centerCollectionSlug.trim()) {
    records = await resolveProductSource(locale, {
      source: "collection",
      collectionSlug: p.centerCollectionSlug,
      limit: p.centerLimit,
      sortBy: p.centerSortBy,
    });
    total = records.length;
  } else if (navKey) {
    const result = await resolveProductsForShowcaseTab(locale, "category", navKey, {
      limit: p.centerLimit,
      sortBy: p.centerSortBy,
    });
    records = result.records;
    total = result.total;
  }

  let featuredBrand;
  if (p.rightFeaturedBrandSlug.trim()) {
    const brands = await resolveBrandShowcaseNodes(locale, {
      source: "catalogProfiles",
      brandSelection: "pick",
      manualBrands: [],
      featuredSlugs: [],
      selectedBrandSlugs: [p.rightFeaturedBrandSlug],
      manualSlugs: [p.rightFeaturedBrandSlug],
      sort: "manual",
      limit: 1,
    });
    featuredBrand = brands[0];
  }

  if (navNodes.length === 0 && records.length === 0) {
    if (previewMode) {
      return (
        <p className="text-center text-sm text-muted-foreground py-8 border border-dashed rounded-lg">
          Configure navigation categories and center products for mega collection.
        </p>
      );
    }
    return null;
  }

  return (
    <MegaCollectionIsland
      locale={locale}
      navNodes={navNodes}
      initialRecords={records}
      initialTotal={total}
      initialNavKey={navKey}
      featuredBrand={featuredBrand}
      blockProps={raw}
      block={block}
      previewDevice={previewDevice}
    />
  );
}
