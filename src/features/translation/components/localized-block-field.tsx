"use client";

import type { PublicLocale } from "@/i18n/locale-config";
import { useAdminEditingLocaleContextOptional } from "@/components/admin/admin-editing-locale-provider";
import {
  resolveAdminFieldValue,
  resolveDefaultLocaleHint,
  readLegacyFieldForLocale,
} from "@/features/translation/admin-field-value";
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

function resolveDisplayValue(
  values: Record<string, LocalizedBlockFieldValue>,
  legacyProps: Record<string, unknown> | undefined,
  field: string,
  localeCode: string,
  defaultLocaleCode: string
): string {
  return resolveAdminFieldValue(values, legacyProps, field, localeCode, defaultLocaleCode);
}

/** @internal exported for unit tests */
export const __test__ = { resolveDisplayValue, readLegacyFieldForLocale };

function BlockLocaleInput({
  label,
  field,
  locale,
  defaultLocaleCode,
  values,
  legacyProps,
  multiline,
  rows,
  onChange,
  onDuplicateFromDefault,
}: {
  label: string;
  field: string;
  locale: PublicLocale;
  defaultLocaleCode: string;
  values: Record<string, LocalizedBlockFieldValue>;
  legacyProps?: Record<string, unknown>;
  multiline: boolean;
  rows: number;
  onChange: (localeCode: string, value: string) => void;
  onDuplicateFromDefault?: (targetCode: string) => void;
}) {
  const displayValue = resolveDisplayValue(
    values,
    legacyProps,
    field,
    locale.code,
    defaultLocaleCode
  );
  const defaultLocaleHint = resolveDefaultLocaleHint(values, legacyProps, field, defaultLocaleCode);
  const placeholder = `${label} (${locale.label})`;
  const isRtl = locale.dir === "rtl";
  const status = values[locale.code]?.status;
  const isMissing = !displayValue.trim();

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-end gap-2">
        {status ? (
          <TranslationStatusBadge status={status} />
        ) : isMissing && locale.code !== defaultLocaleCode ? (
          <TranslationStatusBadge status="missing" />
        ) : null}
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
          placeholder={placeholder}
          onChange={(e) => onChange(locale.code, e.target.value)}
        />
      ) : (
        <Input
          value={displayValue}
          dir={isRtl ? "rtl" : undefined}
          placeholder={placeholder}
          onChange={(e) => onChange(locale.code, e.target.value)}
        />
      )}
      {locale.code !== defaultLocaleCode && defaultLocaleHint.trim() ? (
        <p className="text-xs text-muted-foreground">
          Live site fallback ({defaultLocaleCode}): {defaultLocaleHint.slice(0, 80)}
          {defaultLocaleHint.length > 80 ? "…" : ""}
        </p>
      ) : null}
    </div>
  );
}

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
  const adminLocale = useAdminEditingLocaleContextOptional();
  const activeCode = adminLocale?.activeLocaleCode ?? defaultLocaleCode;
  const activeLocale =
    locales.find((l) => l.code === activeCode) ??
    locales.find((l) => l.code === defaultLocaleCode) ??
    locales[0];

  if (adminLocale && activeLocale) {
    return (
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <BlockLocaleInput
          label={label}
          field={field}
          locale={activeLocale}
          defaultLocaleCode={defaultLocaleCode}
          values={values}
          legacyProps={legacyProps}
          multiline={multiline}
          rows={rows}
          onChange={onChange}
          onDuplicateFromDefault={onDuplicateFromDefault}
        />
      </div>
    );
  }

  const defaultLocale = locales.find((l) => l.code === defaultLocaleCode) ?? locales[0];

  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Tabs defaultValue={defaultLocale?.code ?? locales[0]?.code} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          {locales.map((locale) => {
            const val = resolveDisplayValue(
              values,
              legacyProps,
              field,
              locale.code,
              defaultLocaleCode
            );
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

        {locales.map((locale) => (
          <TabsContent key={locale.code} value={locale.code} className="space-y-1 mt-2">
            <BlockLocaleInput
              label={label}
              field={field}
              locale={locale}
              defaultLocaleCode={defaultLocaleCode}
              values={values}
              legacyProps={legacyProps}
              multiline={multiline}
              rows={rows}
              onChange={onChange}
              onDuplicateFromDefault={onDuplicateFromDefault}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
