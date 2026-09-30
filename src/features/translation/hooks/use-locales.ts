"use client";

import { useEffect, useMemo, useState } from "react";
import type { PublicLocale } from "@/i18n/locale-config";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";

type LocalesResponse = {
  items: PublicLocale[];
  defaultLocale: string;
};

export function useLocales() {
  const [locales, setLocales] = useState<PublicLocale[]>(FALLBACK_LOCALES);
  const [defaultCode, setDefaultCode] = useState("en");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/locales")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: LocalesResponse | null) => {
        if (cancelled || !data?.items?.length) return;
        setLocales(data.items);
        const def = data.items.find((l) => l.isDefault)?.code ?? "en";
        setDefaultCode(def);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load locales");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const enabledLocales = locales;
  const targetLocales = useMemo(
    () => enabledLocales.filter((l) => l.code !== defaultCode),
    [enabledLocales, defaultCode]
  );

  return { locales: enabledLocales, targetLocales, defaultCode, loading, error };
}
