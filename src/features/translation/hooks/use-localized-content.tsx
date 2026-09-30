"use client";

import { useMemo } from "react";
import { resolvePrefixToCode } from "@/i18n/locale-config";
import { resolveTranslation, type TranslationContext } from "@/features/translation/translation-resolver";

export function useLocalizedContent(
  field: string,
  localePrefix: string,
  ctx: TranslationContext
): string {
  return useMemo(() => {
    const enabled = ctx.enabledLocales ?? [];
    const code = resolvePrefixToCode(localePrefix, enabled.length ? enabled : [{ code: localePrefix, urlPrefix: localePrefix, label: localePrefix, htmlLang: localePrefix, dir: "ltr", flag: "", isDefault: false }]);
    return resolveTranslation(field, code, ctx);
  }, [field, localePrefix, ctx]);
}

export type LocalizedContentProps = {
  field: string;
  localePrefix: string;
  ctx: TranslationContext;
  fallback?: string;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
};

export function LocalizedContent({
  field,
  localePrefix,
  ctx,
  fallback,
  as: Tag = "span",
  className,
}: LocalizedContentProps) {
  const value = useLocalizedContent(field, localePrefix, ctx);
  const display = value || fallback || "";
  return <Tag className={className}>{display}</Tag>;
}
