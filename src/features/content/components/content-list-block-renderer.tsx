import type { Locale } from "@/i18n/routing";
import { ContentBlockRenderer } from "@/features/content/components/content-block-renderer";
import { loadContentItems } from "@/features/content/content-data.service";
import { mergeDisplaySettings } from "@/schemas/content/display-settings";
import { getLocalizedField } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { resolveFieldSchema } from "@/features/content/content-type.registry";
import { getComparePropsForType } from "@/features/comparison/get-compare-props";

type Props = {
  locale: Locale;
  props: Record<string, unknown>;
  previewMode?: boolean;
};

export async function ContentListBlockRenderer({ locale, props: p, previewMode }: Props) {
  const settings = mergeDisplaySettings(p.displaySettings as Record<string, unknown>);
  const contentTypeSlug = (p.contentTypeSlug as string) || "catalog-items";

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

  const compare = contentTypeRow
    ? getComparePropsForType({
        slug: contentTypeRow.slug,
        fieldSchema: resolveFieldSchema(
          { fieldSchema: contentTypeRow.fieldSchema },
          contentTypeRow.slug
        ),
        adminConfig:
          contentTypeRow.adminConfig && typeof contentTypeRow.adminConfig === "object"
            ? (contentTypeRow.adminConfig as Record<string, unknown>)
            : {},
        locale,
      })
    : undefined;

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
    />
  );
}
