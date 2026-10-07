import type { Locale } from "@/i18n/routing";
import { SectionHeader } from "@/components/marketing/section";
import { getLocalizedField } from "@/lib/utils";
import { resolveRelatedContent } from "@/features/builder/blocks/discovery/lib/resolve-related-content";
import { parseRelatedContentProps } from "@/features/builder/blocks/discovery/lib/parse-block-props";
import { RelatedContentView } from "@/features/builder/blocks/discovery/components/related-content-view";
import type { DiscoveryAnchorContext } from "@/features/builder/blocks/discovery/lib/recently-viewed.types";
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
  const subtitle = getLocalizedField(p, "subtitle", locale);
  const badge = getLocalizedField(p, "badge", locale);
  const showHeader = Boolean(title || subtitle || badge);

  return (
    <div>
      {showHeader ? (
        <SectionHeader
          title={title || subtitle || badge || ""}
          subtitle={title ? subtitle || undefined : undefined}
          badge={badge || undefined}
        />
      ) : null}
      <div className={showHeader ? "mt-8" : undefined}>
        <RelatedContentView locale={locale} items={items} blockProps={raw} />
      </div>
    </div>
  );
}
