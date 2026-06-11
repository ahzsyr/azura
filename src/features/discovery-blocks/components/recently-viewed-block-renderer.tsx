import type { Locale } from "@/i18n/routing";
import { SectionHeader } from "@/components/marketing/section";
import { getLocalizedField } from "@/lib/utils";
import { parseRecentlyViewedProps } from "@/features/discovery-blocks/lib/parse-block-props";
import { RecentlyViewedBlockIsland } from "@/features/discovery-blocks/components/recently-viewed-block-island";
import type { BlockNode } from "@/types/builder";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";

type Props = {
  locale: Locale;
  props: Record<string, unknown>;
  previewMode?: boolean;
  block?: BlockNode;
  overflow?: BlockOverflowContext;
};

export async function RecentlyViewedBlockRenderer({
  locale,
  props: raw,
  previewMode,
  block,
  overflow,
}: Props) {
  const p = parseRecentlyViewedProps(raw);
  const title = getLocalizedField(p, "title", locale);
  const subtitle = getLocalizedField(p, "subtitle", locale);
  const emptyMessage =
    getLocalizedField(p, "emptyMessage", locale) ||
    (previewMode ? "Recently viewed items will appear here after browsing." : "");

  return (
    <div>
      {(title || subtitle) && <SectionHeader title={title || ""} subtitle={subtitle} />}
      <div className={title || subtitle ? "mt-6" : undefined}>
        <RecentlyViewedBlockIsland
          blockProps={raw}
          emptyMessage={emptyMessage || undefined}
          block={block}
          overflow={overflow}
        />
      </div>
    </div>
  );
}
