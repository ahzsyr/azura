"use client";

import type { PublicLocale } from "@/i18n/locale-config";
import { getContentFieldSuffix } from "@/i18n/locale-config";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TranslationStatusBadge } from "./translation-status-badge";
import type { TranslationStatus } from "@prisma/client";

export type LocalizedBlockFieldValue = {
  value: string;
  status?: TranslationStatus;
};

export type LocalizedBlockFieldProps = {
  label: string;
  field: string;
  locales: PublicLocale[];
  defaultLocaleCode: string;
  values: Record<string, LocalizedBlockFieldValue>;
  legacyProps?: Record<string, unknown>;
  multiline?: boolean;
  rows?: number;
  onChange: (localeCode: string, value: string) => void;
  onDuplicateFromDefault?: (targetCode: string) => void;
};

function getLegacyDefault(
  legacyProps: Record<string, unknown> | undefined,
  fieldKey: string,
  localeCode: string
): string {
  if (!legacyProps) return "";
  const suffix = getContentFieldSuffix(localeCode);
  const val = legacyProps[`${fieldKey}${suffix}`];
  if (typeof val === "string" && val) return val;
  const en = legacyProps[`${fieldKey}En`];
  return typeof en === "string" ? en : "";
}

function resolveDisplayValue(
  values: Record<string, LocalizedBlockFieldValue>,
  legacyProps: Record<string, unknown> | undefined,
  field: string,
  localeCode: string
): string {
  const translated = values[localeCode]?.value;
  if (typeof translated === "string" && translated.trim()) return translated;
  return getLegacyDefault(legacyProps, field, localeCode);
}

/** @internal exported for unit tests */
export const __test__ = { resolveDisplayValue, getLegacyDefault };

export function LocalizedBlockField({
  label,
  field,
  locales,
  defaultLocaleCode,
  values,
  legacyProps,
  multiline = false,
  rows = 4,
  onChange,
  onDuplicateFromDefault,
}: LocalizedBlockFieldProps) {
  const defaultLocale = locales.find((l) => l.code === defaultLocaleCode) ?? locales[0];

  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Tabs defaultValue={defaultLocale?.code ?? locales[0]?.code} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          {locales.map((locale) => {
            const val = resolveDisplayValue(values, legacyProps, field, locale.code);
            const status = values[locale.code]?.status;
            const isMissing = !val.trim();
            return (
              <TabsTrigger key={locale.code} value={locale.code} className="gap-1.5 text-xs">
                <span>{locale.flag}</span>
                <span>{locale.label}</span>
                {status ? (
                  <TranslationStatusBadge status={status} />
                ) : isMissing ? (
                  <TranslationStatusBadge status="missing" />
                ) : null}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {locales.map((locale) => {
          const displayValue = resolveDisplayValue(values, legacyProps, field, locale.code);
          const isRtl = locale.dir === "rtl";

          return (
            <TabsContent key={locale.code} value={locale.code} className="space-y-1 mt-2">
              <div className="flex items-center justify-end">
                {locale.code !== defaultLocaleCode && onDuplicateFromDefault ? (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                    onClick={() => onDuplicateFromDefault(locale.code)}
                  >
                    Copy from English
                  </button>
                ) : null}
              </div>
              {multiline ? (
                <Textarea
                  value={displayValue}
                  rows={rows}
                  dir={isRtl ? "rtl" : undefined}
                  placeholder={`${label} (${locale.label})`}
                  onChange={(e) => onChange(locale.code, e.target.value)}
                />
              ) : (
                <Input
                  value={displayValue}
                  dir={isRtl ? "rtl" : undefined}
                  placeholder={`${label} (${locale.label})`}
                  onChange={(e) => onChange(locale.code, e.target.value)}
                />
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
