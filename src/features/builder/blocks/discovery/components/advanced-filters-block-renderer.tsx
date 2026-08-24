import type { Locale } from "@/i18n/routing";
import { SectionHeader } from "@/components/marketing/section";
import { getLocalizedField } from "@/lib/utils";
import { ensureSearchRuntimeConfig } from "@/capabilities/search/settings/search-runtime";
import { toPublicSearchConfig } from "@/capabilities/search/settings/public-search-config";
import { readSiteSettings } from "@/features/catalog/site-settings.service";
import { prefixToCatalogLocaleCode } from "@/features/catalog/locales";
import { parseAdvancedFiltersProps } from "@/features/builder/blocks/discovery/lib/parse-block-props";
import { AdvancedFiltersIsland } from "@/features/builder/blocks/discovery/components/advanced-filters-island";
import { resolveProductListingFiltersFromSite } from "@/features/products/listing/resolve-product-listing-filters";

type Props = {
  locale: Locale;
  props: Record<string, unknown>;
};

export async function AdvancedFiltersBlockRenderer({ locale, props: raw }: Props) {
  const p = parseAdvancedFiltersProps(raw);
  const title = getLocalizedField(p, "title", locale);
  const subtitle = getLocalizedField(p, "subtitle", locale);

  let searchConfig;
  if (p.scope === "search") {
    const admin = await ensureSearchRuntimeConfig(locale);
    searchConfig = toPublicSearchConfig(admin);
  }

  let listingFilters;
  if (p.scope === "products") {
    const catalogLocale = await prefixToCatalogLocaleCode(locale);
    const site = await readSiteSettings(catalogLocale);
    listingFilters = resolveProductListingFiltersFromSite(site);
  }

  return (
    <div>
      {(title || subtitle) && <SectionHeader title={title || ""} subtitle={subtitle} />}
      <div className={title || subtitle ? "mt-6" : undefined}>
        <AdvancedFiltersIsland
          locale={locale}
          blockProps={raw}
          searchConfig={searchConfig}
          listingFilters={listingFilters}
        />
      </div>
    </div>
  );
}
