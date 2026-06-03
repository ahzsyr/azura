"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { upsertLocalizedSlugAction } from "@/features/translation/actions";
import { useLocales } from "@/features/translation/hooks/use-locales";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Props = {
  entityType: string;
  entityId: string;
  defaultSlug: string;
  pathPrefix: string;
};

export function LocalizedSlugEditor({ entityType, entityId, defaultSlug, pathPrefix }: Props) {
  const { targetLocales, loading } = useLocales();
  const [values, setValues] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const localeCodes = useMemo(
    () => targetLocales.map((locale) => locale.code).join(","),
    [targetLocales]
  );

  useEffect(() => {
    setValues((prev) => {
      const codes = localeCodes ? localeCodes.split(",") : [];
      const next: Record<string, string> = {};
      let changed = codes.length !== Object.keys(prev).length;

      for (const code of codes) {
        const value = prev[code] ?? defaultSlug;
        next[code] = value;
        if (prev[code] !== value) changed = true;
      }

      return changed ? next : prev;
    });
  }, [defaultSlug, localeCodes]);

  if (loading || targetLocales.length === 0) return null;

  const saveSlug = (languageCode: string) => {
    const slug = values[languageCode]?.trim();
    if (!slug) return;
    startTransition(async () => {
      await upsertLocalizedSlugAction(entityType, entityId, languageCode, slug);
    });
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="py-4">
        <CardTitle className="text-base">Localized URLs</CardTitle>
        <CardDescription>
          Optional per-locale slugs. Leave blank to use the default English slug in all locales.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {targetLocales.map((locale) => (
          <div key={locale.code} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-1">
              <Label>
                {locale.label} ({locale.code})
              </Label>
              <Input
                value={values[locale.code] ?? ""}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [locale.code]: e.target.value }))
                }
                placeholder={defaultSlug}
                dir={locale.dir}
              />
              <p className="text-xs text-muted-foreground">
                /{locale.urlPrefix}
                {pathPrefix}/{values[locale.code] || defaultSlug || "…"}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending || !values[locale.code]?.trim()}
              onClick={() => saveSlug(locale.code)}
            >
              Save
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
