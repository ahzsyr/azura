import { revalidatePath } from "next/cache";
import { CMS_WIRED_MARKETING_SLUGS } from "@/features/builder/constants";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";

const FALLBACK_PREFIXES = FALLBACK_LOCALES.map((locale) => locale.urlPrefix);

/** Revalidate public marketing URLs for a CMS slug after publish/unpublish. */
export function revalidateWiredMarketingPaths(slug: string, locales: string[] = [...FALLBACK_PREFIXES]) {
  const path = CMS_WIRED_MARKETING_SLUGS[slug];
  if (!path) return;

  for (const locale of locales) {
    if (path === "/") {
      revalidatePath(`/${locale}`);
    } else {
      revalidatePath(`/${locale}${path}`);
    }
  }

  if (slug === "home") {
    revalidatePath("/");
  }
}

/**
 * Revalidate all public URLs that render a CMS page slug (wired + /pages/[slug] + clean /[slug]).
 * Call after publish, unpublish, or any published content save.
 */
export function revalidateCmsPagePublicPaths(
  slug: string,
  locales: string[] = [...FALLBACK_PREFIXES],
) {
  revalidateWiredMarketingPaths(slug, locales);

  if (CMS_WIRED_MARKETING_SLUGS[slug]) return;

  for (const locale of locales) {
    revalidatePath(`/${locale}/pages/${slug}`);
    revalidatePath(`/${locale}/${slug}`);
  }
}

/** Revalidate every wired marketing route (e.g. after setup or demo import). */
export async function revalidateAllWiredMarketingPaths(): Promise<string[]> {
  const { localeService } = await import("@/features/i18n/locale.service");
  const locales = await localeService.getEnabledUrlPrefixes();
  const prefixes = locales.length > 0 ? locales : [...FALLBACK_PREFIXES];
  for (const slug of Object.keys(CMS_WIRED_MARKETING_SLUGS)) {
    revalidateWiredMarketingPaths(slug, prefixes);
  }
  return prefixes;
}
