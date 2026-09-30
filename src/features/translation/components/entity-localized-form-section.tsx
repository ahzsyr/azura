"use client";

import type { EntityTranslation } from "@prisma/client";
import type { PublicLocale } from "@/i18n/locale-config";
import { ENTITY_REGISTRY } from "@/features/translation/entity-registry";
import { translationsToFieldValues } from "@/features/translation/block-translation";
import type { TranslatableEntityType } from "@/features/translation/types";
import { LocalizedFields } from "./localized-fields";

type Props = {
  entityType: TranslatableEntityType;
  locales: PublicLocale[];
  translations?: EntityTranslation[];
  legacyEntity?: Record<string, unknown>;
  /** Subset of registry fields; defaults to all fields for the entity type */
  fields?: string[];
  className?: string;
};

export function EntityLocalizedFormSection({
  entityType,
  locales,
  translations = [],
  legacyEntity,
  fields,
  className,
}: Props) {
  const config = ENTITY_REGISTRY[entityType];
  if (!config) return null;

  const defaultLocale = locales.find((l) => l.isDefault) ?? locales[0];
  const fieldDefs = fields
    ? config.fields.filter((f) => fields.includes(f.field))
    : config.fields;

  return (
    <div className={className ?? "space-y-6"}>
      {fieldDefs.map((fieldDef) => (
        <LocalizedFields
          key={fieldDef.field}
          field={fieldDef}
          locales={locales}
          defaultLocaleCode={defaultLocale?.code ?? "en"}
          values={translationsToFieldValues(translations, fieldDef.field)}
          legacyEntity={legacyEntity}
        />
      ))}
    </div>
  );
}
