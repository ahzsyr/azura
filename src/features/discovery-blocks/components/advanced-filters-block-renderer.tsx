import type { Locale } from "@/i18n/routing";
import { SectionHeader } from "@/components/marketing/section";
import { getLocalizedField } from "@/lib/utils";
import { ensureSearchRuntimeConfig } from "@/features/search/settings/search-runtime";
import { toPublicSearchConfig } from "@/features/search/settings/public-search-config";
import { parseAdvancedFiltersProps } from "@/features/discovery-blocks/lib/parse-block-props";
import { AdvancedFiltersIsland } from "@/features/discovery-blocks/components/advanced-filters-island";

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

  return (
    <div>
      {(title || subtitle) && <SectionHeader title={title || ""} subtitle={subtitle} />}
      <div className={title || subtitle ? "mt-6" : undefined}>
        <AdvancedFiltersIsland
          locale={locale}
          blockProps={raw}
          searchConfig={searchConfig}
        />
      </div>
    </div>
  );
}
