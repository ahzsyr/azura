"use client";

import { Languages } from "lucide-react";
import { useAdminEditingLocale } from "@/features/translation/hooks/use-admin-editing-locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function AdminLocaleSwitcher({ className }: { className?: string }) {
  const { locales, activeLocale, activeLocaleCode, setActiveLocaleCode, loading } =
    useAdminEditingLocale();

  if (loading) {
    return (
      <Badge variant="outline" className={cn("h-8 gap-1.5 font-normal", className)}>
        <Languages className="h-3.5 w-3.5 opacity-50" />
        <span className="text-xs text-muted-foreground">…</span>
      </Badge>
    );
  }

  if (locales.length <= 1) {
    const single = locales[0] ?? activeLocale;
    return (
      <Badge variant="outline" className={cn("h-8 gap-1.5 font-normal", className)}>
        <Languages className="h-3.5 w-3.5 text-muted-foreground" />
        {single.flag ? <span aria-hidden>{single.flag}</span> : null}
        <span className="text-xs">{single.label}</span>
      </Badge>
    );
  }

  return (
    <label className={cn("flex items-center gap-1.5", className)}>
      <Languages className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <select
        value={activeLocaleCode}
        onChange={(e) => setActiveLocaleCode(e.target.value)}
        aria-label="Editing language"
        className="h-8 min-w-[140px] rounded-md border bg-background px-2 text-xs shadow-sm"
      >
        {locales.map((locale) => (
          <option key={locale.code} value={locale.code}>
            {locale.flag ? `${locale.flag} ` : ""}
            {locale.label}
            {locale.isDefault ? " (default)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
