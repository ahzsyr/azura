"use client";

import { useAdminEditingLocaleContextOptional } from "@/components/admin/admin-editing-locale-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_ADMIN_LOCALE } from "@/i18n/locale-config";
import {
  patchLocalizedField,
  readLocalizedField,
  readLocalizedFieldForEdit,
} from "../lib/localized-fields";

type Props = {
  label: string;
  baseKey: string;
  values: Record<string, unknown>;
  onChange: (patch: Record<string, string>) => void;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
};

export function LocalizedHtmlInput({
  label,
  baseKey,
  values,
  onChange,
  multiline = false,
  placeholder,
  className,
  inputClassName,
}: Props) {
  const adminLocale = useAdminEditingLocaleContextOptional();
  const activeCode = adminLocale?.activeLocaleCode ?? DEFAULT_ADMIN_LOCALE.code;
  const defaultCode = adminLocale?.defaultCode ?? DEFAULT_ADMIN_LOCALE.code;
  const activeLocale = adminLocale?.activeLocale ?? DEFAULT_ADMIN_LOCALE;
  const defaultLocale = adminLocale?.locales.find((l) => l.code === defaultCode) ?? DEFAULT_ADMIN_LOCALE;
  const isDefault = activeCode === defaultCode;
  const isRtl = activeLocale.dir === "rtl";

  const currentValue = readLocalizedFieldForEdit(values, baseKey, activeCode, defaultCode);
  const defaultValue = readLocalizedField(values, baseKey, defaultCode);
  const fieldLabel = isDefault ? label : `${label} (${activeLocale.label})`;
  const displayPlaceholder =
    !isDefault && !currentValue.trim() && defaultValue.trim()
      ? `Shows default on site if empty: ${defaultValue.slice(0, 60)}${defaultValue.length > 60 ? "…" : ""}`
      : (placeholder ?? fieldLabel);

  const copyFromDefault = () => {
    const source = defaultValue.trim();
    if (!source) return;
    onChange(patchLocalizedField(baseKey, source, activeCode, defaultCode));
  };

  const handleChange = (value: string) => {
    onChange(patchLocalizedField(baseKey, value, activeCode, defaultCode));
  };

  return (
    <div className={className} dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">{fieldLabel}</Label>
        {!isDefault && defaultValue.trim() ? (
          <button
            type="button"
            className="text-[10px] text-muted-foreground hover:text-foreground underline shrink-0"
            onClick={copyFromDefault}
          >
            Copy from {defaultLocale.label}
          </button>
        ) : null}
      </div>
      {multiline ? (
        <textarea
          className={
            inputClassName ??
            "mt-1 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm text-start focus:outline-none focus:ring-1 focus:ring-ring min-h-[72px]"
          }
          dir={isRtl ? "rtl" : "ltr"}
          value={currentValue}
          placeholder={displayPlaceholder}
          onChange={(e) => handleChange(e.target.value)}
        />
      ) : (
        <Input
          className={inputClassName ?? "mt-1 h-8 text-xs text-start"}
          dir={isRtl ? "rtl" : "ltr"}
          value={currentValue}
          placeholder={displayPlaceholder}
          onChange={(e) => handleChange(e.target.value)}
        />
      )}
    </div>
  );
}
