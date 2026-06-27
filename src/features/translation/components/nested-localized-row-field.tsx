"use client";

import { getLocalizedFormFieldName } from "@/features/translation/form-field-names";
import { useAdminEditingLocale } from "@/features/translation/hooks/use-admin-editing-locale";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function getRowLocalizedValue(
  row: Record<string, unknown>,
  field: string,
  localeCode: string
): string {
  const key = getLocalizedFormFieldName(field, localeCode);
  const val = row[key];
  return typeof val === "string" ? val : "";
}

export function patchRowLocalizedValue(
  row: Record<string, unknown>,
  field: string,
  localeCode: string,
  value: string
): Record<string, unknown> {
  const key = getLocalizedFormFieldName(field, localeCode);
  return { ...row, [key]: value };
}

type Props = {
  row: Record<string, unknown>;
  field: string;
  label: string;
  onChange: (nextRow: Record<string, unknown>) => void;
  multiline?: boolean;
  rows?: number;
};

/** Edits one localized field on a JSON row using the active admin locale. */
export function NestedLocalizedRowInput({
  row,
  field,
  label,
  onChange,
  multiline = false,
  rows = 2,
}: Props) {
  const { activeLocaleCode, isRtl } = useAdminEditingLocale();
  const value = getRowLocalizedValue(row, field, activeLocaleCode);

  const handleChange = (next: string) => {
    onChange(patchRowLocalizedValue(row, field, activeLocaleCode, next));
  };

  return multiline ? (
    <Textarea
      aria-label={`${label} (${activeLocaleCode})`}
      placeholder={`${label} (${activeLocaleCode})`}
      value={value}
      rows={rows}
      dir={isRtl ? "rtl" : undefined}
      onChange={(e) => handleChange(e.target.value)}
    />
  ) : (
    <Input
      aria-label={`${label} (${activeLocaleCode})`}
      placeholder={`${label} (${activeLocaleCode})`}
      value={value}
      dir={isRtl ? "rtl" : undefined}
      onChange={(e) => handleChange(e.target.value)}
    />
  );
}
