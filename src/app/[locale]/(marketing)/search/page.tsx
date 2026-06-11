import { Suspense } from "react";
import { RouteSuspenseFallback } from "@/components/layout/route-suspense-fallback";
import { notFound } from "next/navigation";
import { ensureSearchRuntimeConfig } from "@/features/search/settings/search-runtime";
import { toPublicSearchConfig } from "@/features/search/settings/public-search-config";
import { SearchPageView } from "@/features/search/components/search-page-view";

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

  const config = toPublicSearchConfig(admin);

  return (
    <Suspense fallback={<RouteSuspenseFallback variant="search" />}>
      <SearchPageView config={config} />
    </Suspense>
  );
}
