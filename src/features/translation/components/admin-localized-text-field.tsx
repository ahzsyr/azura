"use client";

import { getContentFieldSuffix } from "@/i18n/locale-config";
import { useAdminEditingLocale } from "@/features/translation/hooks/use-admin-editing-locale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getLegacyDefault } from "./localized-fields";

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
  const suffix = getContentFieldSuffix(activeLocaleCode);
  const inputName =
    name ??
    (suffix === "En" || suffix === "Ar" ? `${fieldKey}${suffix}` : `${fieldKey}_${activeLocaleCode}`);

  const resolvedDefault =
    value ??
    defaultValue ??
    values[activeLocaleCode] ??
    getLegacyDefault(legacyEntity, fieldKey, activeLocaleCode);

  const englishFallback = getLegacyDefault(legacyEntity, fieldKey, defaultCode);
  const placeholder =
    activeLocaleCode !== defaultCode && !String(resolvedDefault).trim() && englishFallback.trim()
      ? englishFallback
      : undefined;

  const handleChange = (next: string) => {
    onChange?.(activeLocaleCode, next);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={inputName}>{label}</Label>
      {multiline ? (
        <Textarea
          id={inputName}
          name={name}
          defaultValue={value === undefined ? resolvedDefault : undefined}
          value={value}
          rows={rows}
          dir={isRtl ? "rtl" : undefined}
          placeholder={placeholder}
          required={required && activeLocaleCode === defaultCode}
          onChange={(e) => handleChange(e.target.value)}
        />
      ) : (
        <Input
          id={inputName}
          name={name}
          defaultValue={value === undefined ? resolvedDefault : undefined}
          value={value}
          dir={isRtl ? "rtl" : undefined}
          placeholder={placeholder}
          required={required && activeLocaleCode === defaultCode}
          onChange={(e) => handleChange(e.target.value)}
        />
      )}
      {activeLocaleCode !== defaultCode && englishFallback.trim() ? (
        <p className="text-xs text-muted-foreground">
          Live site fallback (English): {englishFallback.slice(0, 100)}
          {englishFallback.length > 100 ? "…" : ""}
        </p>
      ) : null}
    </div>
  );
}
