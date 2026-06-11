import { prisma } from "@/lib/prisma";
import { resolveFieldSchema } from "@/features/content/content-type.registry";
import type { ContentFieldDefinition } from "@/features/content/types";
import { resolveComparisonForType } from "@/features/comparison/comparison-schema-resolver";
import type { ComparableTypeMeta } from "@/features/comparison/types";
import {
  PRODUCT_COMPARE_MAX,
  PRODUCT_COMPARE_SLUG,
} from "@/features/comparison/product-comparison.constants";
import { resolveCompareContentTypeSlug } from "@/features/comparison/comparison-route-resolver";
import { createCached, CACHE_TAGS } from "@/services/cache";
import { REVALIDATE } from "@/lib/config/performance";

export type RegisteredComparableType = ComparableTypeMeta & {
  fieldSchema: ContentFieldDefinition[];
  adminConfig: Record<string, unknown>;
};

function parseAdminConfig(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  return {};
}

async function listComparableContentTypesUncached(): Promise<RegisteredComparableType[]> {
  const rows = await prisma.contentType.findMany({
    where: { isEnabled: true },
    orderBy: { sortOrder: "asc" },
  });

  const out: RegisteredComparableType[] = [];

  out.push(virtualProductComparableType());

  for (const row of rows) {
    const fieldSchema = resolveFieldSchema({ fieldSchema: row.fieldSchema }, row.slug);
    const adminConfig = parseAdminConfig(row.adminConfig);
    const { comparable, config } = resolveComparisonForType({ fieldSchema, adminConfig });
    if (!comparable) continue;

    out.push({
      id: row.id,
      slug: row.slug,
      labelPluralEn: row.labelPluralEn,
      labelPluralAr: row.labelPluralAr,
      routePrefix: row.routePrefix,
      maxItems: config.comparisonSettings.maxItems,
      comparisonMode: config.comparisonSettings.comparisonMode,
      fieldSchema,
      adminConfig,
    });
  }

  return out.sort((a, b) => {
    const pa =
      typeof a.adminConfig.comparisonPriority === "number"
        ? a.adminConfig.comparisonPriority
        : 999;
    const pb =
      typeof b.adminConfig.comparisonPriority === "number"
        ? b.adminConfig.comparisonPriority
        : 999;
    return pa - pb;
  });
}

const listComparableContentTypesCached = createCached(
  listComparableContentTypesUncached,
  ["comparable-content-types"],
  { tags: [CACHE_TAGS.comparableTypes, CACHE_TAGS.marketing], revalidate: REVALIDATE.marketing }
);

export async function listComparableContentTypes(): Promise<RegisteredComparableType[]> {
  return listComparableContentTypesCached();
}

function virtualProductComparableType(): RegisteredComparableType {
  return {
    id: "virtual-products",
    slug: PRODUCT_COMPARE_SLUG,
    labelPluralEn: "Products",
    labelPluralAr: "المنتجات",
    routePrefix: "products",
    maxItems: PRODUCT_COMPARE_MAX,
    comparisonMode: "hybrid",
    fieldSchema: [],
    adminConfig: {
      isComparable: true,
      comparisonGroup: "Catalog",
      comparisonPriority: 0,
      comparisonSettings: {
        enabled: true,
        maxItems: PRODUCT_COMPARE_MAX,
        comparisonMode: "hybrid",
      },
    },
  };
}

export async function getComparableContentTypeBySlug(
  slug: string
): Promise<RegisteredComparableType | null> {
  const resolved = resolveCompareContentTypeSlug(slug);

  if (resolved === PRODUCT_COMPARE_SLUG) {
    return virtualProductComparableType();
  }

  const row = await prisma.contentType.findFirst({
    where: { slug: resolved, isEnabled: true },
  });
  if (!row) return null;

  const fieldSchema = resolveFieldSchema({ fieldSchema: row.fieldSchema }, row.slug);
  const adminConfig = parseAdminConfig(row.adminConfig);
  const { comparable, config, fields } = resolveComparisonForType({ fieldSchema, adminConfig });
  if (!comparable || fields.length === 0) return null;

  const priority =
    typeof adminConfig.comparisonPriority === "number"
      ? adminConfig.comparisonPriority
      : config.comparisonPriority;

  return {
    id: row.id,
    slug: row.slug,
    labelPluralEn: row.labelPluralEn,
    labelPluralAr: row.labelPluralAr,
    routePrefix: row.routePrefix,
    maxItems: config.comparisonSettings.maxItems,
    comparisonMode: config.comparisonSettings.comparisonMode,
    fieldSchema,
    adminConfig: {
      ...adminConfig,
      comparisonPriority: priority ?? row.sortOrder,
    },
  };
}
