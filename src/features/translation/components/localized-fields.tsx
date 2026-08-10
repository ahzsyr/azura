"use client";

import type { PublicLocale } from "@/i18n/locale-config";
import { useAdminEditingLocaleContextOptional } from "@/components/admin/admin-editing-locale-provider";
import {
  resolveAdminFieldValue,
  resolveDefaultLocaleHint,
  readLegacyFieldForLocale,
} from "@/features/translation/admin-field-value";
import { getLocalizedFormFieldName } from "@/features/translation/form-field-names";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TranslationStatusBadge } from "./translation-status-badge";
import type { EntityFieldDef } from "../entity-registry";
import type { TranslationStatus } from "@prisma/client";

const getFieldInputName = getLocalizedFormFieldName;

export type LocalizedFieldValue = {
  value: string;
  status?: TranslationStatus;
};

export type LocalizedFieldsProps = {
  field: EntityFieldDef;
  locales: PublicLocale[];
  defaultLocaleCode: string;
  values: Record<string, LocalizedFieldValue>;
  /** Legacy entity for reading En/Ar column defaults */
  legacyEntity?: Record<string, unknown>;
  namePrefix?: string;
  onDuplicateFromDefault?: (targetCode: string) => void;
  /** When false, inputs omit `name` (parent submits via hidden fields). */
  registerFieldNames?: boolean;
  onFieldChange?: (localeCode: string, value: string) => void;
};

/** @deprecated Use readLegacyFieldForLocale — kept for tests and gradual migration */
export function getLegacyDefault(
  legacyEntity: Record<string, unknown> | undefined,
  fieldKey: string,
  localeCode: string
): string {
  return readLegacyFieldForLocale(legacyEntity, fieldKey, localeCode);
}

function resolveFieldValue(
  values: Record<string, LocalizedFieldValue>,
  legacyEntity: Record<string, unknown> | undefined,
  fieldKey: string,
  localeCode: string,
  defaultLocaleCode: string
): string {
  return resolveAdminFieldValue(values, legacyEntity, fieldKey, localeCode, defaultLocaleCode);
}

function EnglishPlaceholderHint({
  activeCode,
  defaultCode,
  englishFallback,
}: {
  activeCode: string;
  defaultCode: string;
  englishFallback: string;
}) {
  if (activeCode === defaultCode || !englishFallback.trim()) return null;
  return (
    <p className="text-xs text-muted-foreground">
      Empty on the live site shows English: &ldquo;{englishFallback.slice(0, 80)}
      {englishFallback.length > 80 ? "…" : ""}&rdquo;
    </p>
  );
}

function SingleLocaleFieldInput({
  field,
  locale,
  defaultLocaleCode,
  values,
  legacyEntity,
  registerFieldNames,
  onFieldChange,
  onDuplicateFromDefault,
}: {
  field: EntityFieldDef;
  locale: PublicLocale;
  defaultLocaleCode: string;
  values: Record<string, LocalizedFieldValue>;
  legacyEntity?: Record<string, unknown>;
  registerFieldNames: boolean;
  onFieldChange?: (localeCode: string, value: string) => void;
  onDuplicateFromDefault?: (targetCode: string) => void;
}) {
  const inputName = getFieldInputName(field.field, locale.code);
  const statusName = `${field.field}_${locale.code}_status`;
  const displayValue = resolveFieldValue(
    values,
    legacyEntity,
    field.field,
    locale.code,
    defaultLocaleCode
  );
  const defaultLocaleHint = resolveDefaultLocaleHint(
    values,
    legacyEntity,
    field.field,
    defaultLocaleCode
  );
  const isRtl = locale.dir === "rtl";
  const status = values[locale.code]?.status;
  const isMissing = !displayValue.trim();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={inputName}>{field.label}</Label>
        <div className="flex items-center gap-2">
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
      </div>

      {field.type === "textarea" || field.type === "richtext" ? (
        <Textarea
          id={inputName}
          name={registerFieldNames ? inputName : undefined}
          defaultValue={displayValue}
          rows={field.type === "richtext" ? 8 : 4}
          dir={isRtl ? "rtl" : undefined}
          required={field.required && locale.code === defaultLocaleCode}
          onChange={(e) => onFieldChange?.(locale.code, e.target.value)}
        />
      ) : (
        <Input
          id={inputName}
          name={registerFieldNames ? inputName : undefined}
          defaultValue={displayValue}
          dir={isRtl ? "rtl" : undefined}
          required={field.required && locale.code === defaultLocaleCode}
          onChange={(e) => onFieldChange?.(locale.code, e.target.value)}
        />
      )}

      <EnglishPlaceholderHint
        activeCode={locale.code}
        defaultCode={defaultLocaleCode}
        englishFallback={defaultLocaleHint}
      />

      {registerFieldNames ? (
        <input
          type="hidden"
          name={statusName}
          defaultValue={values[locale.code]?.status ?? "PUBLISHED"}
        />
      ) : null}
    </div>
  );
}

export function LocalizedFields({
  field,
  locales,
  defaultLocaleCode,
  values,
  legacyEntity,
  onDuplicateFromDefault,
  registerFieldNames = true,
  onFieldChange,
}: LocalizedFieldsProps) {
  const adminLocale = useAdminEditingLocaleContextOptional();
  const activeCode = adminLocale?.activeLocaleCode ?? defaultLocaleCode;
  const activeLocale =
    locales.find((l) => l.code === activeCode) ??
    locales.find((l) => l.code === defaultLocaleCode) ??
    locales[0];

  if (adminLocale && activeLocale) {
    return (
      <div className="w-full space-y-2">
        <SingleLocaleFieldInput
          field={field}
          locale={activeLocale}
          defaultLocaleCode={defaultLocaleCode}
          values={values}
          legacyEntity={legacyEntity}
          registerFieldNames={registerFieldNames}
          onFieldChange={onFieldChange}
          onDuplicateFromDefault={onDuplicateFromDefault}
        />
        {registerFieldNames
          ? locales
              .filter((l) => l.code !== activeLocale.code)
              .map((locale) => {
                const inputName = getFieldInputName(field.field, locale.code);
                const val = resolveFieldValue(
                  values,
                  legacyEntity,
                  field.field,
                  locale.code,
                  defaultLocaleCode
                );
                const statusName = `${field.field}_${locale.code}_status`;
                return (
                  <div key={locale.code} className="hidden" aria-hidden>
                    <input type="hidden" name={inputName} defaultValue={val} readOnly />
                    <input
                      type="hidden"
                      name={statusName}
                      defaultValue={values[locale.code]?.status ?? "PUBLISHED"}
                      readOnly
                    />
                  </div>
                );
              })
          : null}
      </div>
    );
  }

  const defaultLocale = locales.find((l) => l.code === defaultLocaleCode) ?? locales[0];

  return (
    <Tabs defaultValue={defaultLocale?.code ?? locales[0]?.code} className="w-full">
      <TabsList className="flex flex-wrap h-auto gap-1">
        {locales.map((locale) => {
          const val = resolveFieldValue(
            values,
            legacyEntity,
            field.field,
            locale.code,
            defaultLocaleCode
          );
          const status = values[locale.code]?.status;
          const isMissing = !val.trim();
          return (
            <TabsTrigger key={locale.code} value={locale.code} className="gap-1.5">
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
        <TabsContent key={locale.code} value={locale.code} className="space-y-2 mt-3">
          <SingleLocaleFieldInput
            field={field}
            locale={locale}
            defaultLocaleCode={defaultLocaleCode}
            values={values}
            legacyEntity={legacyEntity}
            registerFieldNames={registerFieldNames}
            onFieldChange={onFieldChange}
            onDuplicateFromDefault={onDuplicateFromDefault}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}

/** Parse form data with pattern `{field}_{localeCode}` into translation inputs */
export function parseLocalizedFormData(
  formData: FormData,
  entityType: string,
  entityId: string,
  fields: string[],
  localeCodes: string[]
) {
  const inputs: {
    entityType: string;
    entityId: string;
    field: string;
    localeCode: string;
    value: string;
    status: TranslationStatus;
  }[] = [];

  for (const field of fields) {
    for (const code of localeCodes) {
      const fieldName = `${field}_${code}`;
      const value = String(formData.get(fieldName) ?? "");
      const status = (formData.get(`${fieldName}_status`) as TranslationStatus) ?? "PUBLISHED";
      inputs.push({ entityType, entityId, field, localeCode: code, value, status });
    }
  }

  return inputs;
}
