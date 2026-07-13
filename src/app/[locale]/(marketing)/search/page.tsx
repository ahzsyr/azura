import { Suspense } from "react";
import { RouteSuspenseFallback } from "@/components/layout/route-suspense-fallback";
import { notFound } from "next/navigation";
import { ensureSearchRuntimeConfig } from "@/capabilities/search/settings/search-runtime";
import { toPublicSearchConfig } from "@/capabilities/search/settings/public-search-config";
import { SearchPageView } from "@/capabilities/search/components/search-page-view";
import { readSiteSettings } from "@/features/catalog/site-settings.service";
import { resolveSiteDefaultProductSearchCardDisplay } from "@/features/products/lib/product-search-display";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata() {
  return { title: "Search" };
}

export default async function SearchPage({ params }: Props) {
  const { locale } = await params;
  const admin = await ensureSearchRuntimeConfig(locale);
  if (!admin.general.enabled || !admin.general.searchPageEnabled) {
    notFound();
  }

  const config = {
    ...toPublicSearchConfig(admin),
    productSearchCardDisplay: resolveSiteDefaultProductSearchCardDisplay(
      await readSiteSettings(locale),
    ),
  };

  return (
    <Suspense fallback={<RouteSuspenseFallback variant="search" />}>
      <SearchPageView config={config} />
    </Suspense>
  );
}
