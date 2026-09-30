"use client";

import { ENTITY_REGISTRY } from "@/features/translation/entity-registry";
import { LocalizedBlockField } from "@/features/translation/components/localized-block-field";
import { useWorkspaceTranslations } from "@/features/translation/workspace-translation-context";
import type { TranslatableEntityType } from "@/features/translation/types";

type Props = {
  entityType: TranslatableEntityType;
  entityId: string;
  field: string;
  label?: string;
  legacyEntity?: Record<string, unknown>;
  multiline?: boolean;
  rows?: number;
  /** Sync default-locale value into workspace JSON */
  onDefaultLocaleChange?: (value: string) => void;
};

export function WorkspaceLocalizedField({
  entityType,
  entityId,
  field,
  label,
  legacyEntity,
  multiline,
  rows,
  onDefaultLocaleChange,
}: Props) {
  const ctx = useWorkspaceTranslations();
  const fieldDef = ENTITY_REGISTRY[entityType]?.fields.find((f) => f.field === field);
  const displayLabel = label ?? fieldDef?.label ?? field;
  const values = ctx.getFieldValues(entityType, entityId, field);
  const isMultiline =
    multiline ?? (fieldDef?.type === "textarea" || fieldDef?.type === "richtext");

  return (
    <LocalizedBlockField
      label={displayLabel}
      field={field}
      locales={ctx.locales}
      defaultLocaleCode={ctx.defaultLocaleCode}
      values={values}
      legacyProps={legacyEntity}
      multiline={isMultiline}
      rows={rows ?? (fieldDef?.type === "richtext" ? 8 : 4)}
      onChange={(localeCode, value) => {
        ctx.setFieldValue(entityType, entityId, field, localeCode, value);
        if (localeCode === ctx.defaultLocaleCode) {
          onDefaultLocaleChange?.(value);
        }
      }}
      onDuplicateFromDefault={(targetCode) =>
        ctx.duplicateFromDefault(entityType, entityId, field, targetCode)
      }
    />
  );
}
