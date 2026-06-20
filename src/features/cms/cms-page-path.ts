import { CMS_WIRED_MARKETING_SLUGS } from "@/features/cms/cms-wired-slugs";

/** Public marketing path for a CMS slug (wired routes use clean URLs). */
export function getCmsPagePublicPath(slug: string): string {
  return CMS_WIRED_MARKETING_SLUGS[slug] ?? `/pages/${slug}`;
}

/** Redirect target for legacy /pages/[slug] URLs, or null when slug stays under /pages. */
export function getWiredCmsPageRedirect(pathname: string, locales: string[]): string | null {
  for (const locale of locales) {
    const prefix = `/${locale}/pages/`;
    if (!pathname.startsWith(prefix)) continue;
    const rest = pathname.slice(prefix.length);
    const slug = rest.split("/")[0];
    if (!slug || rest.includes("/")) continue;
    const wired = CMS_WIRED_MARKETING_SLUGS[slug];
    if (!wired) continue;
    return wired === "/" ? `/${locale}` : `/${locale}${wired}`;
  }
  return null;
}
