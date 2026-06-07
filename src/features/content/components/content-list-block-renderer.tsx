import type { Locale } from "@/i18n/routing";
import type { BlockNode } from "@/types/builder";
import { resolveContentOverflowCssFlags } from "@/features/builder/styles/content-overflow-resolver";
import { ContentBlockRenderer } from "@/features/content/components/content-block-renderer";
import { loadContentItems } from "@/features/content/content-data.service";
import { mergeDisplaySettings } from "@/schemas/content/display-settings";
import { getLocalizedField } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { loadComparePropsForContentType } from "@/features/comparison/load-compare-props";

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
  const settings = mergeDisplaySettings(p.displaySettings as Record<string, unknown>);
  const rawTypeSlug = typeof p.contentTypeSlug === "string" ? p.contentTypeSlug.trim() : "";
  const contentTypeSlug = rawTypeSlug || "catalog-items";

  const [items, contentTypeRow] = await Promise.all([
    loadContentItems({
      contentTypeSlug,
      collectionSlug: (p.collectionSlug as string) || undefined,
      featuredOnly: Boolean(p.featuredOnly),
      manualIds: (p.manualIds as string[]) ?? [],
      limit: settings.limit ?? (p.limit as number) ?? 6,
    }),
    prisma.contentType.findUnique({ where: { slug: contentTypeSlug } }),
  ]);

  if (items.length === 0 && !previewMode) return null;

  const compare =
    rawTypeSlug && contentTypeRow
      ? loadComparePropsForContentType({
          slug: contentTypeRow.slug,
          fieldSchema: contentTypeRow.fieldSchema,
          adminConfig: contentTypeRow.adminConfig,
          locale,
        })
      : undefined;

  const overflowFlags = block ? resolveContentOverflowCssFlags(block) : undefined;

  return (
    <ContentBlockRenderer
      locale={locale}
      title={getLocalizedField(p, "title", locale) || undefined}
      subtitle={getLocalizedField(p, "subtitle", locale) || undefined}
      items={items}
      displaySettings={settings}
      viewAllHref={(p.viewAllHref as string) || undefined}
      emptyMessage={
        getLocalizedField(p, "emptyMessage", locale) ||
        (previewMode ? "No content items to display." : undefined)
      }
      compare={compare}
      block={block}
      overflowFlags={overflowFlags}
      previewDevice={previewDevice}
    />
  );
}
