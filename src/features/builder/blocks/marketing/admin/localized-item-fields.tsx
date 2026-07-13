"use client";

import { useMemo } from "react";
import { useAdminEditingLocaleContextOptional } from "@/components/admin/admin-editing-locale-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_ADMIN_LOCALE, getContentFieldSuffix } from "@/i18n/locale-config";

type FieldDef = { key: string; label: string; multiline?: boolean };

type Props = {
  fields: FieldDef[];
  values: Record<string, string>;
  onChange: (patch: Record<string, string>) => void;
};

export function itemFieldPropKey(baseKey: string, localeCode: string): string {
  return `${baseKey}${getContentFieldSuffix(localeCode)}`;
}

/** Initialize only default-locale suffixed keys for repeatable block items. */
export function emptyLocalizedItemFields(
  baseKeys: string[],
  defaultLocaleCode = "en"
): Record<string, string> {
  const suffix = getContentFieldSuffix(defaultLocaleCode);
  const out: Record<string, string> = {};
  for (const key of baseKeys) {
    out[`${key}${suffix}`] = "";
  }
  return out;
}

export function readItemFieldValue(
  values: Record<string, string>,
  baseKey: string,
  localeCode: string
): string {
  const propKey = itemFieldPropKey(baseKey, localeCode);
  const val = values[propKey];
  if (typeof val === "string") return val;
  const modern = values[`${baseKey}_${localeCode}`];
  if (typeof modern === "string") return modern;
  const base = values[baseKey];
  if (typeof base === "string") return base;
  return "";
}

/** @internal exported for unit tests */
export const __test__ = { readItemFieldValue, itemFieldPropKey, emptyLocalizedItemFields };

export function LocalizedItemFields({ fields, values, onChange }: Props) {
  const adminLocale = useAdminEditingLocaleContextOptional();
  const activeCode = adminLocale?.activeLocaleCode ?? DEFAULT_ADMIN_LOCALE.code;
  const defaultCode = adminLocale?.defaultCode ?? DEFAULT_ADMIN_LOCALE.code;
  const activeLocale = adminLocale?.activeLocale ?? DEFAULT_ADMIN_LOCALE;
  const isDefault = activeCode === defaultCode;
  const isRtl = activeLocale.dir === "rtl";

  const englishFallbackByKey = useMemo(() => {
    const map: Record<string, string> = {};
    for (const { key } of fields) {
      map[key] = readItemFieldValue(values, key, defaultCode);
    }
    return map;
  }, [fields, values, defaultCode]);

  const fieldLabel = (label: string) =>
    isDefault ? label : `${label} (${activeLocale.label})`;

  const copyFromEnglish = (baseKey: string) => {
    const source = englishFallbackByKey[baseKey]?.trim();
    if (!source) return;
    onChange({ [itemFieldPropKey(baseKey, activeCode)]: source });
  };

  return (
    <div className="space-y-2">
      {fields.map(({ key, label, multiline }) => {
        const propKey = itemFieldPropKey(key, activeCode);
        const displayValue = readItemFieldValue(values, key, activeCode);
        const englishFallback = englishFallbackByKey[key] ?? "";
        const placeholder =
          !isDefault && !displayValue.trim() && englishFallback.trim()
            ? englishFallback
            : fieldLabel(label);

        return (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs text-muted-foreground">{fieldLabel(label)}</Label>
              {!isDefault && englishFallback.trim() ? (
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground underline shrink-0"
                  onClick={() => copyFromEnglish(key)}
                >
                  Copy from English
                </button>
              ) : null}
            </div>
            {multiline ? (
              <Textarea
                className="min-h-[60px] text-sm"
                dir={isRtl ? "rtl" : undefined}
                value={displayValue}
                placeholder={placeholder}
                onChange={(e) => onChange({ [propKey]: e.target.value })}
              />
            ) : (
              <Input
                className="h-8 text-sm"
                dir={isRtl ? "rtl" : undefined}
                value={displayValue}
                placeholder={placeholder}
                onChange={(e) => onChange({ [propKey]: e.target.value })}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
