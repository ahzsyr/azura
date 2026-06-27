import type { Locale } from "@/i18n/routing";
import { SectionHeader } from "@/components/marketing/section";
import { getLocalizedField } from "@/lib/utils";
import {
  loadCategoryExplorerNodes,
  sortFeaturedFirst,
} from "@/features/builder/blocks/discovery/lib/category-sources";
import { parseCategoryExplorerProps } from "@/features/builder/blocks/discovery/lib/parse-block-props";
import { CategoryExplorerIsland } from "@/features/builder/blocks/discovery/components/category-explorer-island";
import type { BlockNode } from "@/types/builder";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";

type Props = {
  locale: Locale;
  props: Record<string, unknown>;
  previewMode?: boolean;
  block?: BlockNode;
  overflow?: BlockOverflowContext;
};

export async function CategoryExplorerBlockRenderer({
  locale,
  props: raw,
  previewMode,
  block,
  overflow,
}: Props) {
  const p = parseCategoryExplorerProps(raw);
  let nodes = await loadCategoryExplorerNodes(locale, p);
  nodes = sortFeaturedFirst(nodes, p.featuredSlugs);

  if (nodes.length === 0) {
    if (previewMode) {
      return (
        <p className="text-center text-sm text-muted-foreground py-8 border border-dashed rounded-lg">
          No categories found for source &quot;{p.source}&quot;.
        </p>
      );
    }
    return null;
  }

  const title = getLocalizedField(p, "title", locale);
  const subtitle = getLocalizedField(p, "subtitle", locale);

  return (
    <div>
      {(title || subtitle) && <SectionHeader title={title || ""} subtitle={subtitle} />}
      <div className={title || subtitle ? "mt-6" : undefined}>
        <CategoryExplorerIsland locale={locale} nodes={nodes} blockProps={raw} block={block} overflow={overflow} />
      </div>
    </div>
  );
}
