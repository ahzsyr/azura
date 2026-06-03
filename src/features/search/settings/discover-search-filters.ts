import "server-only";

import { prisma } from "@/lib/prisma";
import { resolveFieldSchema } from "@/features/content/content-type.registry";
import type { SearchableFieldDefinition } from "@/features/search-framework/schema/search-field-schema";
import { customFilterId } from "@/features/search/settings/search-filter-keys";

export type DiscoveredCustomSearchFilter = {
  id: string;
  fieldKey: string;
  contentTypeSlug: string;
  contentTypeLabelEn: string;
  facetKey: string;
  labelEn: string;
  labelAr: string;
  uiType: "chip" | "multi" | "select" | "range" | "date";
  fieldType: string;
};

function isAutoFilterField(field: SearchableFieldDefinition): boolean {
  const cfg = field.search;
  if (cfg === false) return false;
  if (cfg && typeof cfg === "object" && cfg.facet === true) return true;
  if (["select", "boolean", "price", "date", "number"].includes(field.type)) {
    return cfg === true || (typeof cfg === "object" && cfg !== null);
  }
  return false;
}

function uiTypeForField(field: SearchableFieldDefinition): DiscoveredCustomSearchFilter["uiType"] {
  if (field.type === "date") return "date";
  if (field.type === "number" || field.type === "price") return "range";
  if (field.type === "select" || field.type === "boolean") return "select";
  return "chip";
}

export async function discoverSearchFilterFields(): Promise<DiscoveredCustomSearchFilter[]> {
  const types = await prisma.contentType.findMany({
    where: { isEnabled: true },
    orderBy: { sortOrder: "asc" },
  });

  const discovered: DiscoveredCustomSearchFilter[] = [];
  const seen = new Set<string>();

  for (const type of types) {
    const fieldSchema = resolveFieldSchema(
      { fieldSchema: type.fieldSchema },
      type.slug
    ) as SearchableFieldDefinition[];

    for (const field of fieldSchema) {
      if (!isAutoFilterField(field)) continue;
      const id = customFilterId(type.slug, field.key);
      if (seen.has(id)) continue;
      seen.add(id);
      discovered.push({
        id,
        fieldKey: field.key,
        contentTypeSlug: type.slug,
        contentTypeLabelEn: type.labelPluralEn,
        facetKey: field.key,
        labelEn: field.labelEn,
        labelAr: field.labelAr ?? field.labelEn,
        uiType: uiTypeForField(field),
        fieldType: field.type,
      });
    }
  }

  return discovered;
}
