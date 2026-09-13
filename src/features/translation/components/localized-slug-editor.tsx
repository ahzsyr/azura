"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { upsertLocalizedSlugAction } from "@/features/translation/actions";
import { useAdminEditingLocale } from "@/features/translation/hooks/use-admin-editing-locale";
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
  const { targetLocales, defaultCode, loading: localesLoading } = useLocales();
  const { activeLocaleCode, activeLocale, defaultCode: adminDefaultCode } = useAdminEditingLocale();
  const [values, setValues] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const editingDefault = activeLocaleCode === (adminDefaultCode || defaultCode);

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
        const value = prev[code] ?? "";
        next[code] = value;
        if (prev[code] !== value) changed = true;
      }

      return changed ? next : prev;
    });
  }, [defaultSlug, localeCodes]);

  if (localesLoading) return null;

  if (editingDefault) {
    return (
      <Card className="border-dashed">
        <CardHeader className="py-4">
          <CardTitle className="text-base">URL slug</CardTitle>
          <CardDescription>
            Default slug for all locales unless you set a localized slug below (switch language in
            the top bar).
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            /{activeLocale.urlPrefix}
            {pathPrefix}/{defaultSlug || "…"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const locale = targetLocales.find((l) => l.code === activeLocaleCode);
  if (!locale) return null;

  const saveSlug = () => {
    const slug = values[locale.code]?.trim();
    if (!slug) return;
    startTransition(async () => {
      await upsertLocalizedSlugAction(entityType, entityId, locale.code, slug);
    });
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="py-4">
        <CardTitle className="text-base">Localized URL ({locale.label})</CardTitle>
        <CardDescription>
          Optional slug for this language. Leave blank to use the English slug on the live site.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-1">
            <Label>{locale.label}</Label>
            <Input
              value={values[locale.code] ?? ""}
              onChange={(e) => setValues((prev) => ({ ...prev, [locale.code]: e.target.value }))}
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
            onClick={saveSlug}
          >
            Save slug
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
