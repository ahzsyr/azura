import { getLocale } from "next-intl/server";
import { readSiteSettings } from "@/features/catalog/site-settings.service";
import { resolveSitePreloader } from "@/features/preloader/resolve-site-preloader";
import { preloaderShowsOnNavigation } from "@/features/preloader/site-preloader.schema";

export default async function MarketingLoading() {
  const locale = await getLocale();
  const siteSettings = await readSiteSettings(locale);
  const preloader = resolveSitePreloader(siteSettings);

  if (preloader.enabled && preloaderShowsOnNavigation(preloader.mode)) {
    return null;
  }

  return (
    <div className="cl-page min-h-[50vh] py-8" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-48 animate-pulse rounded bg-muted mb-6" />
      <div className="h-4 w-full max-w-xl animate-pulse rounded bg-muted mb-8" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card-premium overflow-hidden">
            <div className="aspect-[4/3] animate-pulse bg-muted" />
            <div className="p-4 space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
