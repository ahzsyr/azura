"use client";

import { useMemo } from "react";
import { getContentFieldSuffix } from "@/i18n/locale-config";
import { useAdminEditingLocale } from "@/features/translation/hooks/use-admin-editing-locale";
import { getLegacyDefault } from "./localized-fields";
import { AdminLocalizedTextField } from "./admin-localized-text-field";

type Props = {
  fieldKey: string;
  label: string;
  legacyEntity?: Record<string, unknown>;
  multiline?: boolean;
  rows?: number;
  required?: boolean;
};

/** Uncontrolled form field: visible for active admin locale, hidden inputs preserve other locales. */
export function AdminLocalizedFormField({
  fieldKey,
  label,
  legacyEntity,
  multiline,
  rows,
  required,
}: Props) {
  const { activeLocaleCode, locales, defaultCode } = useAdminEditingLocale();

  const hiddenLocales = useMemo(
    () => locales.filter((l) => l.code !== activeLocaleCode),
    [locales, activeLocaleCode]
  );

  return (
    <>
      <AdminLocalizedTextField
        fieldKey={fieldKey}
        label={label}
        legacyEntity={legacyEntity}
        multiline={multiline}
        rows={rows}
        required={required}
      />
      {hiddenLocales.map((locale) => {
        const suffix = getContentFieldSuffix(locale.code);
        const name =
          suffix === "En" || suffix === "Ar"
            ? `${fieldKey}${suffix}`
            : `${fieldKey}_${locale.code}`;
        const value = getLegacyDefault(legacyEntity, fieldKey, locale.code);
        return <input key={name} type="hidden" name={name} defaultValue={value} readOnly />;
      })}
    </>
  );
}
