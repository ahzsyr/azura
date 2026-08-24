"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AdminLocale } from "@/i18n/locale-config";
import { DEFAULT_ADMIN_LOCALE } from "@/i18n/locale-config";
import { useAdminEditingLocaleStore } from "@/stores/admin-editing-locale-store";

type AdminEditingLocaleContextValue = {
  locales: AdminLocale[];
  activeLocale: AdminLocale;
  activeLocaleCode: string;
  defaultCode: string;
  setActiveLocaleCode: (code: string) => void;
  loading: boolean;
};

const AdminEditingLocaleContext = createContext<AdminEditingLocaleContextValue | null>(null);

export function AdminEditingLocaleProvider({ children }: { children: ReactNode }) {
  const activeLocaleCode = useAdminEditingLocaleStore((s) => s.activeLocaleCode);
  const setActiveLocaleCode = useAdminEditingLocaleStore((s) => s.setActiveLocaleCode);
  const [locales, setLocales] = useState<AdminLocale[]>([DEFAULT_ADMIN_LOCALE]);
  const [defaultCode, setDefaultCode] = useState("en");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void useAdminEditingLocaleStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/locales")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { items?: AdminLocale[]; defaultCode?: string } | null) => {
        if (cancelled || !data?.items?.length) return;
        setLocales(data.items);
        setDefaultCode(data.defaultCode ?? data.items.find((l) => l.isDefault)?.code ?? "en");
        const codes = new Set(data.items.map((l) => l.code));
        if (!codes.has(activeLocaleCode)) {
          const fallback = data.items.find((l) => l.isDefault)?.code ?? data.items[0].code;
          setActiveLocaleCode(fallback);
        }
      })
      .catch(() => {
        /* keep defaults */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeLocaleCode, setActiveLocaleCode]);

  const activeLocale = useMemo(() => {
    return locales.find((l) => l.code === activeLocaleCode) ?? locales[0] ?? DEFAULT_ADMIN_LOCALE;
  }, [locales, activeLocaleCode]);

  const setActiveLocale = useCallback(
    (code: string) => {
      if (locales.some((l) => l.code === code)) setActiveLocaleCode(code);
    },
    [locales, setActiveLocaleCode]
  );

  const value = useMemo(
    () => ({
      locales,
      activeLocale,
      activeLocaleCode: activeLocale.code,
      defaultCode,
      setActiveLocaleCode: setActiveLocale,
      loading,
    }),
    [locales, activeLocale, defaultCode, setActiveLocale, loading]
  );

  return (
    <AdminEditingLocaleContext.Provider value={value}>{children}</AdminEditingLocaleContext.Provider>
  );
}

export function useAdminEditingLocaleContext() {
  const ctx = useContext(AdminEditingLocaleContext);
  if (!ctx) {
    throw new Error("useAdminEditingLocaleContext must be used within AdminEditingLocaleProvider");
  }
  return ctx;
}

export function useAdminEditingLocaleContextOptional() {
  return useContext(AdminEditingLocaleContext);
}
