import type { PrismaClient } from "@prisma/client";
import { BUILTIN_CONTENT_TYPES } from "../src/features/content/content-type.registry";
import type { ContentFieldDefinition, ContentTypeDefinition } from "../src/features/content/types";

const COMPARE_FIELD_KEYS: Record<string, string[]> = {
  "catalog-items": ["duration", "price", "currency", "hotelInfo", "airlineInfo"],
  listings: ["city", "stars", "distance", "amenities"],
  offerings: ["offeringType", "highlights", "ctaLabel"],
};

function withCompareFields(fields: ContentFieldDefinition[], slug: string): ContentFieldDefinition[] {
  const keys = COMPARE_FIELD_KEYS[slug] ?? [];
  return fields.map((field) => {
    if (!keys.includes(field.key)) return field;
    return {
      ...field,
      compare: true,
      compareOrder: keys.indexOf(field.key) * 10,
      compareGroup: field.group
        ? field.group.charAt(0).toUpperCase() + field.group.slice(1)
        : "General",
      highlightDifferences: true,
    };
  });
}

function buildContentTypeAdminConfig(def: ContentTypeDefinition) {
  const comparable = Boolean(COMPARE_FIELD_KEYS[def.slug]?.length);
  return {
    inquiryEnabled: def.slug === "catalog-items",
    isComparable: comparable,
    comparisonSettings: {
      enabled: comparable,
      maxItems: 4,
      comparisonMode: "hybrid" as const,
    },
  };
}

/** Registers built-in content types only — no demo items or collections. */
export async function seedContentPlatform(prisma: PrismaClient) {
  for (const def of BUILTIN_CONTENT_TYPES) {
    await prisma.contentType.upsert({
      where: { slug: def.slug },
      update: {
        nameEn: def.nameEn,
        nameAr: def.nameAr,
        labelSingularEn: def.labelSingularEn,
        labelSingularAr: def.labelSingularAr,
        labelPluralEn: def.labelPluralEn,
        labelPluralAr: def.labelPluralAr,
        icon: def.icon,
        routePrefix: def.routePrefix,
        fieldSchema: withCompareFields(def.fields, def.slug),
        displaySchema: def.displayDefaults ?? {},
        adminConfig: buildContentTypeAdminConfig(def),
      },
      create: {
        slug: def.slug,
        nameEn: def.nameEn,
        nameAr: def.nameAr,
        labelSingularEn: def.labelSingularEn,
        labelSingularAr: def.labelSingularAr,
        labelPluralEn: def.labelPluralEn,
        labelPluralAr: def.labelPluralAr,
        icon: def.icon,
        routePrefix: def.routePrefix,
        fieldSchema: withCompareFields(def.fields, def.slug),
        displaySchema: def.displayDefaults ?? {},
        adminConfig: buildContentTypeAdminConfig(def),
        sortOrder: BUILTIN_CONTENT_TYPES.indexOf(def),
      },
    });
  }
}
