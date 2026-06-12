import type { Locale } from "@/i18n/routing";
import { getLocalizedField } from "@/lib/utils";
import { resolveProductsForShowcaseTab } from "@/features/commerce-showcase/lib/resolve-product-source";
import { resolveAutoTaxonomyTabs } from "@/features/commerce-showcase/lib/resolve-category-showcase-nodes";
import { parseTaxonomyProductTabsProps } from "@/features/commerce-showcase/lib/parse-block-props";
import { TaxonomyProductTabsIsland } from "@/features/commerce-showcase/components/taxonomy-product-tabs-island";
import type { BlockNode } from "@/types/builder";
import type { DeviceBreakpoint } from "@/types/block-system";

type Props = {
  locale: Locale;
  props: Record<string, unknown>;
  previewMode?: boolean;
  block?: BlockNode;
  previewDevice?: DeviceBreakpoint;
};

export async function TaxonomyProductTabsRenderer({
  locale,
  props: raw,
  previewMode,
  block,
  previewDevice,
}: Props) {
  const p = parseTaxonomyProductTabsProps(raw);

  let tabs: Array<{ slug: string; label: string; count?: number; iconUrl?: string }> = [];

  if (p.tabSource === "manual" && p.tabs.length > 0) {
    tabs = p.tabs.map((t) => ({
      slug: t.slug,
      label: getLocalizedField(t, "label", locale) || t.slug,
      count: undefined,
      iconUrl: t.iconUrl || undefined,
    }));
  } else if (
    p.tabSource === "pick" &&
    p.taxonomy === "brand" &&
    p.selectedBrandSlugs.length > 0
  ) {
    const { resolveBrandShowcaseNodes } = await import(
      "@/features/commerce-showcase/lib/resolve-brand-profiles"
    );
    const nodes = await resolveBrandShowcaseNodes(locale, {
      source: "catalogProfiles",
      brandSelection: "pick",
      manualBrands: [],
      featuredSlugs: [],
      selectedBrandSlugs: p.selectedBrandSlugs,
      manualSlugs: [],
      brandOverrides: p.brandOverrides,
      sort: "manual",
      limit: p.selectedBrandSlugs.length,
    });
    tabs = nodes.map((n) => ({
      slug: n.slug,
      label: locale.startsWith("ar")
        ? n.nameAr || n.name
        : n.nameEn || n.name,
      count: n.count,
      iconUrl: n.logoUrl,
    }));
  } else {
    tabs = await resolveAutoTaxonomyTabs(locale, p.taxonomy, p.autoTabLimit);
  }

  if (tabs.length === 0) {
    if (previewMode) {
      return (
        <p className="text-center text-sm text-muted-foreground py-8 border border-dashed rounded-lg">
          No {p.taxonomy} tabs configured.
        </p>
      );
    }
    return null;
  }

  const firstTab = tabs[0]!;
  const { records, total } = await resolveProductsForShowcaseTab(
    locale,
    p.taxonomy,
    firstTab.slug,
    { limit: p.productsPerTab, sortBy: p.sortBy },
  );

  return (
    <TaxonomyProductTabsIsland
      locale={locale}
      blockProps={raw}
      tabs={tabs}
      initialTabSlug={firstTab.slug}
      initialRecords={records}
      initialTotal={total}
      taxonomy={p.taxonomy}
      block={block}
      previewDevice={previewDevice}
    />
  );
}
