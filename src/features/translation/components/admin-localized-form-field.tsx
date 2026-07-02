"use client";

import { useEffect, useState } from "react";
import { resolveAdminFieldValue } from "@/features/translation/admin-field-value";
import { getLocalizedFormFieldName } from "@/features/translation/form-field-names";
import { useAdminEditingLocale } from "@/features/translation/hooks/use-admin-editing-locale";
import { useEntityTranslations } from "@/features/translation/hooks/use-entity-translations";
import { AdminLocalizedTextField } from "./admin-localized-text-field";

type Props = {
  fieldKey: string;
  label: string;
  legacyEntity?: Record<string, unknown>;
  /** When set, loads and preserves EntityTranslation values for all locales */
  entityType?: string;
  entityId?: string;
  multiline?: boolean;
  rows?: number;
  required?: boolean;
};

/** Uncontrolled form field: visible for active admin locale, hidden inputs preserve other locales. */
export function AdminLocalizedFormField({
  fieldKey,
  label,
  legacyEntity,
  entityType,
  entityId,
  multiline,
  rows,
  required,
}: Props) {
  const { activeLocaleCode, locales, defaultCode } = useAdminEditingLocale();
  const { translations, loading, getFieldValue } = useEntityTranslations(
    entityType ?? "",
    entityId
  );

  const [localeValues, setLocaleValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (entityId && loading) return;
    const next: Record<string, string> = {};
    for (const locale of locales) {
      const fromDb = entityId ? getFieldValue(fieldKey, locale.code) : "";
      next[locale.code] =
        fromDb ||
        resolveAdminFieldValue(
          undefined,
          legacyEntity,
          fieldKey,
          locale.code,
          defaultCode
        );
    }
    setLocaleValues(next);
  }, [
    entityId,
    loading,
    locales,
    fieldKey,
    legacyEntity,
    defaultCode,
    getFieldValue,
    translations,
  ]);

  const handleChange = (localeCode: string, value: string) => {
    setLocaleValues((prev) => ({ ...prev, [localeCode]: value }));
  };

  return (
    <>
      <AdminLocalizedTextField
        fieldKey={fieldKey}
        label={label}
        legacyEntity={legacyEntity}
        values={localeValues}
        value={localeValues[activeLocaleCode] ?? ""}
        onChange={handleChange}
        multiline={multiline}
        rows={rows}
        required={required}
      />
      {locales.map((locale) => {
        const name = getLocalizedFormFieldName(fieldKey, locale.code);
        return (
          <input
            key={name}
            type="hidden"
            name={name}
            value={localeValues[locale.code] ?? ""}
            readOnly
          />
        );
      })}
    </>
  );
}
