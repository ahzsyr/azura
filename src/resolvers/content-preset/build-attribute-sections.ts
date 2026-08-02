import type { ContentFieldDefinition } from "@/features/content/types";
import { getLocalizedField, formatPrice } from "@/lib/utils";
import type { EntityTranslation } from "@prisma/client";
import type { PublicLocale } from "@/i18n/locale-config";
import type { ContentPresetAttributeSection } from "@/view-models/content-preset-detail";

const GROUP_ORDER = ["pricing", "location", "details", "display", "cta", "general"];

function fieldLabel(
  field: ContentFieldDefinition,
  locale: string,
  fieldOpts: { translations?: EntityTranslation[]; enabledLocales?: PublicLocale[]; defaultCode?: string },
): string {
  return getLocalizedField(field as Record<string, unknown>, "label", locale, fieldOpts);
}

function attrValue(
  field: ContentFieldDefinition,
  attributes: Record<string, unknown>,
  locale: string,
  fieldOpts: { translations?: EntityTranslation[]; enabledLocales?: PublicLocale[]; defaultCode?: string },
): unknown {
  if (field.localized) {
    return getLocalizedField(attributes, field.key, locale, fieldOpts);
  }
  return attributes[field.key];
}

function formatValueAsString(
  field: ContentFieldDefinition,
  value: unknown,
  locale: string,
  attributes: Record<string, unknown>,
): string | null {
  if (value == null || value === "") return null;

  switch (field.type) {
    case "price": {
      const currency = (attributes.currency as string) ?? "USD";
      return formatPrice(Number(value), currency, locale);
    }
    case "boolean":
      return value ? "Yes" : "No";
    case "json": {
      if (Array.isArray(value)) {
        if (value.length === 0) return null;
        if (typeof value[0] === "string") return value.join(", ");
        return JSON.stringify(value);
      }
      return JSON.stringify(value);
    }
    default:
      return String(value);
  }
}

export function buildContentPresetAttributeSections(input: {
  locale: string;
  fields: ContentFieldDefinition[];
  attributes: Record<string, unknown>;
  itemTranslations: EntityTranslation[];
  enabledLocales: PublicLocale[];
  defaultCode: string;
}): ContentPresetAttributeSection[] {
  const fieldOpts = {
    translations: input.itemTranslations,
    enabledLocales: input.enabledLocales,
    defaultCode: input.defaultCode,
  };

  const groups = new Map<string, ContentFieldDefinition[]>();
  for (const field of input.fields) {
    const group = field.group ?? "general";
    const list = groups.get(group) ?? [];
    list.push(field);
    groups.set(group, list);
  }

  const orderedGroups = [...groups.entries()].sort(([a], [b]) => {
    const ai = GROUP_ORDER.indexOf(a);
    const bi = GROUP_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return orderedGroups
    .map(([group, groupFields]) => {
      const rows = groupFields
        .map((field) => {
          const value = attrValue(field, input.attributes, input.locale, fieldOpts);
          const formatted = formatValueAsString(field, value, input.locale, input.attributes);
          if (!formatted) return null;
          return {
            key: field.key,
            label: fieldLabel(field, input.locale, fieldOpts),
            value: formatted,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row != null);

      if (rows.length === 0) return null;

      const title =
        group === "general"
          ? "Details"
          : group.charAt(0).toUpperCase() + group.slice(1).replace(/-/g, " ");

      return { title, rows };
    })
    .filter((section): section is ContentPresetAttributeSection => section != null);
}
