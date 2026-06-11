"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Globe } from "lucide-react";
import {
  UniversalTranslationEditor,
  LocaleCompletionTabs,
} from "@/features/translation/components/universal-translation-editor";
import { TranslatableStringList } from "@/features/translation/components/translatable-string-list";
import {
  getEntityConfig,
  getTranslatableFields,
} from "@/features/translation/entity-registry";
import { useLocales } from "@/features/translation/hooks/use-locales";
import { useEntityTranslations } from "@/features/translation/hooks/use-entity-translations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface LocaleTabPanelProps {
  entityType: string;
  entityId: string;
  sourceData: Record<string, string>;
  excludeFields?: string[];
}

export function LocaleTabPanel({
  entityType,
  entityId,
  sourceData,
  excludeFields = [],
}: LocaleTabPanelProps) {
  const { locales, targetLocales, defaultCode, loading: localesLoading } = useLocales();
  const config = getEntityConfig(entityType);
  const { translations, hasAnyTranslation, loading: translationsLoading, setFieldValue } = useEntityTranslations(
    entityType,
    entityId
  );

  const fields = useMemo(() => {
    const all = getTranslatableFields(entityType).filter(
      (f) => !excludeFields.includes(f.field) && sourceData[f.field] !== undefined
    );
    if (all.length > 0) return all;
    return getTranslatableFields(entityType).filter((f) => !excludeFields.includes(f.field));
  }, [entityType, excludeFields, sourceData]);

  const [expanded, setExpanded] = useState(false);
  const [activeLocale, setActiveLocale] = useState("");

  useEffect(() => {
    if (hasAnyTranslation) setExpanded(true);
  }, [hasAnyTranslation]);

  useEffect(() => {
    if (targetLocales.length > 0 && !activeLocale) {
      setActiveLocale(targetLocales[0].code);
    }
  }, [targetLocales, activeLocale]);

  const completionByLocale = useMemo(() => {
    const result: Record<string, number> = {};
    for (const locale of targetLocales) {
      const translated = fields.filter((f) => {
        const val = translations[f.field]?.[locale.code]?.value;
        return val?.trim();
      }).length;
      result[locale.code] =
        fields.length > 0 ? Math.round((translated / fields.length) * 100) : 100;
    }
    return result;
  }, [fields, targetLocales, translations]);

  if (!config || targetLocales.length === 0) return null;

  const loading = localesLoading || translationsLoading;

  return (
    <Card className="border-dashed">
      <CardHeader
        className="cursor-pointer select-none py-4"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Translations
            </CardTitle>
            <CardDescription>
              Side-by-side editing — English source on the left, target locale on the right.
            </CardDescription>
          </div>
          <button type="button" className="text-muted-foreground mt-1" aria-label={expanded ? "Collapse" : "Expand"}>
            {expanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </button>
        </div>

        {!expanded && targetLocales.length > 0 ? (
          <div className="pt-2" onClick={(e) => e.stopPropagation()}>
            <LocaleCompletionTabs
              locales={locales}
              defaultLocaleCode={defaultCode}
              completionByLocale={completionByLocale}
              activeLocale={activeLocale}
              onLocaleChange={setActiveLocale}
            />
          </div>
        ) : null}
      </CardHeader>

      {expanded ? (
        <CardContent className={cn("space-y-6 pt-0", loading && "opacity-60 pointer-events-none")}>
          <LocaleCompletionTabs
            locales={locales}
            defaultLocaleCode={defaultCode}
            completionByLocale={completionByLocale}
            activeLocale={activeLocale}
            onLocaleChange={setActiveLocale}
          />

          {fields.map((fieldDef) => {
            const englishValue = sourceData[fieldDef.field] ?? "";

            if (fieldDef.type === "stringList") {
              return (
                <TranslatableStringList
                  key={fieldDef.field}
                  entityType={entityType}
                  entityId={entityId}
                  field={fieldDef.field}
                  label={fieldDef.label}
                  englishItems={parseStringListValue(englishValue)}
                  activeLocale={activeLocale}
                  locales={locales}
                  defaultLocaleCode={defaultCode}
                  translationValue={translations[fieldDef.field]?.[activeLocale]?.value}
                  onTranslationSaved={(value) =>
                    setFieldValue(fieldDef.field, activeLocale, value, "PUBLISHED")
                  }
                />
              );
            }

            return (
              <UniversalTranslationEditor
                key={fieldDef.field}
                entityType={entityType}
                entityId={entityId}
                field={fieldDef.field}
                englishValue={englishValue}
                label={fieldDef.label}
                multiline={fieldDef.type === "textarea" || fieldDef.type === "richtext"}
                richText={fieldDef.type === "richtext"}
                activeLocale={activeLocale}
                defaultLocaleCode={defaultCode}
                translationValue={translations[fieldDef.field]?.[activeLocale]?.value}
                onTranslationSaved={(value) =>
                  setFieldValue(fieldDef.field, activeLocale, value, "PUBLISHED")
                }
              />
            );
          })}
        </CardContent>
      ) : null}
    </Card>
  );
}

function parseStringListValue(value: string): string[] {
  if (!value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    /* fall through */
  }
  return value.split("\n").map((s) => s.trim()).filter(Boolean);
}
