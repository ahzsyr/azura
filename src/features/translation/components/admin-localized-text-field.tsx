"use client";

import { getLocalizedFormFieldName } from "@/features/translation/form-field-names";
import {
  resolveAdminFieldValue,
  resolveDefaultLocaleHint,
} from "@/features/translation/admin-field-value";
import { useAdminEditingLocale } from "@/features/translation/hooks/use-admin-editing-locale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type AdminLocalizedTextFieldProps = {
  /** Base field name without locale suffix, e.g. `title` → `titleEn` / `title_fr` */
  fieldKey: string;
  label: string;
  legacyEntity?: Record<string, unknown>;
  values?: Record<string, string>;
  multiline?: boolean;
  rows?: number;
  required?: boolean;
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (localeCode: string, value: string) => void;
};

export function AdminLocalizedTextField({
  fieldKey,
  label,
  legacyEntity,
  values = {},
  multiline = false,
  rows = 3,
  required = false,
  name,
  defaultValue,
  value,
  onChange,
}: AdminLocalizedTextFieldProps) {
  const { activeLocaleCode, defaultCode, isRtl } = useAdminEditingLocale();
  const inputName = name ?? getLocalizedFormFieldName(fieldKey, activeLocaleCode);

  const resolvedDefault =
    value ??
    defaultValue ??
    resolveAdminFieldValue(values, legacyEntity, fieldKey, activeLocaleCode, defaultCode);

  const defaultLocaleHint = resolveDefaultLocaleHint(values, legacyEntity, fieldKey, defaultCode);

  const handleChange = (next: string) => {
    onChange?.(activeLocaleCode, next);
  };

  const isControlled = value !== undefined;

  return (
    <div className="space-y-2">
      <Label htmlFor={inputName}>{label}</Label>
      {multiline ? (
        <Textarea
          id={inputName}
          name={isControlled ? undefined : inputName}
          defaultValue={isControlled ? undefined : resolvedDefault}
          value={isControlled ? value : undefined}
          rows={rows}
          dir={isRtl ? "rtl" : undefined}
          required={required && activeLocaleCode === defaultCode}
          onChange={(e) => handleChange(e.target.value)}
        />
      ) : (
        <Input
          id={inputName}
          name={isControlled ? undefined : inputName}
          defaultValue={isControlled ? undefined : resolvedDefault}
          value={isControlled ? value : undefined}
          dir={isRtl ? "rtl" : undefined}
          required={required && activeLocaleCode === defaultCode}
          onChange={(e) => handleChange(e.target.value)}
        />
      )}
      {activeLocaleCode !== defaultCode && defaultLocaleHint.trim() ? (
        <p className="text-xs text-muted-foreground">
          Live site fallback ({defaultCode}): {defaultLocaleHint.slice(0, 100)}
          {defaultLocaleHint.length > 100 ? "…" : ""}
        </p>
      ) : null}
    </div>
  );
}
