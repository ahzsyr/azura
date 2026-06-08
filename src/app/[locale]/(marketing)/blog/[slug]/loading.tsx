import { getLocale } from "next-intl/server";
import { PageLoadingSkeleton } from "@/components/layout/page-loading-skeleton";
import { readSiteSettings } from "@/features/catalog/site-settings.service";
import { resolveSitePreloader } from "@/features/preloader/resolve-site-preloader";
import { preloaderShowsOnNavigation } from "@/features/preloader/site-preloader.schema";

export default async function BlogPostLoading() {
  const locale = await getLocale();
  const siteSettings = await readSiteSettings(locale);
  const preloader = resolveSitePreloader(siteSettings);

  if (preloader.enabled && preloaderShowsOnNavigation(preloader.mode)) {
    return null;
  }

  return <PageLoadingSkeleton variant="detail" />;
}
