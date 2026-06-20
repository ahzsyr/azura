import type { Locale } from "@/i18n/routing";
import { resolveCategoryShowcaseNodes } from "@/features/commerce-showcase/lib/resolve-category-showcase-nodes";
import { parseCategoryShowcaseProps } from "@/features/commerce-showcase/lib/parse-block-props";
import { CategoryShowcaseIsland } from "@/features/commerce-showcase/components/category-showcase-island";

type Props = {
  locale: Locale;
  props: Record<string, unknown>;
  previewMode?: boolean;
};

export async function CategoryShowcaseBlockRenderer({ locale, props: raw, previewMode }: Props) {
  const p = parseCategoryShowcaseProps(raw);
  const nodes = await resolveCategoryShowcaseNodes(locale, p);

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

  return <CategoryShowcaseIsland locale={locale} nodes={nodes} blockProps={raw} />;
}
