import type { Locale } from "@/i18n/routing";
import { SectionHeader } from "@/components/marketing/section";
import { getLocalizedField } from "@/lib/utils";
import { ensureSearchRuntimeConfig } from "@/features/search/settings/search-runtime";
import { toPublicSearchConfig } from "@/features/search/settings/public-search-config";
import { parseSearchBlockProps } from "@/features/discovery-blocks/lib/parse-block-props";
import { SearchBlockIsland } from "@/features/discovery-blocks/components/search-block-island";
import type { SearchLocale } from "@/features/search/components/search-ui/search-copy";

type Props = {
  locale: Locale;
  props: Record<string, unknown>;
  previewMode?: boolean;
};

export async function SearchBlockRenderer({ locale, props: raw, previewMode }: Props) {
  const p = parseSearchBlockProps(raw);
  const admin = await ensureSearchRuntimeConfig(locale);
  if (!admin.general.enabled || !admin.general.globalSearchEnabled) {
    if (previewMode) {
      return (
        <p className="text-center text-sm text-muted-foreground py-8 border border-dashed rounded-lg">
          Global search is disabled in site settings.
        </p>
      );
    }
    return null;
  }

  const config = toPublicSearchConfig(admin);
  const title = getLocalizedField(p, "title", locale);
  const subtitle = getLocalizedField(p, "subtitle", locale);

  return (
    <div>
      {(title || subtitle) && <SectionHeader title={title || ""} subtitle={subtitle} />}
      <div className={title || subtitle ? "mt-6" : undefined}>
        <SearchBlockIsland
          locale={locale as SearchLocale}
          config={config}
          blockProps={raw}
        />
      </div>
    </div>
  );
}
