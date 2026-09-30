import type { EntityProperties, GraphEntity, PropertyMeta } from "../types";
import { nowIso } from "../entity-graph/factory";

/**
 * Multi-language entity support: translations are localized views of the same entity.
 * Global public IDs remain stable across locales.
 */
export function upsertLocaleView(
  entity: GraphEntity,
  locale: string,
  properties: EntityProperties,
): GraphEntity {
  return {
    ...entity,
    localeViews: {
      ...(entity.localeViews ?? {}),
      [locale]: {
        ...(entity.localeViews?.[locale] ?? {}),
        ...properties,
      },
    },
    updatedAt: nowIso(),
  };
}

export function readLocalizedProperty<T = unknown>(
  entity: GraphEntity,
  key: string,
  locale?: string,
  fallbackLocales: string[] = ["en"],
): T | undefined {
  const locales = locale ? [locale, ...fallbackLocales] : fallbackLocales;
  for (const code of locales) {
    const view = entity.localeViews?.[code]?.[key];
    if (view && typeof view === "object" && "value" in view) {
      return (view as PropertyMeta<T>).value;
    }
  }
  const base = entity.properties[key];
  if (base && typeof base === "object" && "value" in base) {
    return (base as PropertyMeta<T>).value;
  }
  return undefined;
}

export function listEntityLocales(entity: GraphEntity): string[] {
  return Object.keys(entity.localeViews ?? {});
}
