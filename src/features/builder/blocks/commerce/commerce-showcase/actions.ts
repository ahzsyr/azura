"use server";

import { requireAdmin } from "@/features/auth/guards";
import { readCatalogBrandProfiles } from "@/features/catalog/admin/catalog-taxonomy";
import { localeService } from "@/features/i18n/locale.service";
import type { BrandBuilderOption } from "@/features/builder/blocks/commerce/commerce-showcase/types";

async function defaultLocalePrefix(): Promise<string> {
  const locales = await localeService.listEnabled();
  return locales.find((l) => l.isDefault)?.urlPrefix ?? "en";
}

export async function fetchBrandsForBuilder(): Promise<BrandBuilderOption[]> {
  await requireAdmin();
  try {
    const localePrefix = await defaultLocalePrefix();
    const profiles = await readCatalogBrandProfiles(localePrefix);
    return profiles.map((p) => ({
      slug: p.slug,
      label: p.name?.trim() || p.slug,
      logoUrl: p.logoUrl || undefined,
      featured: p.featured,
    }));
  } catch {
    return [];
  }
}
