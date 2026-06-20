import type { Locale } from "@/i18n/routing";
import { resolveBrandShowcaseNodes } from "@/features/commerce-showcase/lib/resolve-brand-profiles";
import { coerceBrandShowcaseProps } from "@/features/commerce-showcase/lib/brand-selection";
import { parseBrandShowcaseProps } from "@/features/commerce-showcase/lib/parse-block-props";
import { BrandShowcaseIsland } from "@/features/commerce-showcase/components/brand-showcase-island";

type Props = {
  locale: Locale;
  props: Record<string, unknown>;
  previewMode?: boolean;
};

export async function BrandShowcaseBlockRenderer({ locale, props: raw, previewMode }: Props) {
  const coerced = coerceBrandShowcaseProps(raw);
  const p = parseBrandShowcaseProps(coerced);
  const nodes = await resolveBrandShowcaseNodes(locale, p);

  if (nodes.length === 0) {
    if (previewMode) {
      return (
        <p className="text-center text-sm text-muted-foreground py-8 border border-dashed rounded-lg">
          No brands configured. Add brand profiles in Catalog Taxonomy.
        </p>
      );
    }
    return null;
  }

  return <BrandShowcaseIsland locale={locale} nodes={nodes} blockProps={raw} />;
}
