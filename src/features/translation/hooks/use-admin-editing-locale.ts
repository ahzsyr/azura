"use client";

import { useAdminEditingLocaleContextOptional } from "@/components/admin/admin-editing-locale-provider";
import { DEFAULT_ADMIN_LOCALE } from "@/i18n/locale-config";
import { useAdminEditingLocaleStore } from "@/stores/admin-editing-locale-store";

export function useAdminEditingLocale() {
  const ctx = useAdminEditingLocaleContextOptional();
  const storeCode = useAdminEditingLocaleStore((s) => s.activeLocaleCode);
  const setStoreCode = useAdminEditingLocaleStore((s) => s.setActiveLocaleCode);

  if (ctx) {
    return {
      locales: ctx.locales,
      activeLocale: ctx.activeLocale,
      activeLocaleCode: ctx.activeLocaleCode,
      defaultCode: ctx.defaultCode,
      setActiveLocaleCode: ctx.setActiveLocaleCode,
      isRtl: ctx.activeLocale.dir === "rtl",
      currency: ctx.activeLocale.currency,
      numberLocale: ctx.activeLocale.numberLocale,
      dateLocale: ctx.activeLocale.dateLocale,
      loading: ctx.loading,
    };
  }

  return {
    locales: [DEFAULT_ADMIN_LOCALE],
    activeLocale: DEFAULT_ADMIN_LOCALE,
    activeLocaleCode: storeCode,
    defaultCode: "en",
    setActiveLocaleCode: setStoreCode,
    isRtl: DEFAULT_ADMIN_LOCALE.dir === "rtl",
    currency: DEFAULT_ADMIN_LOCALE.currency,
    numberLocale: DEFAULT_ADMIN_LOCALE.numberLocale,
    dateLocale: DEFAULT_ADMIN_LOCALE.dateLocale,
    loading: true,
  };
}
