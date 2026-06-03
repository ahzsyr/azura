"use client";

import type { PublicLocale } from "@/i18n/locale-config";
import { getContentFieldSuffix } from "@/i18n/locale-config";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TranslationStatusBadge } from "./translation-status-badge";
import type { EntityFieldDef } from "../entity-registry";
import type { TranslationStatus } from "@prisma/client";

function getFieldInputName(fieldKey: string, localeCode: string): string {
  const suffix = getContentFieldSuffix(localeCode);
  if (suffix === "En" || suffix === "Ar") {
    return `${fieldKey}${suffix}`;
  }
  return `${fieldKey}_${localeCode}`;
}

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

function getLegacyDefault(
  legacyEntity: Record<string, unknown> | undefined,
  fieldKey: string,
  localeCode: string
): string {
  if (!legacyEntity) return "";
  const suffix = getContentFieldSuffix(localeCode);
  const val = legacyEntity[`${fieldKey}${suffix}`];
  if (typeof val === "string" && val) return val;
  const en = legacyEntity[`${fieldKey}En`];
  return typeof en === "string" ? en : "";
}

export function LocalizedFields({
  field,
  locales,
  defaultLocaleCode,
  values,
  legacyEntity,
  namePrefix = "",
  onDuplicateFromDefault,
  registerFieldNames = true,
  onFieldChange,
}: LocalizedFieldsProps) {
  const defaultLocale = locales.find((l) => l.code === defaultLocaleCode) ?? locales[0];

  return (
    <Tabs defaultValue={defaultLocale?.code ?? locales[0]?.code} className="w-full">
      <TabsList className="flex flex-wrap h-auto gap-1">
        {locales.map((locale) => {
          const val = values[locale.code]?.value ?? getLegacyDefault(legacyEntity, field.field, locale.code);
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

      {locales.map((locale) => {
        const inputName = getFieldInputName(field.field, locale.code);
        const statusName = `${field.field}_${locale.code}_status`;
        const defaultValue =
          values[locale.code]?.value ?? getLegacyDefault(legacyEntity, field.field, locale.code);
        const isRtl = locale.dir === "rtl";

        return (
          <TabsContent key={locale.code} value={locale.code} className="space-y-2 mt-3">
            <div className="flex items-center justify-between">
              <Label htmlFor={inputName}>
                {field.label} ({locale.label})
              </Label>
              {locale.code !== defaultLocaleCode && onDuplicateFromDefault ? (
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                  onClick={() => onDuplicateFromDefault(locale.code)}
                >
                  Copy from default
                </button>
              ) : null}
            </div>

            {field.type === "textarea" || field.type === "richtext" ? (
              <Textarea
                id={inputName}
                name={registerFieldNames ? inputName : undefined}
                defaultValue={defaultValue}
                rows={field.type === "richtext" ? 8 : 4}
                dir={isRtl ? "rtl" : undefined}
                required={field.required && locale.code === defaultLocaleCode}
                onChange={(e) => onFieldChange?.(locale.code, e.target.value)}
              />
            ) : (
              <Input
                id={inputName}
                name={registerFieldNames ? inputName : undefined}
                defaultValue={defaultValue}
                dir={isRtl ? "rtl" : undefined}
                required={field.required && locale.code === defaultLocaleCode}
                onChange={(e) => onFieldChange?.(locale.code, e.target.value)}
              />
            )}

            {registerFieldNames ? (
              <input
                type="hidden"
                name={statusName}
                defaultValue={values[locale.code]?.status ?? "PUBLISHED"}
              />
            ) : null}
          </TabsContent>
        );
      })}
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
    languageCode: string;
    value: string;
    status: TranslationStatus;
  }[] = [];

  for (const field of fields) {
    for (const code of localeCodes) {
      const value = String(formData.get(`${field}_${code}`) ?? "");
      const status = (formData.get(`${field}_${code}_status`) as TranslationStatus) ?? "PUBLISHED";
      inputs.push({ entityType, entityId, field, languageCode: code, value, status });
    }
  }

  return inputs;
}
