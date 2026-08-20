import type { Locale } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { fetchCompareItems } from "@/features/comparison/comparison-data.service";
import { compareDefaultTitle } from "@/features/comparison/lib/compare-locale";
import { buildCompareTable } from "@/features/comparison/comparison-engine";
import { resolveComparisonForType } from "@/features/comparison/comparison-schema-resolver";
import { ComparisonTable } from "@/features/comparison/components/comparison-table";
import { getPublishedPackages } from "@/lib/data";
import { getLocalizedField } from "@/lib/utils";
import { ManualComparisonView } from "@/features/builder/blocks/content/components/manual-comparison-view";
import { ManualComparisonOverflow } from "@/features/builder/blocks/content/components/manual-comparison-overflow";
import { ComparisonCatalogOverflow } from "@/features/builder/blocks/content/components/comparison-catalog-overflow";
import type { BlockNode } from "@/types/builder";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";
import type {
  comparisonColumnSchema,
  comparisonLayoutSchema,
  comparisonRowSchema,
  comparisonSourceSchema,
} from "@/features/builder/blocks/content/schemas/content-blocks";
import type { CompareItemSnapshot } from "@/features/comparison/types";
import type { z } from "zod";

type Props = {
  locale: Locale;
  title?: string;
  previewMode?: boolean;
  source?: z.infer<typeof comparisonSourceSchema>;
  layout?: z.infer<typeof comparisonLayoutSchema>;
  highlightDifferences?: boolean;
  columns?: z.infer<typeof comparisonColumnSchema>[];
  rows?: z.infer<typeof comparisonRowSchema>[];
  contentTypeSlug?: string;
  itemIds?: string[];
  catalogSource?: "packages" | "hotels" | "services";
  attributeKeys?: string[];
  block?: BlockNode;
  overflow?: BlockOverflowContext;
};

async function fetchCatalogSnapshots(
  catalogSource: "packages" | "hotels" | "services",
  itemIds: string[],
  locale: Locale,
): Promise<CompareItemSnapshot[]> {
  if (catalogSource === "packages") {
    const packages = await getPublishedPackages();
    const filtered = itemIds.length
      ? packages.filter((p) => itemIds.includes(p.id))
      : packages.slice(0, 4);
    return filtered.map((pkg) => ({
      id: pkg.id,
      contentTypeSlug: "packages",
      slug: pkg.slug,
      title: getLocalizedField(pkg as Record<string, unknown>, "name", locale),
      titleEn: pkg.nameEn,
      titleAr: pkg.nameAr,
      href: `/packages/${pkg.slug}`,
      imageUrl: pkg.images[0]?.url ?? null,
      attributes: {
        price: pkg.price,
        currency: pkg.currency,
        duration: pkg.duration,
        category: getLocalizedField((pkg.category ?? {}) as Record<string, unknown>, "name", locale),
      },
    }));
  }
  return [];
}

export async function ComparisonBlockRenderer({
  locale,
  title,
  source = "manual",
  layout = "table",
  highlightDifferences = true,
  columns = [],
  rows = [],
  contentTypeSlug = "",
  itemIds = [],
  catalogSource = "packages",
  attributeKeys = [],
  previewMode = false,
  block,
  overflow,
}: Props) {
  if (source === "manual") {
    if (block && overflow && layout === "cards" && columns.length > 0) {
      return (
        <ManualComparisonOverflow
          title={title}
          columns={columns}
          rows={rows}
          highlightDifferences={highlightDifferences}
          locale={locale}
          block={block}
          overflow={overflow}
        />
      );
    }
    return (
      <ManualComparisonView
        title={title}
        columns={columns}
        rows={rows}
        layout={layout}
        highlightDifferences={highlightDifferences}
        locale={locale}
      />
    );
  }

  let items: CompareItemSnapshot[] = [];
  let entries: ReturnType<typeof buildCompareTable> = [];

  if (source === "contentType" && contentTypeSlug) {
    items = await fetchCompareItems(contentTypeSlug, itemIds);
    const type = await prisma.contentType.findFirst({ where: { slug: contentTypeSlug } });
    if (type) {
      const fieldSchema = Array.isArray(type.fieldSchema)
        ? (type.fieldSchema as import("@/features/content/types").ContentFieldDefinition[])
        : [];
      const { fields } = resolveComparisonForType({
        fieldSchema,
        adminConfig: (type.adminConfig as Record<string, unknown>) ?? {},
      });
      const filteredFields =
        attributeKeys.length > 0 ? fields.filter((f) => attributeKeys.includes(f.key)) : fields;
      entries = buildCompareTable(items, filteredFields, locale, "all");
    }
  } else if (source === "catalog") {
    items = await fetchCatalogSnapshots(catalogSource, itemIds, locale);
    if (items.length >= 2) {
      const keys =
        attributeKeys.length > 0
          ? attributeKeys
          : ["price", "duration", "category"].filter((k) =>
              items.some((i) => i.attributes[k] != null)
            );
      entries = keys.map((key) => ({
        type: "row" as const,
        key,
        group: "General",
        label: key.charAt(0).toUpperCase() + key.slice(1),
        values: items.map((item) => {
          const v = item.attributes[key];
          return v != null ? String(v) : null;
        }),
        differs: false,
        highlightDifferences,
      }));
    }
  }

  if (items.length === 0) {
    if (previewMode) {
      return (
        <p className="text-center text-sm text-muted-foreground py-8 border border-dashed rounded-lg">
          Configure comparison items or switch to manual mode.
        </p>
      );
    }
    return (
      <ManualComparisonView
        title={title}
        columns={columns}
        rows={rows}
        layout={layout}
        highlightDifferences={highlightDifferences}
        locale={locale}
      />
    );
  }

  const specLabel = title ?? compareDefaultTitle(locale);

  if (block && overflow && (layout === "cards" || layout === "sideBySide")) {
    return (
      <ComparisonCatalogOverflow
        items={items}
        locale={locale}
        title={title}
        block={block}
        overflow={overflow}
      />
    );
  }

  return (
    <div className="space-y-6">
      {title && <h2 className="font-heading text-2xl font-bold">{title}</h2>}
      <ComparisonTable
        items={items}
        entries={entries}
        locale={locale}
        specificationsLabel={specLabel}
      />
    </div>
  );
}
