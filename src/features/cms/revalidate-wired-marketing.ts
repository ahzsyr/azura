import { revalidatePath } from "next/cache";
import { CMS_WIRED_MARKETING_SLUGS } from "@/features/builder/constants";
import { routing } from "@/i18n/routing";

/** Revalidate public marketing URLs for a CMS slug after publish/unpublish. */
export function revalidateWiredMarketingPaths(slug: string, locales: string[] = [...routing.locales]) {
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

/** Revalidate every wired marketing route (e.g. after setup or demo import). */
export async function revalidateAllWiredMarketingPaths(): Promise<string[]> {
  const { localeService } = await import("@/features/i18n/locale.service");
  const locales = await localeService.getEnabledUrlPrefixes();
  const prefixes = locales.length > 0 ? locales : [...routing.locales];
  for (const slug of Object.keys(CMS_WIRED_MARKETING_SLUGS)) {
    revalidateWiredMarketingPaths(slug, prefixes);
  }
  return prefixes;
}
