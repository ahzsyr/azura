import type { LocaleConfig } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_ADMIN_LOCALE,
  FALLBACK_LOCALES,
  filterActivePublicLocales,
  type AdminLocale,
  type PublicLocale as ConfigPublicLocale,
} from "@/i18n/locale-config";
import { routing } from "@/i18n/routing";
import { createCached, CACHE_TAGS } from "@/services/cache";

export type PublicLocale = ConfigPublicLocale;

const loadEnabledCached = createCached(
  async () => {
    try {
      const rows = await prisma.localeConfig.findMany({
        where: { isEnabled: true },
        orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      });
      return rows.length > 0 ? rows : null;
    } catch {
      return null;
    }
  },
  ["locale-config-enabled"],
  { tags: [CACHE_TAGS.locales], revalidate: 300 }
);

async function enabledRows(): Promise<LocaleConfig[] | PublicLocale[]> {
  const rows = await loadEnabledCached();
  return rows ?? FALLBACK_LOCALES;
}

export const localeService = {
  async listAll(): Promise<LocaleConfig[]> {
    try {
      return await prisma.localeConfig.findMany({
        orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      });
    } catch {
      return [];
    }
  },

  async listEnabled(): Promise<PublicLocale[]> {
    const rows = enabledRows();
    const resolved = (await rows).map((row) => this.toPublicLocale(row));
    const active = filterActivePublicLocales(resolved);
    return active.length > 0 ? active : FALLBACK_LOCALES;
  },

  async listForAdmin(): Promise<AdminLocale[]> {
    try {
      const rows = await prisma.localeConfig.findMany({
        where: { isEnabled: true },
        orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      });
      if (rows.length > 0) return rows.map((row) => this.toAdminLocale(row));
    } catch {
      /* fall through */
    }
    return [DEFAULT_ADMIN_LOCALE];
  },

  toPublicLocale(row: LocaleConfig | PublicLocale): PublicLocale {
    return {
      code: row.code,
      urlPrefix: row.urlPrefix,
      label: row.label,
      htmlLang: row.htmlLang,
      dir: row.dir as "ltr" | "rtl",
      flag: row.flag,
      isDefault: row.isDefault,
    };
  },

  toAdminLocale(row: LocaleConfig): AdminLocale {
    return {
      ...this.toPublicLocale(row),
      currency: row.currency,
      numberLocale: row.numberLocale,
      dateLocale: row.dateLocale,
    };
  },

  async getEnabledUrlPrefixes(): Promise<string[]> {
    const locales = await this.listEnabled();
    return locales.map((l) => l.urlPrefix);
  },

  async getDefaultUrlPrefix(): Promise<string> {
    const locales = await this.listEnabled();
    const def = locales.find((l) => l.isDefault);
    return def?.urlPrefix ?? routing.defaultLocale;
  },

  async isValidLocale(urlPrefix: string): Promise<boolean> {
    const prefixes = await this.getEnabledUrlPrefixes();
    return prefixes.includes(urlPrefix);
  },

  async getRoutingConfig(): Promise<{ locales: string[]; defaultLocale: string }> {
    const enabled = await this.listEnabled();
    const prefixes = enabled.map((l) => l.urlPrefix);
    const defaultLocale =
      enabled.find((l) => l.isDefault)?.urlPrefix ??
      prefixes[0] ??
      routing.defaultLocale;
    return {
      locales: prefixes.length > 0 ? prefixes : [...routing.locales],
      defaultLocale,
    };
  },

  getDirection(locale: string): "ltr" | "rtl" {
    const match = FALLBACK_LOCALES.find((l) => l.urlPrefix === locale || l.code === locale);
    if (match) return match.dir === "rtl" ? "rtl" : "ltr";
    return locale === "ar" || locale.startsWith("ar") ? "rtl" : "ltr";
  },
};
