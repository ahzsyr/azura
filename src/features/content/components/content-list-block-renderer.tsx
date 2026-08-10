import type { Locale } from "@/i18n/routing";
import type { BlockNode } from "@/types/builder";
import { resolveContentOverflowCssFlags } from "@/features/builder/styles/content-overflow-resolver";
import { ContentBlockRenderer } from "@/features/content/components/content-block-renderer";
import { mergeDisplaySettings } from "@/schemas/content/display-settings";
import { getLocalizedField } from "@/lib/utils";
import { parseContentListBlockProps } from "@/features/content/schemas/content-list-block";
import { resolveContentCardViewModelsForBlock } from "@/features/content/lib/resolve-content-card-view-models-for-block";

type Props = {
  locale: Locale;
  props: Record<string, unknown>;
  previewMode?: boolean;
  block?: BlockNode;
  previewDevice?: import("@/types/block-system").DeviceBreakpoint;
};

export async function ContentListBlockRenderer({
  locale,
  props: p,
  previewMode,
  block,
  previewDevice,
}: Props) {
  const parsed = parseContentListBlockProps(p);
  const settings = mergeDisplaySettings(parsed.displaySettings as Record<string, unknown>);

  const viewModels = await resolveContentCardViewModelsForBlock(locale, {
    ...parsed,
    displaySettings: settings,
  });

  if (viewModels.length === 0 && !previewMode) return null;

  const overflowFlags = block ? resolveContentOverflowCssFlags(block) : undefined;

  return (
    <ContentBlockRenderer
      locale={locale}
      title={getLocalizedField(parsed, "title", locale) || undefined}
      subtitle={getLocalizedField(parsed, "subtitle", locale) || undefined}
      viewModels={viewModels}
      displaySettings={settings}
      viewAllHref={parsed.viewAllHref || undefined}
      emptyMessage={
        getLocalizedField(parsed, "emptyMessage", locale) ||
        (previewMode ? "No content items to display." : undefined)
      }
      block={block}
      overflowFlags={overflowFlags}
      previewDevice={previewDevice}
    />
  );
}
