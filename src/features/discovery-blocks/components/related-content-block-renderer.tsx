import type { Locale } from "@/i18n/routing";
import { SectionHeader } from "@/components/marketing/section";
import { getLocalizedField } from "@/lib/utils";
import { resolveRelatedContent } from "@/features/discovery-blocks/lib/resolve-related-content";
import { parseRelatedContentProps } from "@/features/discovery-blocks/lib/parse-block-props";
import { RelatedContentView } from "@/features/discovery-blocks/components/related-content-view";
import type { DiscoveryAnchorContext } from "@/features/discovery-blocks/lib/recently-viewed.types";
import type { BlockNode } from "@/types/builder";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";

type Props = {
  locale: Locale;
  props: Record<string, unknown>;
  previewMode?: boolean;
  discoveryAnchor?: DiscoveryAnchorContext | null;
  block?: BlockNode;
  overflow?: BlockOverflowContext;
};

export async function RelatedContentBlockRenderer({
  locale,
  props: raw,
  previewMode,
  discoveryAnchor,
  block,
  overflow,
}: Props) {
  const p = parseRelatedContentProps(raw);
  const items = await resolveRelatedContent(locale, p, discoveryAnchor ?? null);

  if (items.length === 0) {
    if (previewMode) {
      return (
        <p className="text-center text-sm text-muted-foreground py-8 border border-dashed rounded-lg">
          No related content found for the current rules.
        </p>
      );
    }
    return null;
  }

  const title = getLocalizedField(p, "title", locale);

  return (
    <div>
      {title ? <SectionHeader title={title} /> : null}
      <div className={title ? "mt-8" : undefined}>
        <RelatedContentView
          locale={locale}
          items={items}
          blockProps={raw}
          block={block}
          overflow={overflow}
        />
      </div>
    </div>
  );
}
